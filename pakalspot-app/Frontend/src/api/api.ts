import axios, { AxiosResponse } from 'axios';
import {
  AuthResponse,
  CreateSpotRequest,
  LoginRequest,
  RegisterRequest,
  Spot,
  User,
  LocationSearchResponse,
  GeocodeResult,
} from '../types/spot';

type RuntimeEnv = {
  VITE_API_BASE_URL?: string;
  VITE_API_URL?: string;
};

const getRuntimeEnv = (): RuntimeEnv => {
  if (typeof window === 'undefined') return {};
  return ((window as any).__ENV as RuntimeEnv) || {};
};

const normalizeBaseUrl = (url: string): string => {
  const trimmed = url.trim();
  if (!trimmed) return '/api';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
};

const runtimeEnv = getRuntimeEnv();

export const API_BASE_URL = normalizeBaseUrl(
  runtimeEnv.VITE_API_BASE_URL ||
    runtimeEnv.VITE_API_URL ||
    ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) as string) ||
    ((typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) as string) ||
    '/api'
);

const isAbsoluteUrl = (value: string): boolean => /^https?:\/\//i.test(value);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getMediaUrl = (value: string | null | undefined): string => {
  if (!value) return '';

  const v = value.trim();
  if (!v) return '';

  if (isAbsoluteUrl(v)) return v;

  if (v.startsWith('/')) {
    if (typeof window === 'undefined') return v;
    return new URL(v, window.location.origin).toString();
  }

  return `${API_BASE_URL}/media/${encodeURIComponent(v)}`;
};

export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<AuthResponse>> => api.post('/auth/login', data),
  register: (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> => api.post('/auth/register', data),
  logout: (): Promise<AxiosResponse<void>> => api.post('/auth/logout'),
  getProfile: (): Promise<AxiosResponse<User>> => api.get('/auth/me'),
};

export const spotsAPI = {
  getSpots: (params?: {
    lat?: number;
    lng?: number;
    radius?: number;
    type?: string;
    sortBy?: string;
  }): Promise<AxiosResponse<Spot[]>> => api.get('/spots/', { params }),

  getSpot: (id: string): Promise<AxiosResponse<Spot>> => api.get(`/spots/${id}`),

  createSpot: (data: CreateSpotRequest): Promise<AxiosResponse<Spot>> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('type', data.type);
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());

    if (data.subtitle) formData.append('subtitle', data.subtitle);
    if (data.how_to_get_there) formData.append('how_to_get_there', data.how_to_get_there);
    if (data.locationName) formData.append('location_name', data.locationName);

    if (data.photos) {
      data.photos.forEach((photo) => formData.append('photos', photo));
    }

    return api.post('/spots/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  updateSpot: (id: string, data: Partial<CreateSpotRequest>): Promise<AxiosResponse<Spot>> =>
    api.patch(`/spots/${id}`, data),

  deleteSpot: (id: string): Promise<AxiosResponse<void>> => api.delete(`/spots/${id}`),

  likeSpot: (id: string, isLike: boolean): Promise<AxiosResponse<void>> =>
    api.post(`/spots/${id}/like`, { isLike }),

  favoriteSpot: (id: string): Promise<AxiosResponse<void>> => api.post(`/spots/${id}/favorite`),

  unfavoriteSpot: (id: string): Promise<AxiosResponse<void>> => api.delete(`/spots/${id}/favorite`),

  getFavorites: (): Promise<AxiosResponse<Spot[]>> => api.get('/spots/favorites'),

  searchLocations: (query: string, limit: number = 10): Promise<AxiosResponse<LocationSearchResponse>> =>
    api.get('/spots/search/locations', { params: { q: query, limit } }),

  geocodeLocation: (location: string): Promise<AxiosResponse<GeocodeResult>> =>
    api.get('/spots/geocode', { params: { location } }),

  reverseGeocode: (lat: number, lng: number): Promise<AxiosResponse<GeocodeResult>> =>
    api.get('/spots/reverse-geocode', { params: { lat, lng } }),
};

export default api;
