/**
 * Browser-only canvas operations (re-encode strips ALL metadata automatically).
 * Never imported by Node tests.
 */

export interface ReencodeResult {
  blob: Blob;
  url: string;
  width: number;
  height: number;
}

export async function reencodeImage(
  file: File,
  opts: { format: 'image/jpeg' | 'image/png' | 'image/webp'; quality: number; maxWidth?: number },
): Promise<ReencodeResult> {
  const bitmap = await createImageBitmap(file);
  const scale = opts.maxWidth && bitmap.width > opts.maxWidth ? opts.maxWidth / bitmap.width : 1;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas không khả dụng trên trình duyệt này.');
  if (opts.format === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Trình duyệt không xuất được ảnh.'))), opts.format, opts.quality),
  );
  return { blob, url: URL.createObjectURL(blob), width: w, height: h };
}
