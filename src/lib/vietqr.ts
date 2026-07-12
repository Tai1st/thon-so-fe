// Bảng mã BIN ngân hàng cho VietQR — khớp đúng danh sách bản mẫu gốc
// (js/admin-content.js VIETQR_BANK_BIN) để mã QR tạo ra tương thích ứng
// dụng ngân hàng thật.
const VIETQR_BANK_BIN: Record<string, string> = {
  'Agribank - Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam': '970405',
  'Vietcombank - Ngân hàng TMCP Ngoại thương Việt Nam': '970436',
  'VietinBank - Ngân hàng TMCP Công thương Việt Nam': '970415',
  'BIDV - Ngân hàng TMCP Đầu tư và Phát triển Việt Nam': '970418',
  'Techcombank - Ngân hàng TMCP Kỹ thương Việt Nam': '970407',
  'MB Bank - Ngân hàng TMCP Quân đội': '970422',
  'ACB - Ngân hàng TMCP Á Châu': '970416',
  'VPBank - Ngân hàng TMCP Việt Nam Thịnh Vượng': '970432',
  'Sacombank - Ngân hàng TMCP Sài Gòn Thương Tín': '970403',
  'HDBank - Ngân hàng TMCP Phát triển TP.HCM': '970437',
  'TPBank - Ngân hàng TMCP Tiên Phong': '970423',
  'SHB - Ngân hàng TMCP Sài Gòn - Hà Nội': '970443',
  'VIB - Ngân hàng TMCP Quốc tế Việt Nam': '970441',
  'Eximbank - Ngân hàng TMCP Xuất Nhập khẩu Việt Nam': '970431',
  'MSB - Ngân hàng TMCP Hàng hải Việt Nam': '970426',
  'OCB - Ngân hàng TMCP Phương Đông': '970448',
  'SeABank - Ngân hàng TMCP Đông Nam Á': '970440',
  'LPBank - Ngân hàng TMCP Lộc Phát Việt Nam': '970449',
  'Nam A Bank - Ngân hàng TMCP Nam Á': '970428',
  'Bac A Bank - Ngân hàng TMCP Bắc Á': '970409',
  'PVcomBank - Ngân hàng TMCP Đại Chúng Việt Nam': '970412',
  'SCB - Ngân hàng TMCP Sài Gòn': '970429',
  'VietBank - Ngân hàng TMCP Việt Nam Thương Tín': '970433',
  'KienlongBank - Ngân hàng TMCP Kiên Long': '970452',
  'NCB - Ngân hàng TMCP Quốc Dân': '970419',
  'BaoVietBank - Ngân hàng TMCP Bảo Việt': '970438',
  'PGBank - Ngân hàng TMCP Xăng dầu Petrolimex': '970430',
  'SaigonBank - Ngân hàng TMCP Sài Gòn Công Thương': '970400',
  'VietABank - Ngân hàng TMCP Việt Á': '970427',
  'ABBank - Ngân hàng TMCP An Bình': '970425',
};

export function buildVietQrUrl(
  bankInfo: { bankName: string; accountNumber: string; accountHolder: string } | undefined,
  amount: number,
  addInfo: string,
): string | null {
  if (!bankInfo?.bankName || !bankInfo?.accountNumber) return null;
  const bin = VIETQR_BANK_BIN[bankInfo.bankName];
  if (!bin) return null;
  const params = new URLSearchParams({
    amount: String(amount),
    addInfo,
    accountName: bankInfo.accountHolder || '',
  });
  return `https://img.vietqr.io/image/${bin}-${bankInfo.accountNumber}-compact2.png?${params.toString()}`;
}
