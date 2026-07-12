// Cho phép dán nguyên đoạn "embed code" ảnh copy từ các trang ảnh (vd
// ibb.co): <a href="..."><img src="..." ...></a> — tự tách lấy đúng link
// ảnh trong thuộc tính src, còn dán URL ảnh thường (không có thẻ <img>)
// thì giữ nguyên không đổi.
export function extractImageUrl(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/<img[^>]*\ssrc=["']([^"']+)["']/i);
  return match ? match[1] : trimmed;
}
