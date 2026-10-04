// Image upload for the backoffice (banners, place photos).
// Big phone/camera photos are resized in the browser before upload (max
// 2400 px wide for desktop banners, 1400 px for mobile banners and place
// photos) and re-encoded as WebP — usually 5-20x smaller, so the site stays
// fast on mobile data in Kinshasa. GIF/SVG are uploaded untouched.
import { supabase } from './supabase';

async function shrink(file: File, maxWidth: number): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.86));
  return blob && blob.size < file.size ? blob : file;
}

export async function uploadImage(file: File, folder: 'banners' | 'banners-mobile' | 'places', maxWidth = 2400): Promise<string> {
  if (file.size > 15 * 1024 * 1024) throw new Error('Image trop lourde (max 15 Mo).');
  const body = await shrink(file, maxWidth);
  const ext = body.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const { error } = await supabase.storage.from('banners').upload(path, body, {
    cacheControl: '31536000',
    upsert: false,
    contentType: body.type || file.type,
  });
  if (error) throw error;
  return supabase.storage.from('banners').getPublicUrl(path).data.publicUrl;
}
