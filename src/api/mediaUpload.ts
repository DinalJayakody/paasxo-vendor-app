/** A picked photo/video, as returned by expo-image-picker. */
export interface PickedMedia {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  type?: 'image' | 'video' | 'livePhoto' | 'pairedVideo' | null;
}

/** Uploads can be large videos — give them far longer than the default 15s. */
export const MEDIA_UPLOAD_TIMEOUT_MS = 180_000;

/**
 * Multipart "file" part for a gallery upload. The backend only accepts
 * jpeg/png/webp/gif images and mp4/quicktime/webm videos (it re-encodes both),
 * so anything else is labelled to the closest accepted type.
 */
export function mediaFilePart(m: PickedMedia) {
  const isVideo = m.type === 'video' || (m.mimeType ?? '').startsWith('video/');
  const ext = (m.uri.split('?')[0].split('.').pop() ?? '').toLowerCase();
  let type = m.mimeType ?? '';
  if (isVideo) {
    if (!['video/mp4', 'video/quicktime', 'video/webm'].includes(type)) type = ext === 'mp4' ? 'video/mp4' : 'video/quicktime';
  } else if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) {
    type = 'image/jpeg';
  }
  const fallback = `${isVideo ? 'video' : 'photo'}-${Date.now()}.${isVideo ? (type === 'video/mp4' ? 'mp4' : 'mov') : 'jpg'}`;
  return { uri: m.uri, name: m.fileName || m.uri.split('/').pop() || fallback, type } as unknown as Blob;
}
