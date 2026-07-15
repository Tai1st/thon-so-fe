"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { clientApi, ClientApiError } from "@/lib/client-api";
import { buildResidentGroups } from "@/lib/types";
import type {
  HouseholdData,
  HouseholdMember,
  PublicTenant,
  RequestsMine,
} from "@/lib/types";

const FamilyGpsMap = dynamic(
  () => import("./family-gps-map").then((m) => m.FamilyGpsMap),
  { ssr: false },
);

// Lưu trữ ngày sinh dạng "DD/MM/YYYY" (khớp định dạng hiển thị của bản mẫu)
// nhưng input thật là <input type="date"> (yyyy-mm-dd) — 2 hàm này chuyển
// đổi qua lại, giống dmyToIso/isoToDmy trong js/app-init.js gốc.
function dmyToIso(dmy: string): string {
  const parts = dmy.split("/");
  if (parts.length !== 3) return "";
  const [d, m, y] = parts;
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}
function isoToDmy(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return "";
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
}

const CCCD_RE = /^\d{12}$/;
const PHONE_RE = /^\d{10}$/;

function validateMemberForm(form: {
  name: string;
  relation: string;
  dob: string;
  cccd: string;
  gender: string;
  phone: string;
}): string | null {
  if (!form.name.trim() || !form.relation.trim() || !form.dob.trim()) {
    return "Vui lòng nhập đầy đủ Họ và tên, Quan hệ với chủ hộ, Ngày sinh.";
  }
  if (!form.gender) return "Vui lòng chọn giới tính.";
  if (!CCCD_RE.test(form.cccd.trim()))
    return "Số Căn Cước phải gồm đúng 12 chữ số.";
  if (form.phone.trim() && !PHONE_RE.test(form.phone.trim()))
    return "Số điện thoại phải gồm đúng 10 chữ số (hoặc để trống).";
  return null;
}

export function FamilyTab({
  household,
  requests,
  tenants,
  oldVillages,
  onHouseholdChange,
  onRequestsChange,
}: {
  household: HouseholdData;
  requests: RequestsMine;
  tenants: PublicTenant[];
  oldVillages: string[] | undefined;
  onHouseholdChange: (h: HouseholdData) => void;
  onRequestsChange: (r: RequestsMine) => void;
}) {
  const groups = buildResidentGroups(oldVillages);

  // Lấy tenant từ sub-domain (mặc định là doanket nếu không tìm thấy)
  const tenant = tenants.find((t) => t.slug === "doanket") || tenants[0];

  const [editingMember, setEditingMember] = useState<HouseholdMember | null>(
    null,
  );
  const [addingMember, setAddingMember] = useState(false);
  const [houseNumberInput, setHouseNumberInput] = useState(
    household.houseNumber,
  );
  const [gpsBusy, setGpsBusy] = useState(false);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const pendingEditByResident = new Set(
    requests.memberEditRequests
      .filter((r) => r.status === "pending")
      .map((r) => r.residentId),
  );
  const pendingNewMembers = requests.newMemberRequests.filter(
    (r) => r.status === "pending" && r.familyId === household.familyId,
  );

  function showNotice(type: "success" | "error" | "info", text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function saveHouseNumber() {
    try {
      const res = await clientApi<{ houseNumber: string }>(
        "households/me/house-number",
        {
          method: "PATCH",
          body: { houseNumber: houseNumberInput },
        },
      );
      onHouseholdChange({ ...household, houseNumber: res.houseNumber });
      showNotice("success", "Đã lưu số nhà / địa chỉ cụ thể của hộ gia đình.");
    } catch (err) {
      showNotice(
        "error",
        err instanceof ClientApiError ? err.message : "Không thể lưu số nhà.",
      );
    }
  }

  function simulateGPSUpdate() {
    if (!navigator.geolocation) {
      showNotice("error", "Trình duyệt của bạn không hỗ trợ định vị GPS.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await clientApi<{
            gpsCoord: { lat: number; lng: number };
          }>("households/me/gps", {
            method: "PATCH",
            body: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          });
          onHouseholdChange({ ...household, gpsCoord: res.gpsCoord });
          showNotice(
            "success",
            "Đã lấy vị trí GPS hiện tại của thiết bị và lưu vào hồ sơ hộ gia đình.",
          );
        } catch (err) {
          showNotice(
            "error",
            err instanceof ClientApiError
              ? err.message
              : "Không thể lưu vị trí GPS.",
          );
        } finally {
          setGpsBusy(false);
        }
      },
      (error) => {
        setGpsBusy(false);
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Trình duyệt báo quyền vị trí bị chặn. Vui lòng cho phép quyền vị trí cho trang này rồi thử lại."
            : "Không thể lấy vị trí GPS. Vui lòng kiểm tra lại thiết bị và thử lại.";
        showNotice("error", message);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function refreshRequests() {
    const res = await clientApi<RequestsMine>("requests/mine");
    onRequestsChange(res);
  }

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
            Quản lý Thành Viên &amp; Tọa độ Gia đình
          </h4>
          <p className="text-xs text-stone-500">
            Cơ chế quản lý khép kín, đảm bảo tính bảo mật và toàn vẹn dữ liệu cá
            nhân.
          </p>
        </div>
        <button
          onClick={() => setAddingMember(true)}
          className="shrink-0 rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold uppercase text-white hover:bg-primary-500"
        >
          <i className="fa-solid fa-user-plus mr-1" /> Thêm mới
        </button>
      </div>

      <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50 text-left">
        <div className="table-scroll">
          <table className="w-full min-w-205 text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                <th className="min-w-45 whitespace-nowrap bg-stone-50 p-4 font-semibold">
                  Thành viên
                </th>
                <th className="min-w-40 whitespace-nowrap p-4 font-semibold">
                  Quan hệ với chủ hộ
                </th>
                <th className="min-w-30 whitespace-nowrap p-4 font-semibold">
                  Ngày sinh
                </th>
                <th className="min-w-35 whitespace-nowrap p-4 font-semibold">
                  Số Căn Cước
                </th>
                <th className="min-w-35 whitespace-nowrap p-4 font-semibold">
                  Số điện thoại
                </th>
                <th className="min-w-35 whitespace-nowrap bg-stone-50 p-4 text-right font-semibold">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/40 text-stone-600">
              {household.members.map((m) => (
                <tr key={m._id} className="transition-colors hover:bg-stone-50">
                  <td className="whitespace-nowrap bg-stone-50 p-4 font-bold text-stone-900">
                    {m.name}
                  </td>
                  <td className="whitespace-nowrap p-4 text-stone-600">
                    {m.relation || (m.isHouseholder ? "Chủ hộ" : "Thành viên")}
                  </td>
                  <td className="whitespace-nowrap p-4 font-mono text-stone-500">
                    {m.dob}
                  </td>
                  <td className="whitespace-nowrap p-4 font-mono text-stone-400">
                    {m.cccd}
                  </td>
                  <td className="whitespace-nowrap p-4 font-mono text-stone-500">
                    {m.phone || "Chưa có SĐT"}
                  </td>
                  <td className="whitespace-nowrap bg-stone-50 p-4 text-right">
                    {pendingEditByResident.has(m._id) ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                        <i className="fa-solid fa-clock mr-1" /> Chờ Admin duyệt
                      </span>
                    ) : (
                      <button
                        onClick={() => setEditingMember(m)}
                        className="rounded bg-white px-2.5 py-1 text-[11px] font-semibold text-stone-600 transition-all hover:bg-stone-100"
                      >
                        <i className="fa-solid fa-pen-to-square mr-1" /> Sửa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pendingNewMembers.map((r) => (
                <tr
                  key={r._id}
                  className="opacity-70 transition-colors hover:bg-stone-50"
                >
                  <td className="whitespace-nowrap bg-stone-50 p-4 font-bold text-stone-900">
                    {r.name}
                  </td>
                  <td className="whitespace-nowrap p-4 text-stone-600">
                    {r.relation}
                  </td>
                  <td className="whitespace-nowrap p-4 font-mono text-stone-500">
                    {r.dob}
                  </td>
                  <td className="whitespace-nowrap p-4 font-mono text-stone-400">
                    {r.cccd || "-"}
                  </td>
                  <td className="whitespace-nowrap p-4 font-mono text-stone-500">
                    {r.phone || "Chưa có SĐT"}
                  </td>
                  <td className="whitespace-nowrap bg-stone-50 p-4 text-right">
                    <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
                      <i className="fa-solid fa-clock mr-1" /> Chờ Admin duyệt
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* GPS section - Đã fix sử dụng tenant */}
      <div className="grid grid-cols-1 items-center gap-6 border-t border-stone-200 pt-6 text-left lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <span className="inline-block rounded bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-600">
            Định vị địa bàn nông thôn
          </span>
          <h5 className="font-serif text-base font-bold text-stone-900">
            Xác định tọa độ GPS hộ gia đình
          </h5>
          <p className="text-xs leading-relaxed text-stone-500">
            Cập nhật chính xác vị trí phục vụ số hóa bản đồ đất đai, cứu hộ khẩn
            cấp và công tác phát triển an ninh số cơ sở{" "}
            {tenant?.name || "Thôn Đoàn Kết"}.
          </p>

          <div className="space-y-1.5 rounded-xl border border-stone-200 bg-stone-50 p-3.5 font-mono text-xs text-stone-600">
            <div className="flex justify-between">
              <span className="text-stone-400">Vĩ độ (Latitude):</span>
              <span className="font-bold text-stone-900">
                {household.gpsCoord
                  ? `${household.gpsCoord.lat.toFixed(6)}° N`
                  : "Chưa định vị"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Kinh độ (Longitude):</span>
              <span className="font-bold text-stone-900">
                {household.gpsCoord
                  ? `${household.gpsCoord.lng.toFixed(6)}° E`
                  : "Chưa định vị"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-400">Trạng thái định vị:</span>
              <span
                className={`font-bold ${household.gpsCoord ? "text-emerald-600" : "text-amber-600"}`}
              >
                {household.gpsCoord
                  ? "Đã định vị bằng GPS thiết bị"
                  : "Chưa có dữ liệu"}
              </span>
            </div>
          </div>

          <button
            onClick={simulateGPSUpdate}
            disabled={gpsBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-stone-200 bg-stone-50 py-3 text-xs font-bold uppercase tracking-wider text-stone-700 transition-all hover:border-primary-500 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50"
          >
            <i className="fa-solid fa-location-crosshairs animate-pulse text-primary-400" />{" "}
            Định vị GPS hiện tại
          </button>

          <a
            href={
              household.gpsCoord
                ? `https://www.google.com/maps?q=${household.gpsCoord.lat},${household.gpsCoord.lng}`
                : undefined
            }
            target={household.gpsCoord ? "_blank" : undefined}
            rel="noopener"
            className={`flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-50 py-3 text-xs font-bold uppercase tracking-wider text-emerald-600 transition-all ${
              household.gpsCoord
                ? "hover:bg-emerald-100"
                : "cursor-not-allowed opacity-40"
            }`}
          >
            <i className="fa-brands fa-google" /> Xem trên Google Maps
          </a>

          <div className="space-y-1.5 pt-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
              Số nhà / Địa chỉ cụ thể
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={houseNumberInput}
                onChange={(e) => setHouseNumberInput(e.target.value)}
                placeholder="VD: Số 12, ngõ 3"
                className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none transition-colors focus:border-primary-500"
              />
              <button
                onClick={saveHouseNumber}
                className="shrink-0 rounded-xl bg-primary-600 px-3 py-2 text-xs font-bold text-white hover:bg-primary-500"
              >
                <i className="fa-solid fa-floppy-disk" />
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <FamilyGpsMap
            familyId={household.familyId}
            gpsCoord={household.gpsCoord}
            tenant={tenant}
          />
        </div>
      </div>

      {editingMember && (
        <EditMemberModal
          member={editingMember}
          groups={groups}
          tenant={tenant}
          onClose={() => setEditingMember(null)}
          onSuccess={async () => {
            setEditingMember(null);
            await refreshRequests();
            showNotice(
              "info",
              "Yêu cầu điều chỉnh thông tin đã được gửi và đang chờ Admin phê duyệt.",
            );
          }}
        />
      )}

      {addingMember && (
        <AddMemberModal
          groups={groups}
          tenant={tenant}
          onClose={() => setAddingMember(false)}
          onSuccess={async () => {
            setAddingMember(false);
            await refreshRequests();
            showNotice(
              "info",
              "Yêu cầu thêm thành viên mới đã được gửi và đang chờ Admin phê duyệt.",
            );
          }}
        />
      )}
    </>
  );
}

// ============================================
// EDIT MEMBER MODAL
// ============================================
function EditMemberModal({
  member,
  groups,
  tenant,
  onClose,
  onSuccess,
}: {
  member: HouseholdMember;
  groups: string[];
  tenant: PublicTenant;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const initial = {
    name: member.name,
    relation: member.relation || "",
    dob: member.dob,
    cccd: member.cccd,
    gender:
      member.gender === "male" || member.gender === "female"
        ? member.gender
        : "",
    phone: member.phone,
    fatherName: member.fatherName || "",
    motherName: member.motherName || "",
    group: member.group || groups[0],
    permanentAddress: member.permanentAddress || "",
    temporaryAddress: member.temporaryAddress || "",
  };
  const [form, setForm] = useState(initial);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validationError = validateMemberForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    const changed = (Object.keys(initial) as (keyof typeof initial)[]).some(
      (k) => form[k] !== initial[k],
    );
    if (!changed) {
      setError("Bạn chưa thay đổi thông tin nào để gửi yêu cầu.");
      return;
    }
    setSubmitting(true);
    try {
      await clientApi("requests/member-edit", {
        method: "POST",
        body: { residentId: member._id, newValues: form },
      });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Không thể gửi yêu cầu.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Yêu cầu sửa thông tin - {tenant?.name || "Thôn"}
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
          <FormField
            label="Họ và tên *"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <FormField
            label="Quan hệ với chủ hộ *"
            value={form.relation}
            onChange={(v) => setForm({ ...form, relation: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormDate
              label="Ngày sinh *"
              value={form.dob}
              onChange={(v) => setForm({ ...form, dob: v })}
            />
            <FormGender
              value={form.gender}
              onChange={(v) => setForm({ ...form, gender: v })}
            />
          </div>
          <FormField
            label="Số Căn Cước (12 số) *"
            value={form.cccd}
            onChange={(v) =>
              setForm({ ...form, cccd: v.replace(/\D/g, "").slice(0, 12) })
            }
          />
          <FormField
            label="Số điện thoại (nếu có, đủ 10 số)"
            value={form.phone}
            onChange={(v) =>
              setForm({ ...form, phone: v.replace(/\D/g, "").slice(0, 10) })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Họ tên cha"
              value={form.fatherName}
              onChange={(v) => setForm({ ...form, fatherName: v })}
            />
            <FormField
              label="Họ tên mẹ"
              value={form.motherName}
              onChange={(v) => setForm({ ...form, motherName: v })}
            />
          </div>
          <FormSelect
            label="Nhóm cư trú"
            value={form.group}
            onChange={(v) => setForm({ ...form, group: v })}
            options={groups}
          />
          <FormField
            label="Địa chỉ thường trú"
            placeholder={`VD: ${tenant?.name || "Thôn Đoàn Kết"}, xã Dliê Ya, tỉnh Đắk Lắk`}
            value={form.permanentAddress}
            onChange={(v) => setForm({ ...form, permanentAddress: v })}
          />
          <FormField
            label="Địa chỉ tạm trú (nếu đang đi làm ăn xa)"
            placeholder="Để trống nếu không đi làm ăn xa"
            value={form.temporaryAddress}
            onChange={(v) => setForm({ ...form, temporaryAddress: v })}
          />
          <p className="text-[11px] text-stone-400">
            (*) Bắt buộc nhập. Yêu cầu sẽ ở trạng thái &quot;Chờ duyệt&quot; cho
            đến khi Admin phê duyệt.
          </p>
          {error && (
            <p className="text-[11px] font-semibold text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            Gửi yêu cầu
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// ADD MEMBER MODAL
// ============================================
function AddMemberModal({
  groups,
  tenant,
  onClose,
  onSuccess,
}: {
  groups: string[];
  tenant: PublicTenant;
  onClose: () => void;
  onSuccess: () => void;
}) {
  // Tạo địa chỉ mặc định từ tenant
  const defaultAddress = tenant
    ? `${tenant.name}, ${tenant.address}`
    : "Thôn Đoàn Kết, xã Dliê Ya, tỉnh Đắk Lắk";

  const [form, setForm] = useState({
    name: "",
    relation: "",
    dob: "",
    cccd: "",
    gender: "",
    phone: "",
    fatherName: "",
    motherName: "",
    group: groups[0],
    permanentAddress: defaultAddress,
    temporaryAddress: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validationError = validateMemberForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      await clientApi("requests/new-member", { method: "POST", body: form });
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ClientApiError ? err.message : "Không thể gửi yêu cầu.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Thêm thành viên mới - {tenant?.name || "Thôn"}
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
          <FormField
            label="Họ và tên *"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <FormField
            label="Quan hệ với chủ hộ *"
            placeholder="VD: Con, Vợ/Chồng..."
            value={form.relation}
            onChange={(v) => setForm({ ...form, relation: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormDate
              label="Ngày sinh *"
              value={form.dob}
              onChange={(v) => setForm({ ...form, dob: v })}
            />
            <FormGender
              value={form.gender}
              onChange={(v) => setForm({ ...form, gender: v })}
            />
          </div>
          <FormField
            label="Số định danh cá nhân / Căn Cước (12 số) *"
            value={form.cccd}
            onChange={(v) =>
              setForm({ ...form, cccd: v.replace(/\D/g, "").slice(0, 12) })
            }
          />
          <FormField
            label="Số điện thoại (nếu có, đủ 10 số)"
            value={form.phone}
            onChange={(v) =>
              setForm({ ...form, phone: v.replace(/\D/g, "").slice(0, 10) })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label="Họ tên cha"
              value={form.fatherName}
              onChange={(v) => setForm({ ...form, fatherName: v })}
            />
            <FormField
              label="Họ tên mẹ"
              value={form.motherName}
              onChange={(v) => setForm({ ...form, motherName: v })}
            />
          </div>
          <FormSelect
            label="Nhóm cư trú"
            value={form.group}
            onChange={(v) => setForm({ ...form, group: v })}
            options={groups}
          />
          <FormField
            label="Địa chỉ thường trú"
            placeholder={`VD: ${tenant?.name || "Thôn Đoàn Kết"}, xã Dliê Ya, tỉnh Đắk Lắk`}
            value={form.permanentAddress}
            onChange={(v) => setForm({ ...form, permanentAddress: v })}
          />
          <FormField
            label="Địa chỉ tạm trú (nếu đang đi làm ăn xa)"
            placeholder="Để trống nếu không đi làm ăn xa"
            value={form.temporaryAddress}
            onChange={(v) => setForm({ ...form, temporaryAddress: v })}
          />
          <p className="text-[11px] text-stone-400">(*) Bắt buộc nhập.</p>
          {error && (
            <p className="text-[11px] font-semibold text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            Gửi yêu cầu
          </button>
        </form>
      </div>
    </div>
  );
}

// ============================================
// FORM COMPONENTS
// ============================================
function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none transition-colors focus:border-primary-500"
      />
    </div>
  );
}

function FormDate({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
        {label}
      </label>
      <input
        type="date"
        value={dmyToIso(value)}
        onChange={(e) =>
          onChange(e.target.value ? isoToDmy(e.target.value) : "")
        }
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none transition-colors focus:border-primary-500"
      />
    </div>
  );
}

function FormGender({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
        Giới tính *
      </label>
      <div className="flex h-[34px] items-center gap-4 rounded-xl border border-stone-200 bg-stone-50 px-3 text-xs text-stone-800">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="gender"
            checked={value === "male"}
            onChange={() => onChange("male")}
          />{" "}
          Nam
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="gender"
            checked={value === "female"}
            onChange={() => onChange("female")}
          />{" "}
          Nữ
        </label>
      </div>
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none transition-colors focus:border-primary-500"
      >
        {options.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </div>
  );
}
