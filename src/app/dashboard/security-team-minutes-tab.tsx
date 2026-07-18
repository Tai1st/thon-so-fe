'use client';

import { useState } from 'react';
import { clientApi, ClientApiError } from '@/lib/client-api';
import { ImageUrlInput } from '@/components/image-url-input';
import type {
  AnttRepresentative,
  IncidentMinutesItem,
  IncidentReportWithHead,
  MinutesDamage,
  MinutesOpinions,
  MinutesReporter,
  OtherInvolvedPerson,
} from '@/lib/types';
import { ConfirmDeleteModal } from './confirm-delete-modal';

const INCIDENT_TYPES = ['Mất tài sản', 'Đánh nhau', 'Gây rối trật tự công cộng', 'Tranh chấp', 'Tai nạn', 'Mâu thuẫn'];
const VERIFICATION_RESULTS = ['Có dấu hiệu vi phạm pháp luật', 'Không phát hiện dấu hiệu vi phạm', 'Chưa đủ căn cứ xác định'];
const RECOMMENDATIONS = ['Hòa giải tại cơ sở', 'Chuyển Công an xã xử lý', 'Chuyển UBND xã xem xét', 'Tiếp tục xác minh'];

const EMPTY_REPRESENTATIVE: AnttRepresentative = { name: '', position: '' };
const EMPTY_REPORTER: MinutesReporter = { name: '', dob: '', cccd: '', address: '', phone: '' };
const EMPTY_INVOLVED: OtherInvolvedPerson = { name: '', address: '', role: '' };
const EMPTY_DAMAGE: MinutesDamage = { people: '', property: '', other: '' };
const EMPTY_OPINIONS: MinutesOpinions = { reporter: '', involved: '', witness: '' };

// Toàn bộ state của form "Lập biên bản mới" / modal "Sửa biên bản" — dùng
// chung 1 shape cho cả 2 vì thể thức giống hệt nhau, chỉ khác nơi lưu
// (POST tạo mới hay PATCH sửa 1 bản đã có).
interface MinutesFormState {
  relatedReportId: string;
  code: string;
  title: string;
  recordTime: string;
  recordLocation: string;
  anttRepresentatives: AnttRepresentative[];
  reporter: MinutesReporter;
  involvedPeople: OtherInvolvedPerson[];
  incidentTime: string;
  incidentLocation: string;
  incidentTypes: string[];
  incidentTypeOther: string;
  content: string;
  damage: MinutesDamage;
  verificationResult: string;
  verificationNote: string;
  opinions: MinutesOpinions;
  recommendations: string[];
  recommendationOther: string;
  copies: number;
  imageUrls: string[];
}

function emptyForm(): MinutesFormState {
  return {
    relatedReportId: '',
    code: '',
    title: '',
    recordTime: '',
    recordLocation: '',
    anttRepresentatives: [],
    reporter: { ...EMPTY_REPORTER },
    involvedPeople: [],
    incidentTime: '',
    incidentLocation: '',
    incidentTypes: [],
    incidentTypeOther: '',
    content: '',
    damage: { ...EMPTY_DAMAGE },
    verificationResult: '',
    verificationNote: '',
    opinions: { ...EMPTY_OPINIONS },
    recommendations: [],
    recommendationOther: '',
    copies: 2,
    imageUrls: [],
  };
}

function formFromMinutes(m: IncidentMinutesItem): MinutesFormState {
  return {
    relatedReportId: m.relatedReportId || '',
    code: m.code,
    title: m.title,
    recordTime: m.recordTime,
    recordLocation: m.recordLocation,
    anttRepresentatives: m.anttRepresentatives,
    reporter: m.reporter,
    involvedPeople: m.involvedPeople,
    incidentTime: m.incidentTime,
    incidentLocation: m.incidentLocation,
    incidentTypes: m.incidentTypes,
    incidentTypeOther: m.incidentTypeOther,
    content: m.content,
    damage: m.damage,
    verificationResult: m.verificationResult,
    verificationNote: m.verificationNote,
    opinions: m.opinions,
    recommendations: m.recommendations,
    recommendationOther: m.recommendationOther,
    copies: m.copies,
    imageUrls: m.imageUrls,
  };
}

function toggleInArray(arr: string[], value: string): string[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

// Toàn bộ form theo đúng 8 mục La Mã của mẫu giấy "BIÊN BẢN TIẾP NHẬN VÀ
// XÁC MINH VỤ VIỆC" — dùng chung cho cả tạo mới lẫn sửa.
function MinutesFormFields({
  form,
  setForm,
  reports,
}: {
  form: MinutesFormState;
  setForm: (f: MinutesFormState) => void;
  reports: IncidentReportWithHead[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Liên kết tin báo (nếu có)</label>
        <select
          value={form.relatedReportId}
          onChange={(e) => setForm({ ...form, relatedReportId: e.target.value })}
          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
        >
          <option value="">Không liên kết tin báo nào</option>
          {reports.map((r) => (
            <option key={r._id} value={r._id}>
              {r.content.slice(0, 40)} ({r.time})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Số biên bản" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="VD: 01/BB-2026" />
        <TextField label="Tiêu đề biên bản *" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Thời gian lập biên bản"
          value={form.recordTime}
          onChange={(v) => setForm({ ...form, recordTime: v })}
          placeholder="VD: 20 giờ 00, ngày 18/07/2026"
        />
        <TextField label="Địa điểm lập biên bản" value={form.recordLocation} onChange={(v) => setForm({ ...form, recordLocation: v })} />
      </div>

      <FormSection title="I.1 — Đại diện Thôn/Tổ bảo vệ ANTT">
        {form.anttRepresentatives.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={r.name}
              onChange={(e) =>
                setForm({
                  ...form,
                  anttRepresentatives: form.anttRepresentatives.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)),
                })
              }
              placeholder="Họ tên"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
            <input
              value={r.position}
              onChange={(e) =>
                setForm({
                  ...form,
                  anttRepresentatives: form.anttRepresentatives.map((x, idx) => (idx === i ? { ...x, position: e.target.value } : x)),
                })
              }
              placeholder="Chức vụ"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
            <RemoveRowButton onClick={() => setForm({ ...form, anttRepresentatives: form.anttRepresentatives.filter((_, idx) => idx !== i) })} />
          </div>
        ))}
        <AddRowButton
          label="Thêm đại diện"
          onClick={() => setForm({ ...form, anttRepresentatives: [...form.anttRepresentatives, { ...EMPTY_REPRESENTATIVE }] })}
        />
      </FormSection>

      <FormSection title="I.2 — Người trình báo">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={form.reporter.name}
            onChange={(e) => setForm({ ...form, reporter: { ...form.reporter, name: e.target.value } })}
            placeholder="Họ tên"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
          />
          <input
            value={form.reporter.dob}
            onChange={(e) => setForm({ ...form, reporter: { ...form.reporter, dob: e.target.value } })}
            placeholder="Ngày sinh"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
          />
          <input
            value={form.reporter.cccd}
            onChange={(e) => setForm({ ...form, reporter: { ...form.reporter, cccd: e.target.value } })}
            placeholder="Số CCCD"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
          />
          <input
            value={form.reporter.phone}
            onChange={(e) => setForm({ ...form, reporter: { ...form.reporter, phone: e.target.value } })}
            placeholder="Số điện thoại"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
          />
          <input
            value={form.reporter.address}
            onChange={(e) => setForm({ ...form, reporter: { ...form.reporter, address: e.target.value } })}
            placeholder="Địa chỉ"
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500 sm:col-span-2"
          />
        </div>
      </FormSection>

      <FormSection title="I.3 — Người liên quan khác (làm chứng, cán bộ, Tổ ANTT...)">
        {form.involvedPeople.map((p, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={p.name}
              onChange={(e) =>
                setForm({ ...form, involvedPeople: form.involvedPeople.map((x, idx) => (idx === i ? { ...x, name: e.target.value } : x)) })
              }
              placeholder="Họ tên"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
            <input
              value={p.address}
              onChange={(e) =>
                setForm({ ...form, involvedPeople: form.involvedPeople.map((x, idx) => (idx === i ? { ...x, address: e.target.value } : x)) })
              }
              placeholder="Địa chỉ"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
            <input
              value={p.role}
              onChange={(e) =>
                setForm({ ...form, involvedPeople: form.involvedPeople.map((x, idx) => (idx === i ? { ...x, role: e.target.value } : x)) })
              }
              placeholder="Vai trò"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
            />
            <RemoveRowButton onClick={() => setForm({ ...form, involvedPeople: form.involvedPeople.filter((_, idx) => idx !== i) })} />
          </div>
        ))}
        <AddRowButton label="Thêm người" onClick={() => setForm({ ...form, involvedPeople: [...form.involvedPeople, { ...EMPTY_INVOLVED }] })} />
      </FormSection>

      <FormSection title="II — Thời gian, địa điểm xảy ra vụ việc">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextField label="Thời gian xảy ra" value={form.incidentTime} onChange={(v) => setForm({ ...form, incidentTime: v })} />
          <TextField label="Địa điểm xảy ra" value={form.incidentLocation} onChange={(v) => setForm({ ...form, incidentLocation: v })} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Loại vụ việc</label>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-700">
            {INCIDENT_TYPES.map((t) => (
              <label key={t} className="flex items-center gap-1.5">
                <input type="checkbox" checked={form.incidentTypes.includes(t)} onChange={() => setForm({ ...form, incidentTypes: toggleInArray(form.incidentTypes, t) })} />
                {t}
              </label>
            ))}
            <label className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={form.incidentTypes.includes('Khác')}
                onChange={() => setForm({ ...form, incidentTypes: toggleInArray(form.incidentTypes, 'Khác') })}
              />
              Khác:
            </label>
            <input
              value={form.incidentTypeOther}
              onChange={(e) => setForm({ ...form, incidentTypeOther: e.target.value })}
              disabled={!form.incidentTypes.includes('Khác')}
              className="min-w-30 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-800 outline-none focus:border-primary-500 disabled:bg-stone-100"
            />
          </div>
        </div>
      </FormSection>

      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">III — Nội dung diễn biến sự việc *</label>
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={4}
          required
          className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-800 outline-none focus:border-primary-500"
        />
      </div>

      <FormSection title="IV — Thiệt hại (nếu có)">
        <TextField label="Về người" value={form.damage.people} onChange={(v) => setForm({ ...form, damage: { ...form.damage, people: v } })} />
        <TextField label="Về tài sản" value={form.damage.property} onChange={(v) => setForm({ ...form, damage: { ...form.damage, property: v } })} />
        <TextField label="Khác" value={form.damage.other} onChange={(v) => setForm({ ...form, damage: { ...form.damage, other: v } })} />
      </FormSection>

      <FormSection title="V — Kết quả kiểm tra, xác minh ban đầu">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-700">
          {VERIFICATION_RESULTS.map((r) => (
            <label key={r} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="verificationResult"
                checked={form.verificationResult === r}
                onChange={() => setForm({ ...form, verificationResult: r })}
              />
              {r}
            </label>
          ))}
        </div>
        <TextField label="Thông tin khác" value={form.verificationNote} onChange={(v) => setForm({ ...form, verificationNote: v })} />
      </FormSection>

      <FormSection title="VI — Ý kiến của các bên liên quan">
        <TextField label="Người trình báo" value={form.opinions.reporter} onChange={(v) => setForm({ ...form, opinions: { ...form.opinions, reporter: v } })} />
        <TextField label="Người liên quan" value={form.opinions.involved} onChange={(v) => setForm({ ...form, opinions: { ...form.opinions, involved: v } })} />
        <TextField label="Người làm chứng" value={form.opinions.witness} onChange={(v) => setForm({ ...form, opinions: { ...form.opinions, witness: v } })} />
      </FormSection>

      <FormSection title="VII — Kiến nghị, đề xuất">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-stone-700">
          {RECOMMENDATIONS.map((r) => (
            <label key={r} className="flex items-center gap-1.5">
              <input type="checkbox" checked={form.recommendations.includes(r)} onChange={() => setForm({ ...form, recommendations: toggleInArray(form.recommendations, r) })} />
              {r}
            </label>
          ))}
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={form.recommendations.includes('Khác')}
              onChange={() => setForm({ ...form, recommendations: toggleInArray(form.recommendations, 'Khác') })}
            />
            Khác:
          </label>
          <input
            value={form.recommendationOther}
            onChange={(e) => setForm({ ...form, recommendationOther: e.target.value })}
            disabled={!form.recommendations.includes('Khác')}
            className="min-w-30 flex-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs text-stone-800 outline-none focus:border-primary-500 disabled:bg-stone-100"
          />
        </div>
      </FormSection>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">VIII — Số bản biên bản</label>
          <input
            type="number"
            min={1}
            value={form.copies}
            onChange={(e) => setForm({ ...form, copies: Number(e.target.value) || 1 })}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
          />
        </div>
      </div>

      <FormSection title="Ảnh hiện trường / tang chứng (chỉ hiện trên web, không in vào biên bản)">
        {form.imageUrls.map((url, i) => (
          <div key={i} className="flex items-end gap-2">
            <div className="flex-1">
              <ImageUrlInput label={`Ảnh ${i + 1}`} value={url} onChange={(v) => setForm({ ...form, imageUrls: form.imageUrls.map((x, idx) => (idx === i ? v : x)) })} />
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, imageUrls: form.imageUrls.filter((_, idx) => idx !== i) })}
              className="mb-px shrink-0 rounded-xl border border-stone-200 bg-white px-3 py-2 text-stone-400 hover:border-red-300 hover:text-red-500"
            >
              <i className="fa-solid fa-xmark" />
            </button>
          </div>
        ))}
        <AddRowButton label="Thêm ảnh" onClick={() => setForm({ ...form, imageUrls: [...form.imageUrls, ''] })} />
      </FormSection>
    </div>
  );
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t border-stone-200 pt-4">
      <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{title}</span>
      {children}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-800 outline-none focus:border-primary-500"
      />
    </div>
  );
}

function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-lg border border-stone-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase text-stone-600 hover:bg-stone-100">
      <i className="fa-solid fa-plus mr-1" /> {label}
    </button>
  );
}

function RemoveRowButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-xl border border-stone-200 bg-white px-3 text-stone-400 hover:border-red-300 hover:text-red-500">
      <i className="fa-solid fa-xmark" />
    </button>
  );
}

export function SecurityTeamMinutesTab({
  minutes,
  reports,
  onMinutesChange,
}: {
  minutes: IncidentMinutesItem[];
  reports: IncidentReportWithHead[];
  onMinutesChange: (m: IncidentMinutesItem[]) => void;
}) {
  const [notice, setNotice] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [deletingMinutes, setDeletingMinutes] = useState<IncidentMinutesItem | null>(null);
  const [viewingMinutes, setViewingMinutes] = useState<IncidentMinutesItem | null>(null);
  const [printingMinutes, setPrintingMinutes] = useState<IncidentMinutesItem | null>(null);
  const [editingMinutes, setEditingMinutes] = useState<IncidentMinutesItem | null>(null);
  const [form, setForm] = useState<MinutesFormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  function showNotice(type: 'success' | 'error' | 'info', text: string) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function refresh() {
    const res = await clientApi<IncidentMinutesItem[]>('security-team/incident-minutes');
    onMinutesChange(res);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      showNotice('error', 'Vui lòng nhập Tiêu đề và Nội dung diễn biến sự việc.');
      return;
    }
    setSubmitting(true);
    try {
      await clientApi('security-team/incident-minutes', {
        method: 'POST',
        body: { ...form, relatedReportId: form.relatedReportId || undefined },
      });
      await refresh();
      showNotice('success', `Đã lưu biên bản sự việc "${form.title}".`);
      setForm(emptyForm());
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể lập biên bản.');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deletingMinutes) return;
    try {
      await clientApi(`security-team/incident-minutes/${deletingMinutes._id}`, { method: 'DELETE' });
      setDeletingMinutes(null);
      await refresh();
      showNotice('info', 'Đã xóa biên bản.');
    } catch (err) {
      showNotice('error', err instanceof ClientApiError ? err.message : 'Không thể xóa.');
    }
  }

  return (
    <>
      {notice && (
        <div
          className={`mb-4 rounded-xl border p-4 text-xs ${
            notice.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : notice.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-200 bg-blue-50 text-blue-700'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="text-left">
        <h4 className="font-serif text-lg font-bold text-stone-900">Biên Bản Sự Việc</h4>
        <p className="text-xs text-stone-500">Lập biên bản chính thức sau khi xử lý sự việc an ninh trật tự. Chỉ Tổ ANTT xem được mục này.</p>
      </div>

      <div className="space-y-4 rounded-2xl border border-stone-200 bg-stone-50 p-5 text-left">
        <h5 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-900">
          <i className="fa-solid fa-file-signature text-primary-600" />
          <span>Lập biên bản mới</span>
        </h5>
        <form onSubmit={submit} className="space-y-3">
          <MinutesFormFields form={form} setForm={setForm} reports={reports} />
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:from-primary-500 hover:to-primary-600 disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : 'Lập biên bản'}
          </button>
        </form>
      </div>

      <div className="space-y-3 text-left">
        <span className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">Danh sách biên bản đã lập</span>
        <div className="table-scroll-wrap rounded-xl border border-stone-200 bg-stone-50">
          <div className="table-scroll">
            <table className="w-full min-w-175 text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-stone-500">
                  <th className="min-w-20 whitespace-nowrap p-3 font-semibold">Số BB</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Tiêu đề</th>
                  <th className="min-w-30 whitespace-nowrap p-3 font-semibold">Địa điểm xảy ra</th>
                  <th className="min-w-24 whitespace-nowrap p-3 font-semibold">Ảnh</th>
                  <th className="min-w-35 whitespace-nowrap p-3 font-semibold">Thời gian lập</th>
                  <th className="min-w-50 whitespace-nowrap p-3 text-right font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200/40 text-stone-600">
                {minutes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-stone-400">
                      Chưa có biên bản sự việc nào.
                    </td>
                  </tr>
                ) : (
                  minutes.map((m) => (
                    <tr key={m._id} className="transition-colors hover:bg-stone-50">
                      <td className="whitespace-nowrap p-3 align-top font-mono text-stone-500">{m.code || '-'}</td>
                      <td className="whitespace-nowrap p-3 align-top font-semibold text-stone-900">{m.title}</td>
                      <td className="whitespace-nowrap p-3 align-top text-stone-500">{m.incidentLocation || '-'}</td>
                      <td className="p-3 align-top">
                        {m.imageUrls.length === 0 ? (
                          <span className="text-stone-300">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {m.imageUrls.map((url, i) => (
                              <a key={i} href={url} target="_blank" rel="noopener">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="h-10 w-10 rounded-lg object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap p-3 align-top font-mono text-[11px] text-stone-500">{m.time}</td>
                      <td className="whitespace-nowrap p-3 text-right align-top">
                        <button onClick={() => setViewingMinutes(m)} className="mr-1.5 rounded bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-600 hover:bg-stone-200">
                          <i className="fa-solid fa-eye mr-1" /> Xem
                        </button>
                        <button onClick={() => setPrintingMinutes(m)} className="mr-1.5 rounded bg-stone-100 px-2.5 py-1 text-[10px] font-semibold text-stone-600 hover:bg-stone-200">
                          <i className="fa-solid fa-print mr-1" /> In
                        </button>
                        <button
                          onClick={() => {
                            setEditingMinutes(m);
                            setForm(formFromMinutes(m));
                          }}
                          className="mr-1.5 rounded bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-600 hover:bg-blue-600 hover:text-white"
                        >
                          <i className="fa-solid fa-pen mr-1" /> Sửa
                        </button>
                        <button onClick={() => setDeletingMinutes(m)} className="rounded bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-600 hover:bg-red-600 hover:text-white">
                          <i className="fa-solid fa-trash mr-1" /> Xóa
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewingMinutes && <ViewMinutesModal minutes={viewingMinutes} onClose={() => setViewingMinutes(null)} />}

      {printingMinutes && <PrintMinutesModal minutes={printingMinutes} onClose={() => setPrintingMinutes(null)} />}

      {editingMinutes && (
        <EditMinutesModal
          minutesId={editingMinutes._id}
          form={form}
          setForm={setForm}
          reports={reports}
          onClose={() => setEditingMinutes(null)}
          onSaved={async (msg) => {
            setEditingMinutes(null);
            await refresh();
            showNotice('success', msg);
          }}
          onError={(msg) => showNotice('error', msg)}
        />
      )}

      {deletingMinutes && (
        <ConfirmDeleteModal
          message={`Bạn có chắc muốn xóa biên bản "${deletingMinutes.title}"? Hành động này không thể hoàn tác.`}
          onCancel={() => setDeletingMinutes(null)}
          onConfirm={confirmDelete}
        />
      )}
    </>
  );
}

function EditMinutesModal({
  minutesId,
  form,
  setForm,
  reports,
  onClose,
  onSaved,
  onError,
}: {
  minutesId: string;
  form: MinutesFormState;
  setForm: (f: MinutesFormState) => void;
  reports: IncidentReportWithHead[];
  onClose: () => void;
  onSaved: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      onError('Vui lòng nhập Tiêu đề và Nội dung diễn biến sự việc.');
      return;
    }
    setSaving(true);
    try {
      await clientApi(`security-team/incident-minutes/${minutesId}`, {
        method: 'PATCH',
        body: { ...form, relatedReportId: form.relatedReportId || undefined },
      });
      onSaved(`Đã cập nhật biên bản "${form.title}".`);
    } catch (err) {
      onError(err instanceof ClientApiError ? err.message : 'Không thể lưu.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl space-y-3 overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 text-left shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h5 className="font-serif text-base font-bold text-stone-900">Sửa biên bản</h5>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <MinutesFormFields form={form} setForm={setForm} reports={reports} />
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-primary-600 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-lg transition-all hover:bg-primary-500 disabled:opacity-50"
          >
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ViewMinutesModal({ minutes: m, onClose }: { minutes: IncidentMinutesItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 text-left shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h5 className="font-serif text-base font-bold text-stone-900">{m.title}</h5>
            {m.code && <p className="font-mono text-[11px] text-stone-400">Số: {m.code}</p>}
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="font-mono text-[11px] text-stone-500">
          Lập lúc {m.recordTime || m.time} tại {m.recordLocation || '—'} — bởi {m.createdBy}
        </p>

        {m.anttRepresentatives.length > 0 && (
          <ViewSection title="Đại diện Thôn/Tổ ANTT">
            <ul className="space-y-0.5">
              {m.anttRepresentatives.map((r, i) => (
                <li key={i}>
                  {r.name}
                  {r.position && <span className="text-stone-400"> — {r.position}</span>}
                </li>
              ))}
            </ul>
          </ViewSection>
        )}

        {m.reporter.name && (
          <ViewSection title="Người trình báo">
            <p>{m.reporter.name}</p>
            <p className="text-stone-400">
              {[m.reporter.dob, m.reporter.cccd, m.reporter.phone, m.reporter.address].filter(Boolean).join(' — ')}
            </p>
          </ViewSection>
        )}

        {m.involvedPeople.length > 0 && (
          <ViewSection title="Người liên quan khác">
            <ul className="space-y-0.5">
              {m.involvedPeople.map((p, i) => (
                <li key={i}>
                  {p.name}
                  {(p.role || p.address) && <span className="text-stone-400"> — {[p.role, p.address].filter(Boolean).join(', ')}</span>}
                </li>
              ))}
            </ul>
          </ViewSection>
        )}

        <ViewSection title="Thời gian, địa điểm xảy ra">
          <p>
            {m.incidentTime || '—'} tại {m.incidentLocation || '—'}
          </p>
          {(m.incidentTypes.length > 0 || m.incidentTypeOther) && (
            <p className="text-stone-400">{[...m.incidentTypes.filter((t) => t !== 'Khác'), m.incidentTypeOther].filter(Boolean).join(', ')}</p>
          )}
        </ViewSection>

        <ViewSection title="Nội dung diễn biến">
          <p className="whitespace-pre-wrap">{m.content}</p>
        </ViewSection>

        {(m.damage.people || m.damage.property || m.damage.other) && (
          <ViewSection title="Thiệt hại">
            {m.damage.people && <p>Về người: {m.damage.people}</p>}
            {m.damage.property && <p>Về tài sản: {m.damage.property}</p>}
            {m.damage.other && <p>Khác: {m.damage.other}</p>}
          </ViewSection>
        )}

        {m.verificationResult && (
          <ViewSection title="Kết quả xác minh ban đầu">
            <p>{m.verificationResult}</p>
            {m.verificationNote && <p className="text-stone-400">{m.verificationNote}</p>}
          </ViewSection>
        )}

        {(m.opinions.reporter || m.opinions.involved || m.opinions.witness) && (
          <ViewSection title="Ý kiến các bên">
            {m.opinions.reporter && <p>Người trình báo: {m.opinions.reporter}</p>}
            {m.opinions.involved && <p>Người liên quan: {m.opinions.involved}</p>}
            {m.opinions.witness && <p>Người làm chứng: {m.opinions.witness}</p>}
          </ViewSection>
        )}

        {(m.recommendations.length > 0 || m.recommendationOther) && (
          <ViewSection title="Kiến nghị, đề xuất">
            <p>{[...m.recommendations.filter((r) => r !== 'Khác'), m.recommendationOther].filter(Boolean).join(', ')}</p>
          </ViewSection>
        )}

        {m.imageUrls.length > 0 && (
          <ViewSection title="Ảnh đính kèm">
            <div className="flex flex-wrap gap-2">
              {m.imageUrls.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="h-20 w-20 rounded-xl border border-stone-200 object-cover" />
                </a>
              ))}
            </div>
          </ViewSection>
        )}
      </div>
    </div>
  );
}

function ViewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="text-xs">
      <span className="block font-bold uppercase tracking-wider text-stone-500">{title}</span>
      <div className="mt-1 space-y-0.5 text-stone-700">{children}</div>
    </div>
  );
}

// Trang in — đúng thể thức văn bản hành chính (quốc hiệu, tiêu ngữ, đủ 8
// mục, chỗ ký tay 4 bên), KHÔNG có ảnh đính kèm (chỉ web mới hiện ảnh).
// Dùng CSS @media print để chỉ in đúng vùng này, ẩn hết phần còn lại của
// trang — không cần route riêng, không phải lo lại vòng xác thực trang mới.
function PrintMinutesModal({ minutes: m, onClose }: { minutes: IncidentMinutesItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[1200] overflow-y-auto bg-stone-950/70 p-4 print:static print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-3xl items-center justify-end gap-2 print:hidden">
        <button onClick={() => window.print()} className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-bold uppercase text-white shadow-lg hover:bg-primary-500">
          <i className="fa-solid fa-print mr-1" /> In
        </button>
        <button onClick={onClose} className="rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-bold uppercase text-stone-600 hover:bg-stone-100">
          Đóng
        </button>
      </div>

      <div id="minutes-print-area" className="mx-auto max-w-3xl space-y-4 rounded-2xl bg-white p-8 text-sm text-stone-900 shadow-2xl print:rounded-none print:p-0 print:shadow-none">
        <div className="text-center">
          <p className="font-bold uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
          <p className="font-bold">Độc lập - Tự do - Hạnh phúc</p>
          <p>———</p>
        </div>

        <div className="text-center">
          <h1 className="text-lg font-bold uppercase">Biên bản tiếp nhận và xác minh vụ việc</h1>
          <p className="text-xs">Số: {m.code || '....../BB-......'}</p>
        </div>

        <p className="text-xs leading-relaxed">
          Hôm nay, vào hồi <strong>{m.recordTime || '.................................'}</strong>, tại{' '}
          <strong>{m.recordLocation || '.................................'}</strong>, chúng tôi gồm:
        </p>

        <PrintSection title="I. Thành phần lập biên bản">
          <p className="font-semibold">1. Đại diện Thôn/Tổ bảo vệ ANTT ở cơ sở</p>
          {m.anttRepresentatives.length === 0 ? (
            <p>Ông (Bà): .................................. — Chức vụ: ..................................</p>
          ) : (
            m.anttRepresentatives.map((r, i) => (
              <p key={i}>
                Ông (Bà): {r.name} — Chức vụ: {r.position || '..................................'}
              </p>
            ))
          )}
          <p className="mt-2 font-semibold">2. Người trình báo/Người liên quan</p>
          <p>Họ và tên: {m.reporter.name || '..................................'}</p>
          <p>Ngày sinh: {m.reporter.dob || '..................................'}</p>
          <p>CCCD số: {m.reporter.cccd || '..................................'}</p>
          <p>Địa chỉ: {m.reporter.address || '..................................'}</p>
          <p>Số điện thoại: {m.reporter.phone || '..................................'}</p>
          <p className="mt-2 font-semibold">3. Người liên quan khác (nếu có)</p>
          <table className="w-full border-collapse border border-stone-400 text-xs">
            <thead>
              <tr>
                <th className="border border-stone-400 p-1.5">Họ và tên</th>
                <th className="border border-stone-400 p-1.5">Địa chỉ</th>
                <th className="border border-stone-400 p-1.5">Vai trò</th>
              </tr>
            </thead>
            <tbody>
              {(m.involvedPeople.length === 0 ? [{ name: '', address: '', role: '' }, { name: '', address: '', role: '' }] : m.involvedPeople).map((p, i) => (
                <tr key={i}>
                  <td className="border border-stone-400 p-1.5">{p.name}</td>
                  <td className="border border-stone-400 p-1.5">{p.address}</td>
                  <td className="border border-stone-400 p-1.5">{p.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PrintSection>

        <PrintSection title="II. Thời gian, địa điểm xảy ra vụ việc">
          <p>Thời gian xảy ra: {m.incidentTime || '..................................'}</p>
          <p>Địa điểm xảy ra: {m.incidentLocation || '..................................'}</p>
          <p>
            Loại vụ việc:{' '}
            {INCIDENT_TYPES.concat('Khác').map((t) => (
              <span key={t} className="mr-3">
                {m.incidentTypes.includes(t) ? '☑' : '☐'} {t}
                {t === 'Khác' && m.incidentTypeOther ? `: ${m.incidentTypeOther}` : ''}
              </span>
            ))}
          </p>
        </PrintSection>

        <PrintSection title="III. Nội dung vụ việc">
          <p className="whitespace-pre-wrap">{m.content || '..................................'}</p>
        </PrintSection>

        <PrintSection title="IV. Thiệt hại (nếu có)">
          <p className="font-semibold">1. Thiệt hại về người</p>
          <p>{m.damage.people || '..................................'}</p>
          <p className="mt-1 font-semibold">2. Thiệt hại về tài sản</p>
          <p>{m.damage.property || '..................................'}</p>
          <p className="mt-1 font-semibold">3. Thiệt hại khác</p>
          <p>{m.damage.other || '..................................'}</p>
        </PrintSection>

        <PrintSection title="V. Kết quả kiểm tra, xác minh ban đầu">
          {VERIFICATION_RESULTS.map((r) => (
            <p key={r}>
              {m.verificationResult === r ? '☑' : '☐'} {r}
            </p>
          ))}
          <p className="mt-1">Các thông tin khác: {m.verificationNote || '..................................'}</p>
        </PrintSection>

        <PrintSection title="VI. Ý kiến của các bên liên quan">
          <p className="font-semibold">Người trình báo</p>
          <p>{m.opinions.reporter || '..................................'}</p>
          <p className="mt-1 font-semibold">Người liên quan</p>
          <p>{m.opinions.involved || '..................................'}</p>
          <p className="mt-1 font-semibold">Người làm chứng (nếu có)</p>
          <p>{m.opinions.witness || '..................................'}</p>
        </PrintSection>

        <PrintSection title="VII. Kiến nghị, đề xuất">
          {RECOMMENDATIONS.concat('Khác').map((r) => (
            <p key={r}>
              {m.recommendations.includes(r) ? '☑' : '☐'} {r}
              {r === 'Khác' && m.recommendationOther ? `: ${m.recommendationOther}` : ''}
            </p>
          ))}
        </PrintSection>

        <PrintSection title="VIII. Cam kết">
          <p>
            Các bên xác nhận những nội dung ghi trong biên bản là đúng sự thật, đã đọc lại toàn bộ nội dung, thống nhất và cùng ký tên dưới đây. Biên bản
            được lập thành {m.copies} bản, có giá trị như nhau.
          </p>
        </PrintSection>

        <table className="mt-6 w-full border-collapse text-center text-xs">
          <thead>
            <tr>
              <th className="p-1.5 font-bold uppercase">Người trình báo</th>
              <th className="p-1.5 font-bold uppercase">Người liên quan</th>
              <th className="p-1.5 font-bold uppercase">Người làm chứng</th>
              <th className="p-1.5 font-bold uppercase">Đại diện Tổ bảo vệ ANTT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="p-1.5 pt-14">(Ký, ghi rõ họ tên)</td>
              <td className="p-1.5 pt-14">(Ký, ghi rõ họ tên)</td>
              <td className="p-1.5 pt-14">(Ký, ghi rõ họ tên)</td>
              <td className="p-1.5 pt-14">(Ký, ghi rõ họ tên)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #minutes-print-area,
          #minutes-print-area * {
            visibility: visible;
          }
          #minutes-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

function PrintSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h2 className="font-bold uppercase">{title}</h2>
      <div className="space-y-0.5 text-xs">{children}</div>
    </div>
  );
}
