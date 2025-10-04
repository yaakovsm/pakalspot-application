export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  createdAt: string;
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

export interface Spot {
  id: string;
  title: string;
  description: string;
  spot_type: SpotType;
  lat: number;
  lon: number;
  region: IsraeliRegion;
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

export type IsraeliRegion = 
  | 'negev'
  | 'galilee'
  | 'golan'
  | 'shfela'
  | 'sharon'
  | 'shomron'
  | 'jerusalem'
  | 'arava';

export interface SpotFilters {
  types: SpotType[];
  region?: IsraeliRegion;
  maxDistance?: number; // in km
  minPopularity?: number;
  sortBy: 'distance' | 'popularity' | 'newest' | 'oldest';
}

export interface CreateSpotRequest {
  title: string;
  description: string;
  type: SpotType;
  latitude: number;
  longitude: number;
  region: IsraeliRegion;
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
  region: string;
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