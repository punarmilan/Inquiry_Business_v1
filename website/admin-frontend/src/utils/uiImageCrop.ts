export type ImageCrop = { ratio: number; zoom: number; x: number; y: number };
export function cropRectangle(width: number, height: number, crop: ImageCrop) {
  const ratio = crop.ratio || width / height;
  const zoom = Math.max(1, Math.min(3, crop.zoom));
  const w = Math.min(width, height * ratio) / zoom;
  const h = w / ratio;
  return { x: (width - w) * Math.max(0, Math.min(100, crop.x)) / 100, y: (height - h) * Math.max(0, Math.min(100, crop.y)) / 100, width: w, height: h };
}
export function drawImageCrop(canvas: HTMLCanvasElement, image: HTMLImageElement, crop: ImageCrop, maxSide = 1600) {
  const rect = cropRectangle(image.naturalWidth, image.naturalHeight, crop);
  const scale = Math.min(1, maxSide / Math.max(rect.width, rect.height));
  canvas.width = Math.max(1, Math.round(rect.width * scale)); canvas.height = Math.max(1, Math.round(rect.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Image editing is unavailable in this browser.');
  context.fillStyle = '#FFFFFF'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
}
