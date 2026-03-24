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
  spot_type: SpotType;
  lat: number;
  lon: number;
  /** Backend owner id (UUID string) */
  owner_id?: string;
  /** Moderation: pending spots are hidden from the map until approved */
  approval_status?: SpotApprovalStatus;
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
  | 'beach'
  | 'lake'
  | 'river'
  | 'cave'
  | 'park'
  | 'forest'
  | 'historical'
  | 'archaeological'
  | 'religious'
  | 'restaurant'
  | 'cafe'
  | 'camping'
  | 'other';


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