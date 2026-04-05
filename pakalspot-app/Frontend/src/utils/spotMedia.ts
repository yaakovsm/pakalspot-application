import { getMediaUrl } from '../api/api';
import type { Photo, Spot } from '../types/spot';

type PhotoRow = Photo & { thumbnail_url?: string };

export function resolvePhotoUrl(photo: Photo | undefined | null): string | null {
  if (!photo) return null;
  const p = photo as PhotoRow;
  const u = p.thumbnailUrl || p.thumbnail_url || p.url;
  return u ? getMediaUrl(u) : null;
}

export function resolveSpotCoverUrl(spot: Spot): string | null {
  return resolvePhotoUrl(spot.photos?.[0]);
}
