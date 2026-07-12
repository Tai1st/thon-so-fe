'use client';

import { useEffect, useRef, useState } from 'react';

export interface TableAction {
  label: string;
  onClick: () => void;
  icon?: string;
  disabled?: boolean;
  danger?: boolean;
}

// Cột "Thao tác" có từ 3 nút trở lên: desktop vẫn hiện đủ nút trên 1 hàng
// (giao diện không đổi), mobile gộp lại thành menu 3 chấm để không bị vỡ
// bố cục / ép chữ khó bấm trên màn hình hẹp.
export function TableActionsMenu({ actions }: { actions: TableAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block sm:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-100"
        aria-label="Thao tác"
      >
        <i className="fa-solid fa-ellipsis-vertical" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-xl border border-stone-200 bg-white text-left shadow-lg">
          {actions.map((a, idx) => (
            <button
              key={idx}
              disabled={a.disabled}
              onClick={() => {
                setOpen(false);
                a.onClick();
              }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                a.danger ? 'text-red-600 hover:bg-red-50' : 'text-stone-600 hover:bg-stone-50'
              }`}
            >
              {a.icon && <i className={`fa-solid ${a.icon} w-3.5 text-center`} />}
              <span>{a.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
