'use client';

import { useState } from 'react';

// Dùng chung cho MỌI ô nhập URL ảnh trong app (logo, hero, avatar, gallery,
// địa danh...) — vẫn cho dán URL ảnh ngoài như trước (input text thường,
// có name để form.get() đọc đúng ở chỗ dùng uncontrolled form), chỉ thêm
// lựa chọn tải file thật lên Nextcloud qua endpoint /uploads, tự điền URL
// trả về vào chính ô input đó.
//
// Hỗ trợ cả 2 kiểu dùng:
// - Uncontrolled (mặc định): truyền `name` + `defaultValue`, đọc giá trị
//   lúc submit qua `new FormData(form).get(name)` như các TextInput khác.
// - Controlled: truyền `value` + `onChange`, component không tự giữ state
//   nữa mà giao hết cho component cha (vd avatar ở trang hồ sơ, nơi cần
//   đọc giá trị hiện tại để gọi API lưu ngay khi bấm nút, không qua <form>).
export function ImageUrlInput({
  name,
  label,
  defaultValue,
  value: controlledValue,
  onChange: controlledOnChange,
  uploadUrl = '/api/backend/uploads',
  variant = 'light',
  className,
}: {
  name?: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  uploadUrl?: string;
  variant?: 'light' | 'dark';
  className?: string;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const isControlled = controlledValue !== undefined;
  const value = isControlled ? controlledValue : internalValue;

  function setValue(v: string) {
    if (isControlled) controlledOnChange?.(v);
    else setInternalValue(v);
  }

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(uploadUrl, { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Tải ảnh lên thất bại.');
      setValue(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tải ảnh lên thất bại.');
    } finally {
      setUploading(false);
    }
  }

  const isDark = variant === 'dark';
  const labelClass = isDark ? 'text-stone-500' : 'text-stone-400';
  const inputClass = isDark
    ? 'w-full rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-xs text-white outline-none focus:border-emerald-500'
    : 'w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 outline-none focus:border-primary-500';
  const buttonClass = isDark
    ? 'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border border-stone-700 bg-stone-800 px-3 py-2 text-[11px] font-bold text-stone-300 hover:bg-stone-700'
    : 'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-[11px] font-bold text-stone-600 hover:bg-stone-50';

  return (
    <div className={`space-y-1 ${className || ''}`}>
      <label className={`block text-[9px] font-bold uppercase ${labelClass}`}>{label}</label>
      <div className="flex gap-2">
        <input
          name={name}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Dán URL ảnh hoặc tải lên"
          className={inputClass}
        />
        <label className={`${buttonClass} ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
          <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`} />
          <span className="hidden sm:inline">Tải lên</span>
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
      </div>
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-16 w-16 rounded-lg border border-stone-200 object-cover" />
      )}
      {error && <p className="text-[10px] text-red-600">{error}</p>}
    </div>
  );
}
