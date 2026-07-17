"use client";

import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { clientApi, ClientApiError } from "@/lib/client-api";
import { buildResidentGroups } from "@/lib/types";
import type {
  AdminAccountItem,
  AdminAccountsResponse,
  AdminResidentInfo,
} from "@/lib/types";
import { TableActionsMenu } from "./table-actions-menu";

function isoToDmy(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}
function dmyToIso(dmy: string): string {
  const parts = dmy.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

// Khớp đúng cột trong file mẫu sẵn có của thôn (mục "Nhập từ Excel") — so
// khớp không phân biệt hoa/thường + khoảng trắng thừa, để dùng được ngay
// file thật đang có mà không cần chỉnh sửa lại tiêu đề cột.
const EXCEL_HEADER_MAP: Record<string, keyof RawImportRow> = {
  "HỌ VÀ TÊN": "name",
  "NGÀY SINH": "dob",
  "GIỚI TÍNH": "gender",
  "SỐ CĂN CƯỚC": "cccd",
  "HỌ VÀ TÊN (CHỦ HỘ)": "headRef",
  "SỐ HỘ TỊCH": "groupKey",
  "THƯỜNG TRÚ": "permanentAddress",
  "HỌ VÀ TÊN (CHA)": "fatherName",
  "HỌ VÀ TÊN MẸ": "motherName",
  "SỐ ĐIỆN THOẠI": "phone",
};
const REQUIRED_IMPORT_FIELDS: (keyof RawImportRow)[] = [
  "name",
  "dob",
  "gender",
  "cccd",
  "groupKey",
];

type RawImportRow = {
  name: string;
  dob: string;
  gender: string;
  cccd: string;
  headRef: string;
  groupKey: string;
  permanentAddress: string;
  fatherName: string;
  motherName: string;
  phone: string;
};

type ImportRow = {
  name: string;
  dob: string;
  gender: string;
  cccd: string;
  isHouseholder: boolean;
  headRef: string;
  groupKey: string;
  permanentAddress: string;
  fatherName: string;
  motherName: string;
  phone: string;
  error?: string;
};

const DOB_RE = /^\d{2}\/\d{2}\/\d{4}$/;
const IMPORT_CCCD_RE = /^\d{12}$/;
const IMPORT_PHONE_RE = /^\d{10}$/;

function validateImportRow(row: ImportRow): string | null {
  if (!row.name.trim()) return "Thiếu Họ và tên.";
  if (!DOB_RE.test(row.dob.trim()))
    return "Ngày sinh phải đúng định dạng dd/mm/yyyy.";
  if (row.cccd.trim() && !IMPORT_CCCD_RE.test(row.cccd.trim()))
    return "Số Căn Cước phải gồm đúng 12 chữ số.";
  if (row.phone.trim() && !IMPORT_PHONE_RE.test(row.phone.trim()))
    return "Số điện thoại phải gồm đúng 10 chữ số.";
  if (!row.groupKey.trim()) return "Thiếu Số Hộ Tịch để xác định thuộc hộ nào.";
  return null;
}

function downloadImportTemplate() {
  const headers = Object.keys(EXCEL_HEADER_MAP);
  const sample = [
    [
      "Nguyễn Văn A",
      "01/01/1980",
      "Nam",
      "041080012345",
      "",
      "HT-001",
      "Thôn Đoàn Kết, Xã Dliê Ya, Huyện Krông Năng",
      "",
      "",
      "0912345678",
    ],
    [
      "Nguyễn Thị B",
      "05/05/1985",
      "Nữ",
      "",
      "Nguyễn Văn A",
      "HT-001",
      "Thôn Đoàn Kết, Xã Dliê Ya, Huyện Krông Năng",
      "",
      "",
      "",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cư dân");
  XLSX.writeFile(wb, "mau-nhap-cu-dan.xlsx");
}

// Xuất lại các dòng chưa nhập được (lỗi client hoặc bị BE từ chối) ra đúng
// định dạng file mẫu kèm cột "Lỗi" — để chỉnh sửa rồi chọn lại file này.
function downloadFailedRowsFile(rows: ImportRow[]) {
  const headers = [...Object.keys(EXCEL_HEADER_MAP), "Lỗi"];
  const data = rows.map((r) => [
    r.name,
    r.dob,
    r.gender === "male" ? "Nam" : r.gender === "female" ? "Nữ" : "",
    r.cccd,
    r.headRef,
    r.groupKey,
    r.permanentAddress,
    r.fatherName,
    r.motherName,
    r.phone,
    r.error || "",
  ]);
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Cần sửa lại");
  XLSX.writeFile(wb, "cu-dan-loi.xlsx");
}

// Chia thành các batch để gọi API lần lượt (tránh 1 request quá lớn +
// hiển thị tiến trình) — không tách rời các dòng cùng 1 hộ (Số Hộ Tịch)
// ra 2 batch khác nhau, vì mỗi lần gọi API chỉ nhận diện được chủ hộ
// trong phạm vi các dòng gửi lên cùng lúc.
function chunkRowsByGroup<T extends { r: ImportRow; i: number }>(items: T[], batchSize: number): T[][] {
  const groups = new Map<string, T[]>();
  items.forEach((item, idx) => {
    const key = item.r.groupKey || `__no_group_${idx}`;
    const list = groups.get(key) || [];
    list.push(item);
    groups.set(key, list);
  });
  const batches: T[][] = [];
  let current: T[] = [];
  for (const group of groups.values()) {
    if (current.length > 0 && current.length + group.length > batchSize) {
      batches.push(current);
      current = [];
    }
    current.push(...group);
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

function normalizeHeader(h: string): string {
  return String(h ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function parseExcelFile(file: File): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const table = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          raw: false,
          defval: "",
        });
        resolve(table);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// Trả về danh sách field bắt buộc còn thiếu trong file (nếu có) — dùng để
// báo lỗi rõ ràng thay vì âm thầm bỏ qua cột không khớp tên.
function buildColumnIndex(headerRow: unknown[]): {
  index: Partial<Record<keyof RawImportRow, number>>;
  missing: string[];
} {
  const index: Partial<Record<keyof RawImportRow, number>> = {};
  headerRow.forEach((h, i) => {
    const field = EXCEL_HEADER_MAP[normalizeHeader(String(h ?? ""))];
    if (field) index[field] = i;
  });
  const missing = REQUIRED_IMPORT_FIELDS.filter(
    (f) => index[f] === undefined,
  ).map(
    (f) =>
      Object.keys(EXCEL_HEADER_MAP).find((k) => EXCEL_HEADER_MAP[k] === f) || f,
  );
  return { index, missing };
}

function mapRawImportRow(
  cells: unknown[],
  index: Partial<Record<keyof RawImportRow, number>>,
): ImportRow {
  const get = (key: keyof RawImportRow) => {
    const i = index[key];
    return i === undefined ? "" : String(cells[i] ?? "").trim();
  };
  const genderRaw = get("gender").toLowerCase();
  const gender =
    genderRaw === "nam"
      ? "male"
      : genderRaw === "nữ" || genderRaw === "nu"
        ? "female"
        : "unknown";
  // Chủ hộ = cột "Họ và tên (chủ hộ)" để trống, HOẶC trùng với chính "Họ và
  // tên" của dòng đó (khớp file mẫu thật của thôn — chủ hộ tự ghi tên mình
  // vào cột đó thay vì để trống). Không dùng để nhóm hộ (nhóm hộ dùng Số Hộ
  // Tịch) vì họ tên có thể trùng nhau giữa các hộ khác nhau.
  const nameNorm = normalizeHeader(get("name"));
  const headRefNorm = normalizeHeader(get("headRef"));
  const isHouseholder = !headRefNorm || headRefNorm === nameNorm;
  const row: ImportRow = {
    name: get("name"),
    dob: get("dob"),
    gender,
    cccd: get("cccd").replace(/\D/g, ""),
    isHouseholder,
    headRef: get("headRef"),
    groupKey: get("groupKey"),
    permanentAddress: get("permanentAddress"),
    fatherName: get("fatherName"),
    motherName: get("motherName"),
    phone: get("phone").replace(/\D/g, ""),
  };
  return { ...row, error: validateImportRow(row) || undefined };
}

const ROLE_LABELS: Record<string, string> = {
  resident: "Cư dân",
  "association-officer": "Cán bộ Hội",
  "village-head": "Trưởng thôn",
  "security-team": "Tổ ANTT",
  admin: "Admin",
};
const ROLES = Object.keys(ROLE_LABELS);

export function AdminAccountsTab({
  accountsRes,
  oldVillages,
  onAccountsChange,
}: {
  accountsRes: AdminAccountsResponse;
  oldVillages: string[] | undefined;
  onAccountsChange: (a: AdminAccountsResponse) => void;
}) {
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [editing, setEditing] = useState<AdminAccountItem | null>(null);
  const [editingResident, setEditingResident] =
    useState<AdminAccountItem | null>(null);
  const [deletingResident, setDeletingResident] =
    useState<AdminAccountItem | null>(null);
  const [addingResident, setAddingResident] = useState(false);
  const [importingExcel, setImportingExcel] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortByHousehold, setSortByHousehold] = useState(false);

  function showNotice(type: "success" | "error" | "info", text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<AdminAccountsResponse>("admin/accounts");
    onAccountsChange(res);
  }

  async function resetPassword(acc: AdminAccountItem) {
    setBusyId(acc._id);
    try {
      await clientApi(`admin/accounts/${acc._id}/reset-password`, {
        method: "POST",
      });
      showNotice(
        "success",
        `Mật khẩu của ${acc.name} đã được reset thành mặc định ('doanket').`,
      );
    } catch (err) {
      showNotice(
        "error",
        err instanceof ClientApiError
          ? err.message
          : "Không thể reset mật khẩu.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function toggleLock(acc: AdminAccountItem) {
    setBusyId(acc._id);
    try {
      await clientApi(
        `admin/accounts/${acc._id}/${acc.status === "active" ? "lock" : "unlock"}`,
        { method: "POST" },
      );
      await refresh();
      showNotice(
        "info",
        `Tài khoản ${acc.name} hiện đã chuyển sang trạng thái: ${acc.status === "active" ? "Đã khóa" : "Hoạt động"}.`,
      );
    } catch (err) {
      showNotice(
        "error",
        err instanceof ClientApiError
          ? err.message
          : "Không thể đổi trạng thái.",
      );
    } finally {
      setBusyId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const filteredAccounts = accountsRes.accounts.filter((acc) =>
    !q
      ? true
      : [acc.name, acc.username, acc.position, acc.familyId].some((f) =>
          (f || "").toLowerCase().includes(q),
        ),
  );
  const visibleAccounts = sortByHousehold
    ? [...filteredAccounts].sort((a, b) =>
        (a.familyId || "").localeCompare(b.familyId || "") || a.name.localeCompare(b.name),
      )
    : filteredAccounts;

  return (
    <>
      {notice && (
        <div
          className={`mb-4 rounded-xl border p-4 text-xs ${
            notice.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : notice.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-blue-200 bg-blue-50 text-blue-700"
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="flex flex-col gap-4 text-left sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h4 className="font-serif text-lg font-bold text-stone-900">
            Quản lý tài khoản, Cấp quyền &amp; Đổi mật khẩu
          </h4>
          <p className="text-xs text-stone-500">
            Tài khoản đăng nhập được tự động cấp theo Căn Cước khi nhân khẩu
            được duyệt thêm — mỗi cư dân có đúng một tài khoản.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setAddingResident(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-emerald-500"
          >
            <i className="fa-solid fa-user-plus" /> Thêm cư dân mới
          </button>
          <button
            onClick={() => setImportingExcel(true)}
            className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-amber-500"
          >
            <i className="fa-solid fa-file-excel" /> Nhập từ Excel
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs text-stone-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, tên đăng nhập, chức vụ, mã hộ..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 pr-3 pl-9 text-xs text-stone-800 outline-none focus:border-primary-500"
          />
        </div>
        <button
          onClick={() => setSortByHousehold((v) => !v)}
          className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
            sortByHousehold
              ? "border-primary-600 bg-primary-600 text-white"
              : "border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100"
          }`}
        >
          <i className="fa-solid fa-arrow-down-a-z" /> Sắp xếp theo hộ
        </button>
      </div>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-225 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-40 whitespace-nowrap p-3 font-semibold">
                  Tên tài khoản
                </th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">
                  Tên đăng nhập
                </th>
                <th className="min-w-40 whitespace-nowrap p-3 font-semibold">
                  Phân quyền
                </th>
                <th className="min-w-25 whitespace-nowrap p-3 font-semibold">
                  Mã hộ
                </th>
                <th className="min-w-35 whitespace-nowrap p-3 font-semibold">
                  Chức vụ
                </th>
                <th className="min-w-30 whitespace-nowrap p-3 font-semibold">
                  Hoạt động cuối
                </th>
                <th className="min-w-25 whitespace-nowrap p-3 font-semibold">
                  Trạng thái
                </th>
                <th className="min-w-30 whitespace-nowrap p-3 text-right font-semibold">
                  Quản trị
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {visibleAccounts.map((acc) => (
                <tr
                  key={acc._id}
                  className="transition-colors hover:bg-stone-50"
                >
                  <td className="whitespace-nowrap p-3">
                    <span className="block font-bold text-stone-900">
                      {acc.name}
                    </span>
                    <span className="font-mono text-[10px] text-stone-400">
                      ID: {acc._id.slice(-6)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap p-3 font-mono text-stone-600">
                    {acc.username}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    <span className="block font-semibold text-stone-900">
                      {ROLE_LABELS[acc.role] || acc.role}
                    </span>
                    {acc.role === "association-officer" && acc.assoc && (
                      <span className="block text-[10px] text-stone-400">
                        Phụ trách: {acc.assoc}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 font-mono text-stone-600">
                    {acc.familyId || <span className="text-stone-300">—</span>}
                  </td>
                  <td className="whitespace-nowrap p-3 text-stone-600">
                    {acc.position || <span className="text-stone-300">—</span>}
                  </td>
                  <td className="whitespace-nowrap p-3 font-mono text-[10px] text-stone-500">
                    {acc.lastActive}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {acc.status === "active" ? (
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        Đang mở
                      </span>
                    ) : (
                      <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">
                        Đã khóa
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <div className="hidden items-center justify-end gap-2 sm:flex">
                      <button
                        onClick={() => setEditing(acc)}
                        className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100"
                      >
                        <i className="fa-solid fa-pen-to-square mr-1" /> Sửa
                      </button>
                      <button
                        disabled={busyId === acc._id}
                        onClick={() => resetPassword(acc)}
                        className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                      >
                        Reset Pass
                      </button>
                      {acc.residentId && (
                        <>
                          <button
                            onClick={() => setEditingResident(acc)}
                            className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100"
                          >
                            <i className="fa-solid fa-id-card mr-1" /> Sửa cư
                            dân
                          </button>
                          <button
                            onClick={() => setDeletingResident(acc)}
                            className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            Xóa cư dân
                          </button>
                        </>
                      )}
                      {acc.role !== "admin" &&
                        (acc.status === "active" ? (
                          <button
                            disabled={busyId === acc._id}
                            onClick={() => toggleLock(acc)}
                            className="rounded border border-stone-200 bg-stone-50 px-2 py-1 text-[10px] text-stone-600 hover:bg-stone-100 disabled:opacity-50"
                          >
                            Khóa tài khoản
                          </button>
                        ) : (
                          <button
                            disabled={busyId === acc._id}
                            onClick={() => toggleLock(acc)}
                            className="rounded bg-emerald-50 px-2 py-1 text-[10px] text-emerald-600 disabled:opacity-50"
                          >
                            Mở tài khoản
                          </button>
                        ))}
                    </div>
                    <TableActionsMenu
                      actions={[
                        {
                          label: "Sửa",
                          icon: "fa-pen-to-square",
                          onClick: () => setEditing(acc),
                        },
                        {
                          label: "Reset Pass",
                          icon: "fa-key",
                          onClick: () => resetPassword(acc),
                          disabled: busyId === acc._id,
                        },
                        ...(acc.residentId
                          ? [
                              {
                                label: "Sửa cư dân",
                                icon: "fa-id-card",
                                onClick: () => setEditingResident(acc),
                              },
                              {
                                label: "Xóa cư dân",
                                icon: "fa-trash",
                                onClick: () => setDeletingResident(acc),
                                danger: true,
                              },
                            ]
                          : []),
                        ...(acc.role !== "admin"
                          ? [
                              acc.status === "active"
                                ? {
                                    label: "Khóa tài khoản",
                                    icon: "fa-lock",
                                    onClick: () => toggleLock(acc),
                                    danger: true,
                                    disabled: busyId === acc._id,
                                  }
                                : {
                                    label: "Mở tài khoản",
                                    icon: "fa-lock-open",
                                    onClick: () => toggleLock(acc),
                                    disabled: busyId === acc._id,
                                  },
                            ]
                          : []),
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {visibleAccounts.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-stone-400">
                    Không tìm thấy tài khoản phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditAccountModal
          account={editing}
          onClose={() => setEditing(null)}
          onSuccess={async (msg) => {
            setEditing(null);
            await refresh();
            showNotice("success", msg);
          }}
        />
      )}

      {addingResident && (
        <AddResidentModal
          groups={buildResidentGroups(oldVillages)}
          onClose={() => setAddingResident(false)}
          onSuccess={async (msg) => {
            setAddingResident(false);
            await refresh();
            showNotice("success", msg);
          }}
        />
      )}

      {importingExcel && (
        <ImportResidentsModal
          onClose={() => setImportingExcel(false)}
          onSuccess={async (msg) => {
            setImportingExcel(false);
            await refresh();
            showNotice("success", msg);
          }}
        />
      )}

      {editingResident && editingResident.residentId && (
        <EditResidentInfoModal
          residentId={editingResident.residentId}
          groups={buildResidentGroups(oldVillages)}
          onClose={() => setEditingResident(null)}
          onSuccess={async (msg) => {
            setEditingResident(null);
            await refresh();
            showNotice("success", msg);
          }}
        />
      )}

      {deletingResident && deletingResident.residentId && (
        <DeleteResidentModal
          account={deletingResident}
          residentId={deletingResident.residentId}
          onClose={() => setDeletingResident(null)}
          onSuccess={async (msg) => {
            setDeletingResident(null);
            await refresh();
            showNotice("success", msg);
          }}
        />
      )}
    </>
  );
}

function AddResidentModal({
  groups,
  onClose,
  onSuccess,
}: {
  groups: string[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: "",
    dobIso: "",
    gender: "unknown",
    cccd: "",
    phone: "",
    relation: "",
    isHouseholder: false,
    familyId: "",
    permanentAddress: "",
    temporaryAddress: "",
    group: groups[0],
    fatherName: "",
    motherName: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (
      !form.name.trim() ||
      !form.dobIso ||
      (!form.isHouseholder && !form.relation.trim())
    ) {
      setError("Vui lòng nhập đầy đủ Họ tên, Ngày sinh và Quan hệ với chủ hộ.");
      return;
    }
    if (!form.isHouseholder && !form.familyId.trim()) {
      setError(
        "Vui lòng nhập Mã hộ đã tồn tại — chỉ chủ hộ mới được tự động tạo hộ mới.",
      );
      return;
    }
    setSubmitting(true);
    try {
      const res = await clientApi<{
        resident: { familyId: string };
        accountCreated: boolean;
      }>("admin/accounts/residents", {
        method: "POST",
        body: {
          name: form.name.trim(),
          dob: isoToDmy(form.dobIso),
          gender: form.gender,
          cccd: form.cccd.trim(),
          phone: form.phone.trim(),
          relation: form.relation.trim(),
          isHouseholder: form.isHouseholder,
          familyId: form.isHouseholder ? undefined : form.familyId.trim(),
          permanentAddress: form.permanentAddress.trim(),
          temporaryAddress: form.temporaryAddress.trim(),
          group: form.group,
          fatherName: form.fatherName.trim(),
          motherName: form.motherName.trim(),
        },
      });
      onSuccess(
        `Đã thêm cư dân "${form.name.trim()}" vào hộ ${res.resident.familyId}.${
          res.accountCreated ? " Đã tự động cấp tài khoản đăng nhập." : ""
        }`,
      );
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Không thể thêm cư dân.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Thêm cư dân mới
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form
          onSubmit={submit}
          className="flex-1 space-y-3 overflow-y-auto p-6"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Họ và tên *
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Ngày sinh *
              </label>
              <input
                type="date"
                value={form.dobIso}
                onChange={(e) => setForm({ ...form, dobIso: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Quan hệ với chủ hộ{form.isHouseholder ? "" : " *"}
              </label>
              <input
                value={form.isHouseholder ? "Chủ hộ" : form.relation}
                disabled={form.isHouseholder}
                onChange={(e) => setForm({ ...form, relation: e.target.value })}
                placeholder="VD: Con, Vợ/Chồng..."
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500 disabled:text-stone-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Giới tính
              </label>
              <div className="flex h-[34px] items-center gap-4 text-xs text-stone-700">
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.gender === "male"}
                    onChange={() => setForm({ ...form, gender: "male" })}
                  />{" "}
                  Nam
                </label>
                <label className="flex items-center gap-1.5">
                  <input
                    type="radio"
                    checked={form.gender === "female"}
                    onChange={() => setForm({ ...form, gender: "female" })}
                  />{" "}
                  Nữ
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                <input
                  type="checkbox"
                  checked={form.isHouseholder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      isHouseholder: e.target.checked,
                      familyId: "",
                    })
                  }
                />
                Là chủ hộ (tự tạo hộ mới)
              </label>
              {form.isHouseholder ? (
                <p className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-3 py-2 text-[11px] text-stone-500">
                  Mã hộ sẽ được hệ thống tự động tạo mới.
                </p>
              ) : (
                <>
                  <input
                    value={form.familyId}
                    onChange={(e) =>
                      setForm({ ...form, familyId: e.target.value })
                    }
                    placeholder="VD: FAM-090 (mã hộ đã tồn tại)"
                    className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
                  />
                  <p className="text-[10px] text-stone-400">
                    Bắt buộc nhập đúng Mã hộ đã tồn tại — thành viên phải thuộc
                    1 hộ có sẵn.
                  </p>
                </>
              )}
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Nhóm cư trú
              </label>
              <select
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Căn Cước (CCCD) <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.cccd}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cccd: e.target.value.replace(/\D/g, "").slice(0, 12),
                  })
                }
                placeholder="Bắt buộc — 12 số"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
              <p className="text-[10px] text-stone-400">
                Bắt buộc — hệ thống tự cấp tài khoản đăng nhập theo CCCD (mật
                khẩu mặc định theo thôn).
              </p>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Số điện thoại
              </label>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Họ tên cha
              </label>
              <input
                value={form.fatherName}
                onChange={(e) =>
                  setForm({ ...form, fatherName: e.target.value })
                }
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Họ tên mẹ
              </label>
              <input
                value={form.motherName}
                onChange={(e) =>
                  setForm({ ...form, motherName: e.target.value })
                }
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Địa chỉ thường trú
            </label>
            <input
              value={form.permanentAddress}
              onChange={(e) =>
                setForm({ ...form, permanentAddress: e.target.value })
              }
              placeholder="VD: Thôn Đoàn Kết, xã Dliê Ya, tỉnh Đắk Lắk"
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Địa chỉ tạm trú
            </label>
            <input
              value={form.temporaryAddress}
              onChange={(e) =>
                setForm({ ...form, temporaryAddress: e.target.value })
              }
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
          </div>

          {error && (
            <p className="text-[11px] font-semibold text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            {submitting ? "Đang tạo..." : "Tạo cư dân mới"}
          </button>
        </form>
      </div>
    </div>
  );
}

function EditAccountModal({
  account,
  onClose,
  onSuccess,
}: {
  account: AdminAccountItem;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [role, setRole] = useState(account.role);
  const [position, setPosition] = useState(account.position || "");
  const [assoc, setAssoc] = useState(account.assoc || "");
  const [associations, setAssociations] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clientApi<string[]>("admin/accounts/associations").then(setAssociations);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (role === "association-officer" && !assoc) {
      setError("Vui lòng chọn hội mà tài khoản này sẽ phụ trách.");
      return;
    }
    setSubmitting(true);
    try {
      await clientApi(`admin/accounts/${account._id}`, {
        method: "PATCH",
        body: {
          role,
          position,
          assoc: role === "association-officer" ? assoc : undefined,
        },
      });
      onSuccess(`Đã cập nhật tài khoản ${account.name}.`);
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Không thể cập nhật.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Sửa tài khoản — {account.name}
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Vai trò (phân quyền)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={account.role === "admin"}
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500 disabled:opacity-50"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {role === "association-officer" && (
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Hội phụ trách
              </label>
              <select
                value={assoc}
                onChange={(e) => setAssoc(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              >
                <option value="">-- Chọn hội --</option>
                {associations.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Chức vụ (hiển thị công khai)
            </label>
            <input
              type="text"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="VD: Trưởng thôn, Bí thư chi bộ..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
          </div>
          {error && (
            <p className="text-[11px] font-semibold text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            Lưu thay đổi
          </button>
        </form>
      </div>
    </div>
  );
}

function EditResidentInfoModal({
  residentId,
  groups,
  onClose,
  onSuccess,
}: {
  residentId: string;
  groups: string[];
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    dobIso: "",
    gender: "unknown",
    cccd: "",
    phone: "",
    relation: "",
    isHouseholder: false,
    permanentAddress: "",
    temporaryAddress: "",
    group: groups[0],
    fatherName: "",
    motherName: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    clientApi<AdminResidentInfo>(`admin/accounts/residents/${residentId}`)
      .then((r) =>
        setForm({
          name: r.name,
          dobIso: dmyToIso(r.dob),
          gender: r.gender,
          cccd: r.cccd,
          phone: r.phone,
          relation: r.relation,
          isHouseholder: r.isHouseholder,
          permanentAddress: r.permanentAddress,
          temporaryAddress: r.temporaryAddress,
          group: r.group || groups[0],
          fatherName: r.fatherName,
          motherName: r.motherName,
        }),
      )
      .catch((err) =>
        setError(
          err instanceof ClientApiError
            ? err.message
            : "Không thể tải thông tin cư dân.",
        ),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (
      !form.name.trim() ||
      !form.dobIso ||
      (!form.isHouseholder && !form.relation.trim())
    ) {
      setError("Vui lòng nhập đầy đủ Họ tên, Ngày sinh và Quan hệ với chủ hộ.");
      return;
    }
    setSubmitting(true);
    try {
      await clientApi(`admin/accounts/residents/${residentId}`, {
        method: "PATCH",
        body: {
          name: form.name.trim(),
          dob: isoToDmy(form.dobIso),
          gender: form.gender,
          cccd: form.cccd.trim(),
          phone: form.phone.trim(),
          relation: form.relation.trim(),
          isHouseholder: form.isHouseholder,
          permanentAddress: form.permanentAddress.trim(),
          temporaryAddress: form.temporaryAddress.trim(),
          group: form.group,
          fatherName: form.fatherName.trim(),
          motherName: form.motherName.trim(),
        },
      });
      onSuccess(`Đã cập nhật thông tin cư dân "${form.name.trim()}".`);
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Không thể lưu thay đổi.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Sửa thông tin cư dân
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        {loading ? (
          <p className="p-6 text-xs text-stone-400">Đang tải...</p>
        ) : (
          <form
            onSubmit={submit}
            className="flex-1 space-y-3 overflow-y-auto p-6"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Họ và tên *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Ngày sinh *
                </label>
                <input
                  type="date"
                  value={form.dobIso}
                  onChange={(e) => setForm({ ...form, dobIso: e.target.value })}
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Quan hệ với chủ hộ{form.isHouseholder ? "" : " *"}
                </label>
                <input
                  value={form.isHouseholder ? "Chủ hộ" : form.relation}
                  disabled={form.isHouseholder}
                  onChange={(e) =>
                    setForm({ ...form, relation: e.target.value })
                  }
                  placeholder="VD: Con, Vợ/Chồng..."
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500 disabled:text-stone-400"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Giới tính
                </label>
                <div className="flex h-[34px] items-center gap-4 text-xs text-stone-700">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={form.gender === "male"}
                      onChange={() => setForm({ ...form, gender: "male" })}
                    />{" "}
                    Nam
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="radio"
                      checked={form.gender === "female"}
                      onChange={() => setForm({ ...form, gender: "female" })}
                    />{" "}
                    Nữ
                  </label>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Căn Cước (CCCD) <span className="text-red-500">*</span>
              </label>
              <input
                required
                value={form.cccd}
                onChange={(e) =>
                  setForm({
                    ...form,
                    cccd: e.target.value.replace(/\D/g, "").slice(0, 12),
                  })
                }
                placeholder="Bắt buộc — 12 số"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Số điện thoại
              </label>
              <input
                value={form.phone}
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                  })
                }
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Họ tên cha
                </label>
                <input
                  value={form.fatherName}
                  onChange={(e) =>
                    setForm({ ...form, fatherName: e.target.value })
                  }
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Họ tên mẹ
                </label>
                <input
                  value={form.motherName}
                  onChange={(e) =>
                    setForm({ ...form, motherName: e.target.value })
                  }
                  className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
                />
              </div>
            </div>

            <SelectField
              label="Nhóm cư trú"
              value={form.group}
              onChange={(v) => setForm({ ...form, group: v })}
              options={groups}
            />

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Địa chỉ thường trú
              </label>
              <input
                value={form.permanentAddress}
                onChange={(e) =>
                  setForm({ ...form, permanentAddress: e.target.value })
                }
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                Địa chỉ tạm trú
              </label>
              <input
                value={form.temporaryAddress}
                onChange={(e) =>
                  setForm({ ...form, temporaryAddress: e.target.value })
                }
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
              />
            </div>

            {error && (
              <p className="text-[11px] font-semibold text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
            >
              {submitting ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function DeleteResidentModal({
  account,
  residentId,
  onClose,
  onSuccess,
}: {
  account: AdminAccountItem;
  residentId: string;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setSubmitting(true);
    setError("");
    try {
      await clientApi(`admin/accounts/residents/${residentId}`, {
        method: "DELETE",
      });
      onSuccess(`Đã xóa cư dân "${account.name}" khỏi hệ thống.`);
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Không thể xóa cư dân.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
          Xóa cư dân
        </h3>
        <p className="text-xs text-stone-600">
          Bạn chắc chắn muốn xóa nhân khẩu <b>{account.name}</b> khỏi hệ thống?
          Tài khoản đăng nhập liên quan (nếu có) cũng sẽ bị xóa. Hành động này
          không thể hoàn tác.
        </p>
        {error && (
          <p className="text-[11px] font-semibold text-red-600">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100"
          >
            Hủy
          </button>
          <button
            onClick={confirm}
            disabled={submitting}
            className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg hover:bg-red-500 disabled:opacity-50"
          >
            {submitting ? "Đang xóa..." : "Xác nhận xóa"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportResidentsModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const BATCH_SIZE = 200;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<{ created: number; skipped: number; failed: number } | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setSummary(null);
    try {
      const table = await parseExcelFile(file);
      if (table.length < 2) {
        setParseError("File không có dữ liệu (hoặc thiếu đúng dòng tiêu đề).");
        setRows([]);
        return;
      }
      const { index, missing } = buildColumnIndex(table[0]);
      if (missing.length > 0) {
        setParseError(
          `File thiếu cột bắt buộc: ${missing.join(", ")}. Kiểm tra lại đúng tên cột ở dòng tiêu đề.`,
        );
        setRows([]);
        return;
      }
      const dataRows = table
        .slice(1)
        .filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
      setRows(dataRows.map((r) => mapRawImportRow(r, index)));
    } catch {
      setParseError(
        "Không thể đọc file. Hãy dùng đúng file mẫu định dạng .xlsx.",
      );
      setRows([]);
    }
  }

  const validCount = rows.filter((r) => !r.error).length;

  // Gửi theo từng batch (giữ nguyên nhóm hộ trong 1 batch) — dòng nào
  // BE báo tạo thành công hoặc bỏ qua (CCCD trùng) sẽ bị xóa khỏi danh
  // sách; dòng lỗi (client hoặc BE từ chối) được giữ lại kèm lý do để
  // sửa và nhập lại, không cần chọn lại từ đầu toàn bộ file.
  async function submit() {
    setSubmitting(true);
    setSubmitError("");
    setSummary(null);

    const pending = rows
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => !r.error);
    const batches = chunkRowsByGroup(pending, BATCH_SIZE);

    let totalCreated = 0;
    let totalSkipped = 0;
    let totalFailed = 0;
    const doneIndexes = new Set<number>();
    const failReasonByIndex = new Map<number, string>();

    setProgress({ done: 0, total: pending.length });

    for (const batch of batches) {
      try {
        const res = await clientApi<{
          created: number;
          skipped: number;
          failed: number;
          results: { row: number; name: string; status: string; reason?: string }[];
        }>("admin/accounts/residents/bulk-import", {
          method: "POST",
          body: {
            rows: batch.map(({ r }) => ({
              name: r.name,
              dob: r.dob,
              gender: r.gender,
              cccd: r.cccd,
              isHouseholder: r.isHouseholder,
              groupKey: r.groupKey,
              permanentAddress: r.permanentAddress,
              fatherName: r.fatherName,
              motherName: r.motherName,
              phone: r.phone,
            })),
          },
        });
        totalCreated += res.created;
        totalSkipped += res.skipped;
        totalFailed += res.failed;
        res.results.forEach((rr) => {
          const orig = batch[rr.row - 1]?.i;
          if (orig === undefined) return;
          if (rr.status === "failed") failReasonByIndex.set(orig, rr.reason || "Lỗi không xác định.");
          else doneIndexes.add(orig);
        });
      } catch (err) {
        // Cả batch lỗi (vd mất kết nối) — giữ nguyên các dòng này để thử lại.
        const msg = err instanceof ClientApiError ? err.message : "Lỗi kết nối, thử lại.";
        batch.forEach(({ i }) => failReasonByIndex.set(i, msg));
        totalFailed += batch.length;
      }
      setProgress((p) => (p ? { done: Math.min(p.done + batch.length, p.total), total: p.total } : p));
    }

    // Cập nhật lỗi cho các dòng bị BE từ chối, đồng thời loại bỏ các dòng
    // đã xử lý xong (tạo mới hoặc bỏ qua) khỏi danh sách hiển thị.
    setRows((prev) => {
      const kept: ImportRow[] = [];
      prev.forEach((r, i) => {
        if (doneIndexes.has(i)) return;
        const reason = failReasonByIndex.get(i);
        kept.push(reason ? { ...r, error: reason } : r);
      });
      return kept;
    });

    setProgress(null);
    setSummary({ created: totalCreated, skipped: totalSkipped, failed: totalFailed });
    if (totalFailed === 0) {
      onSuccess(
        `Đã nhập thành công ${totalCreated} cư dân từ file Excel.${totalSkipped > 0 ? ` Bỏ qua ${totalSkipped} dòng đã có CCCD trùng.` : ""}`,
      );
    }
    setSubmitting(false);
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-100 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Nhập cư dân từ Excel
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadImportTemplate}
              className="flex items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-100"
            >
              <i className="fa-solid fa-download" /> Tải file mẫu
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-primary-500"
            >
              <i className="fa-solid fa-upload" /> Chọn file Excel
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            {fileName && (
              <span className="text-xs text-stone-500">{fileName}</span>
            )}
          </div>

          <p className="text-[11px] text-stone-400">
            Dùng đúng file mẫu đang có của thôn: cột <b>Số Hộ Tịch</b> dùng để
            gộp các dòng cùng 1 hộ (không lưu lại giá trị này, hệ thống tự sinh
            mã hộ riêng). Cột <b>Họ và tên (chủ hộ)</b>: dòng chủ hộ để trống
            hoặc tự điền tên mình đều được — hệ thống tự nhận diện. Các thành
            viên khác điền tên chủ hộ vào đó (chỉ để tham khảo).
          </p>

          {parseError && (
            <p className="text-xs font-semibold text-red-600">{parseError}</p>
          )}

          {rows.length > 0 && (
            <>
              <div className="table-scroll-wrap rounded-xl border border-stone-200">
                <div className="table-scroll max-h-80">
                  <table className="w-full min-w-200 text-left text-[11px]">
                    <thead className="sticky top-0 bg-stone-50">
                      <tr className="border-b border-stone-200 text-stone-500">
                        <th className="p-2 font-semibold">#</th>
                        <th className="p-2 font-semibold">Họ tên</th>
                        <th className="p-2 font-semibold">Ngày sinh</th>
                        <th className="p-2 font-semibold">Chủ hộ?</th>
                        <th className="p-2 font-semibold">Số Hộ Tịch</th>
                        <th className="p-2 font-semibold">SĐT</th>
                        <th className="p-2 font-semibold">Trạng thái</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {rows.map((r, i) => (
                        <tr key={i} className={r.error ? "bg-red-50" : ""}>
                          <td className="p-2 text-stone-400">{i + 1}</td>
                          <td className="p-2 font-semibold text-stone-800">
                            {r.name || (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="p-2 text-stone-600">
                            {r.dob || <span className="text-stone-300">—</span>}
                          </td>
                          <td className="p-2 text-stone-600">
                            {r.isHouseholder ? "Có" : ""}
                          </td>
                          <td className="p-2 font-mono text-stone-600">
                            {r.groupKey || (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="p-2 font-mono text-stone-600">
                            {r.phone || (
                              <span className="text-stone-300">—</span>
                            )}
                          </td>
                          <td className="p-2">
                            {r.error ? (
                              <span className="text-red-600">{r.error}</span>
                            ) : (
                              <span className="text-emerald-600">Hợp lệ</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-xs text-stone-500">
                Tổng {rows.length} dòng — {validCount} hợp lệ,{" "}
                {rows.filter((r) => r.error).length} lỗi.
                {rows.some((r) => r.error) &&
                  " Các dòng lỗi sẽ không được gửi lên; sửa xong có thể chọn lại file hoặc tải file lỗi bên dưới để chỉnh."}
              </p>
            </>
          )}

          {progress && (
            <div className="space-y-1.5">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-stone-200">
                <div
                  className="h-full rounded-full bg-primary-600 transition-all"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-500">
                Đang xử lý {progress.done}/{progress.total} dòng...
              </p>
            </div>
          )}

          {summary && (
            <div className="space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs">
              <p className="font-semibold text-stone-700">
                Kết quả: tạo mới {summary.created} cư dân, bỏ qua {summary.skipped} (CCCD đã tồn tại),{" "}
                {summary.failed} dòng lỗi.
                {summary.failed > 0 && " Các dòng lỗi vẫn còn trong bảng phía trên kèm lý do — sửa rồi bấm nhập lại."}
              </p>
              {summary.failed > 0 && (
                <button
                  onClick={() => downloadFailedRowsFile(rows.filter((r) => r.error))}
                  className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-100"
                >
                  <i className="fa-solid fa-file-arrow-down" /> Tải file các dòng lỗi để chỉnh
                </button>
              )}
            </div>
          )}

          {submitError && (
            <p className="text-xs font-semibold text-red-600">{submitError}</p>
          )}
        </div>
        <div className="shrink-0 border-t border-stone-100 p-6">
          <button
            onClick={submit}
            disabled={validCount === 0 || submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            {submitting
              ? "Đang nhập..."
              : validCount > 0
                ? `Xác nhận nhập ${validCount} cư dân hợp lệ`
                : "Không có dòng hợp lệ để nhập"}
          </button>
        </div>
      </div>
    </div>
  );
}
