export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
  /** Set by API for the configured admin account */
  is_admin?: boolean;
}

export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption?: string;
  createdAt: string;
}

export interface Like {
  id: string;
  userId: string;
  spotId: string;
  isLike: boolean; // true for like, false for dislike
  createdAt: string;
}

export type SpotApprovalStatus = 'approved' | 'pending';

export interface Spot {
  id: string;
  title: string;
  description: string;
  subtitle?: string;
  how_to_get_there?: string;
  /** Optional English copy (admin-edited while pending); used when UI language is English */
  title_en?: string | null;
  description_en?: string | null;
  subtitle_en?: string | null;
  how_to_get_there_en?: string | null;
  location_name_en?: string | null;
  location_name?: string | null;
  spot_type: SpotType;
  lat: number;
  lon: number;
  /** Backend owner id (UUID string) */
  owner_id?: string;
  /** Moderation: pending spots are hidden from the map until approved */
  approval_status?: SpotApprovalStatus;
  /** Owner/admin only: submitted edits awaiting merge to published */
  has_pending_revision?: boolean;
  hasPendingRevision?: boolean;
  pending_revision?: Record<string, unknown> | null;
  pendingRevision?: Record<string, unknown> | null;
  createdBy?: User;
  photos?: Photo[];
  likes?: Like[];
  likeCount?: number;
  dislikeCount?: number;
  isFavorited?: boolean;
  userLike?: Like; // Current user's like/dislike
  distance?: number; // Distance from user's location
  popularity?: number;
  createdAt: string;
  updatedAt?: string;
}

export type SpotType =
  | 'waterfall'
  | 'spring'
  | 'viewpoint'
  | 'forest'
  | 'desert'
  | 'river'
  | 'lake'
  | 'beach'
  | 'park';

/** Map API/legacy string to a known SpotType for display when DB still has old values */
export const KNOWN_SPOT_TYPES: readonly SpotType[] = [
  'waterfall',
  'spring',
  'viewpoint',
  'forest',
  'desert',
  'river',
  'lake',
  'beach',
  'park',
] as const;

export function normalizeSpotType(raw: string | undefined | null): SpotType {
  const v = String(raw ?? '').toLowerCase();
  if ((KNOWN_SPOT_TYPES as readonly string[]).includes(v)) {
    return v as SpotType;
  }
  return 'viewpoint';
}


export interface SpotFilters {
  types: SpotType[];
  maxDistance?: number; // in km
  minPopularity?: number;
  sortBy: 'distance' | 'popularity' | 'newest' | 'oldest';
}

export interface CreateSpotRequest {
  title: string;
  description: string;
  subtitle?: string;
  how_to_get_there?: string;
  type: SpotType;
  latitude: number;
  longitude: number;
  locationName?: string;
  photos?: File[];
}

export interface LocationSearchResult {
  name: string;
  lat: number;
  lng: number;
  type: string;
  importance: number;
  address: string;
}

export interface LocationSearchResponse {
  results: LocationSearchResult[];
}

export interface GeocodeResult {
  name: string;
  lat: number;
  lng: number;
  address: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  display_name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}