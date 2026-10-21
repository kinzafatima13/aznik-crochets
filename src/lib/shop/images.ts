export async function compressImage(file: File, max = 960): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not read that image.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const url = canvas.toDataURL("image/jpeg", 0.72);
  if (url.length > 420_000) throw new Error("That photo is still too heavy. Try a smaller one.");
  return url;
}

export function isAllowedImage(value: string): boolean {
  if (!value) return true;
  if (value.startsWith("/photos/")) return value.length < 180;
  return (
    (value.startsWith("data:image/jpeg") ||
      value.startsWith("data:image/png") ||
      value.startsWith("data:image/webp")) &&
    value.length < 500_000
  );
}
