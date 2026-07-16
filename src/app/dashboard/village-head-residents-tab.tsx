"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { clientApi, ClientApiError } from "@/lib/client-api";
import { buildResidentGroups } from "@/lib/types";
import type {
  HomeContent,
  HouseholdLocation,
  PublicTenant,
  VillageHeadResident,
} from "@/lib/types";
import { TableActionsMenu } from "./table-actions-menu";

const FamilyGpsMap = dynamic(
  () => import("./family-gps-map").then((m) => m.FamilyGpsMap),
  { ssr: false },
);

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

function validateForm(form: {
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

export function VillageHeadResidentsTab({
  residents,
  oldVillages,
  siteName,
  onResidentsChange,
}: {
  residents: VillageHeadResident[];
  oldVillages: string[] | undefined;
  siteName: string;
  onResidentsChange: (r: VillageHeadResident[]) => void;
}) {
  const groups = buildResidentGroups(oldVillages);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<VillageHeadResident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<VillageHeadResident | null>(
    null,
  );
  const [locationTarget, setLocationTarget] =
    useState<VillageHeadResident | null>(null);
  const [notice, setNotice] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  function showNotice(type: "success" | "error" | "info", text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  const q = query.trim().toLowerCase();
  const filtered = !q
    ? residents
    : residents.filter((r) =>
        [r.name, r.cccd, r.phone, r.familyId, r.group].some((f) =>
          (f || "").toLowerCase().includes(q),
        ),
      );

  // Sắp xếp theo hộ (familyId)
  const sortedResidents = [...filtered].sort((a, b) => {
    // So sánh familyId
    const familyCompare = (a.familyId || "").localeCompare(b.familyId || "");
    if (familyCompare !== 0) return familyCompare;
    
    // Nếu cùng familyId, ưu tiên chủ hộ lên trước
    if (a.isHouseholder && !b.isHouseholder) return -1;
    if (!a.isHouseholder && b.isHouseholder) return 1;
    
    // Nếu cùng là thành viên, sắp xếp theo tên
    return (a.name || "").localeCompare(b.name || "");
  });

  async function refresh() {
    const res = await clientApi<{
      total: number;
      residents: VillageHeadResident[];
    }>(`village-head/residents?q=${encodeURIComponent(query)}`);
    onResidentsChange(res.residents);
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
            Quản lý Toàn Thôn &amp; Đệ Trình Xóa Nhân Khẩu
          </h4>
          <p className="text-xs text-stone-500">
            Giám sát tính toàn vẹn dữ liệu. Gửi đề xuất xóa nhân khẩu sai sót
            lên Admin.
          </p>
        </div>
      </div>

      <div className="space-y-3 text-left">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
            Danh bạ cư dân toàn {siteName} ({sortedResidents.length}/
            {residents.length} nhân khẩu)
          </span>
          <div className="relative w-full sm:w-64">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-stone-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm theo tên, Căn Cước, SĐT, mã hộ..."
              className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pl-8 pr-3 text-xs text-stone-900 outline-none transition-colors focus:border-primary-500"
            />
          </div>
        </div>

        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-225 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-40 whitespace-nowrap p-3 font-semibold">
                    Họ và Tên
                  </th>
                  <th className="min-w-35 whitespace-nowrap p-3 text-center font-semibold">
                    Quan hệ với chủ hộ
                  </th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">
                    Ngày sinh
                  </th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">
                    Căn Cước
                  </th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">
                    Số điện thoại
                  </th>
                  <th className="min-w-25 whitespace-nowrap p-3 font-semibold">
                    Mã hộ
                  </th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">
                    Địa bàn
                  </th>
                  <th className="min-w-30 whitespace-nowrap p-3 text-center font-semibold">
                    Quản lý dữ liệu
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {sortedResidents.map((r) => (
                  <tr
                    key={r._id}
                    className="transition-colors hover:bg-stone-50"
                  >
                    <td className="whitespace-nowrap p-3 font-bold text-stone-900">
                      {r.name}
                    </td>
                    <td className="whitespace-nowrap p-3 text-center text-stone-600">
                      {r.relation ||
                        (r.isHouseholder ? "Chủ hộ" : "Thành viên")}
                    </td>
                    <td className="whitespace-nowrap p-3 font-mono text-stone-600">
                      {r.dob}
                    </td>
                    <td className="whitespace-nowrap p-3 font-mono text-stone-500">
                      {r.cccd}
                    </td>
                    <td className="whitespace-nowrap p-3 font-mono text-stone-500">
                      {r.phone || "Chưa có SĐT"}
                    </td>
                    <td className="whitespace-nowrap p-3 font-mono text-stone-400">
                      {r.familyId}
                    </td>
                    <td className="whitespace-nowrap p-3 text-stone-600">
                      {r.group}
                    </td>
                    <td className="whitespace-nowrap p-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setLocationTarget(r)}
                          className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-600 transition-all hover:bg-emerald-600 hover:text-white whitespace-nowrap"
                        >
                          <i className="fa-solid fa-location-dot" /> Vị trí
                        </button>
                        <button
                          onClick={() => setEditing(r)}
                          className="rounded border border-stone-300 bg-stone-100 px-2 py-1 text-[10px] font-semibold text-stone-600 transition-all hover:bg-primary-600 hover:text-white whitespace-nowrap"
                        >
                          <i className="fa-solid fa-pen-to-square" /> Sửa
                        </button>
                        {r.hasPendingDeleteRequest ? (
                          <button
                            disabled
                            title="Đang chờ Admin phê duyệt"
                            className="cursor-not-allowed rounded bg-amber-50 px-2 py-1 text-[10px] text-amber-600 opacity-90 whitespace-nowrap"
                          >
                            <i className="fa-solid fa-spinner animate-spin" />{" "}
                            Chờ duyệt
                          </button>
                        ) : (
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="rounded bg-red-50 px-2 py-1 text-[10px] text-red-600 transition-all hover:bg-red-600 hover:text-white whitespace-nowrap"
                          >
                            Yêu cầu xóa
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {sortedResidents.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-stone-400">
                      Không tìm thấy nhân khẩu phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <EditResidentModal
          resident={editing}
          groups={groups}
          onClose={() => setEditing(null)}
          onSuccess={async (updated) => {
            onResidentsChange(
              residents.map((r) =>
                r._id === updated._id ? { ...r, ...updated } : r,
              ),
            );
            setEditing(null);
            showNotice("success", `Đã cập nhật thông tin của ${updated.name}.`);
          }}
        />
      )}

      {deleteTarget && (
        <DeleteRequestModal
          resident={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onSuccess={async () => {
            setDeleteTarget(null);
            await refresh();
            showNotice(
              "success",
              "Yêu cầu duyệt xóa đã được gửi thành công đến Admin.",
            );
          }}
        />
      )}

      {locationTarget && (
        <ViewLocationModal
          resident={locationTarget}
          onClose={() => setLocationTarget(null)}
        />
      )}
    </>
  );
}

function EditResidentModal({
  resident,
  groups,
  onClose,
  onSuccess,
}: {
  resident: VillageHeadResident;
  groups: string[];
  onClose: () => void;
  onSuccess: (updated: VillageHeadResident) => void;
}) {
  const [form, setForm] = useState({
    name: resident.name,
    relation: resident.relation || "",
    dob: resident.dob,
    cccd: resident.cccd,
    gender:
      resident.gender === "male" || resident.gender === "female"
        ? resident.gender
        : "",
    phone: resident.phone,
    fatherName: resident.fatherName || "",
    motherName: resident.motherName || "",
    group: resident.group || groups[0],
    permanentAddress: resident.permanentAddress || "",
    temporaryAddress: resident.temporaryAddress || "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const validationError = validateForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      const updated = await clientApi<VillageHeadResident>(
        `village-head/residents/${resident._id}`,
        {
          method: "PATCH",
          body: form,
        },
      );
      onSuccess({ ...resident, ...updated });
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
      <div className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Sửa thông tin nhân khẩu
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
          <Field
            label="Họ và tên *"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <Field
            label="Quan hệ với chủ hộ *"
            value={form.relation}
            onChange={(v) => setForm({ ...form, relation: v })}
          />
          <div className="grid grid-cols-2 gap-3">
            <DateField
              label="Ngày sinh *"
              value={form.dob}
              onChange={(v) => setForm({ ...form, dob: v })}
            />
            <GenderField
              value={form.gender}
              onChange={(v) => setForm({ ...form, gender: v })}
            />
          </div>
          <Field
            label="Số Căn Cước (12 số) *"
            value={form.cccd}
            onChange={(v) =>
              setForm({ ...form, cccd: v.replace(/\D/g, "").slice(0, 12) })
            }
          />
          <Field
            label="Số điện thoại"
            value={form.phone}
            onChange={(v) =>
              setForm({ ...form, phone: v.replace(/\D/g, "").slice(0, 10) })
            }
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Họ tên cha"
              value={form.fatherName}
              onChange={(v) => setForm({ ...form, fatherName: v })}
            />
            <Field
              label="Họ tên mẹ"
              value={form.motherName}
              onChange={(v) => setForm({ ...form, motherName: v })}
            />
          </div>
          <SelectField
            label="Nhóm cư trú"
            value={form.group}
            onChange={(v) => setForm({ ...form, group: v })}
            options={groups}
          />
          <Field
            label="Địa chỉ thường trú"
            value={form.permanentAddress}
            onChange={(v) => setForm({ ...form, permanentAddress: v })}
          />
          <Field
            label="Địa chỉ tạm trú"
            value={form.temporaryAddress}
            onChange={(v) => setForm({ ...form, temporaryAddress: v })}
          />
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

function DeleteRequestModal({
  resident,
  onClose,
  onSuccess,
}: {
  resident: VillageHeadResident;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!reason.trim()) {
      setError("Vui lòng cung cấp lý do xóa chính đáng.");
      return;
    }
    setSubmitting(true);
    try {
      await clientApi("village-head/delete-requests", {
        method: "POST",
        body: { residentId: resident._id, reason: reason.trim() },
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
      <div className="w-full max-w-md space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900">
            <i className="fa-solid fa-triangle-exclamation text-red-500" />
            <span>Đệ trình lý do xóa dữ liệu nhân khẩu — {resident.name}</span>
          </h5>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-900"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-[11px] text-stone-500">
          Lưu ý: Dữ liệu sẽ không bị xóa ngay lập tức mà cần được duyệt bởi
          Admin hệ thống tối cao.
        </p>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do chi tiết (VD: Khai tử, Chuyển khẩu vĩnh viễn...)"
          className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-red-500"
        />
        {error && (
          <p className="text-[11px] font-semibold text-red-600">{error}</p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg bg-stone-50 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-100"
          >
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="rounded-lg bg-red-600 px-4 py-1.5 text-center text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50"
          >
            Gửi yêu cầu duyệt
          </button>
        </div>
      </div>
    </div>
  );
}

function ViewLocationModal({
  resident,
  onClose,
}: {
  resident: VillageHeadResident;
  onClose: () => void;
}) {
  const [location, setLocation] = useState<HouseholdLocation | null>(null);
  const [tenant, setTenant] = useState<PublicTenant | undefined>(undefined);
  const [gpsBusy, setGpsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [loc, tenants, homeContent] = await Promise.all([
        clientApi<HouseholdLocation>(
          `village-head/households/${resident.familyId}/location`,
        ),
        clientApi<PublicTenant[]>("tenants/public"),
        clientApi<HomeContent>("home-content"),
      ]);
      if (!cancelled) {
        setLocation(loc);
        setTenant(tenants.find((t) => t.slug === homeContent.slug) || tenants[0]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resident.familyId]);

  function updateGps() {
    if (!navigator.geolocation) return;
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const res = await clientApi<{ gpsCoord: { lat: number; lng: number } }>(
          `village-head/households/${resident.familyId}/gps`,
          {
            method: "PATCH",
            body: {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            },
          },
        );
        setLocation((prev) =>
          prev ? { ...prev, gpsCoord: res.gpsCoord } : prev,
        );
        setGpsBusy(false);
      },
      () => setGpsBusy(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 p-6">
          <h3 className="font-serif text-base font-bold uppercase tracking-wider text-stone-900">
            Vị Trí Hộ Gia Đình
          </h3>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 bg-stone-50 text-stone-500 hover:border-red-300 hover:text-red-500"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-6 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="block text-[10px] uppercase text-stone-400">
                Mã hộ
              </span>
              <span className="font-mono font-bold text-stone-900">
                {resident.familyId}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase text-stone-400">
                Chủ hộ
              </span>
              <span className="font-bold text-stone-900">
                {location?.headName ?? "..."}
              </span>
            </div>
            <div className="col-span-2">
              <span className="block text-[10px] uppercase text-stone-400">
                Số nhà
              </span>
              <span className="font-bold text-stone-900">
                {location?.houseNumber || "Chưa cập nhật"}
              </span>
            </div>
          </div>

          {location && (
            <FamilyGpsMap
              familyId={resident.familyId}
              gpsCoord={location.gpsCoord}
              tenant={tenant}
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={updateGps}
              disabled={gpsBusy}
              className="flex-1 rounded-xl border border-stone-200 bg-stone-50 py-2 text-[11px] font-bold uppercase tracking-wider text-stone-700 transition-all hover:border-primary-500 disabled:opacity-50"
            >
              <i className="fa-solid fa-location-crosshairs mr-1 text-primary-400" />{" "}
              Cập nhật vị trí hiện tại
            </button>
            <a
              href={
                location?.gpsCoord
                  ? `https://www.google.com/maps?q=${location.gpsCoord.lat},${location.gpsCoord.lng}`
                  : undefined
              }
              target={location?.gpsCoord ? "_blank" : undefined}
              rel="noopener"
              className={`flex-1 rounded-xl bg-emerald-50 py-2 text-center text-[11px] font-bold uppercase tracking-wider text-emerald-600 ${
                location?.gpsCoord
                  ? "hover:bg-emerald-100"
                  : "pointer-events-none opacity-40"
              }`}
            >
              <i className="fa-brands fa-google" /> Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
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
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-xs text-stone-800 outline-none transition-colors focus:border-primary-500"
      />
    </div>
  );
}

function DateField({
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

function GenderField({
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
            name="edit-gender"
            checked={value === "male"}
            onChange={() => onChange("male")}
          />{" "}
          Nam
        </label>
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            name="edit-gender"
            checked={value === "female"}
            onChange={() => onChange("female")}
          />{" "}
          Nữ
        </label>
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