'use client';

// Modal xác nhận dùng chung cho mọi nút Xóa trong dashboard — thay cho kiểu
// double-click "bấm lần 2 để xác nhận" trước đây (dễ bấm nhầm liên tiếp).
export function ConfirmDeleteModal({
  title = 'Xác nhận xóa',
  message,
  onCancel,
  onConfirm,
}: {
  title?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-stone-950/80 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-bold uppercase tracking-wider text-stone-900">{title}</h5>
          <button onClick={onCancel} className="text-stone-400 hover:text-stone-900">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <p className="text-xs text-stone-500">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="w-full rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold uppercase text-stone-600 hover:bg-stone-100"
          >
            Hủy
          </button>
          <button onClick={onConfirm} className="w-full rounded-xl bg-red-600 py-2.5 text-xs font-bold uppercase text-white hover:bg-red-500">
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
}
