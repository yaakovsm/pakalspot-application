import axios, { AxiosResponse } from 'axios';
import { AuthResponse, CreateSpotRequest, LoginRequest, RegisterRequest, Spot, User, LocationSearchResponse, GeocodeResult } from '../types/spot';

// Environment-driven API configuration
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  '/api';
  
// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiration
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

// Auth API
export const authAPI = {
  login: (data: LoginRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/login', data),
  
  register: (data: RegisterRequest): Promise<AxiosResponse<AuthResponse>> =>
    api.post('/auth/register', data),
  
  logout: (): Promise<AxiosResponse<void>> =>
    api.post('/auth/logout'),
  
  getProfile: (): Promise<AxiosResponse<User>> =>
    api.get('/auth/me'),
};

// Spots API
export const spotsAPI = {
  getSpots: (params?: {
    lat?: number;
    lng?: number;
    radius?: number;
    type?: string;
    sortBy?: string;
  }): Promise<AxiosResponse<Spot[]>> =>
    api.get('/spots', { params }),
  
  getSpot: (id: string): Promise<AxiosResponse<Spot>> =>
    api.get(`/spots/${id}`),
  
  createSpot: (data: CreateSpotRequest): Promise<AxiosResponse<Spot>> => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('type', data.type);
    formData.append('latitude', data.latitude.toString());
    formData.append('longitude', data.longitude.toString());
    
    if (data.locationName) {
      formData.append('location_name', data.locationName);
    }
    
    if (data.photos) {
      data.photos.forEach((photo) => {
        formData.append('photos', photo);
      });
    }
    
    return api.post('/spots', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  updateSpot: (id: string, data: Partial<CreateSpotRequest>): Promise<AxiosResponse<Spot>> =>
    api.patch(`/spots/${id}`, data),
  
  deleteSpot: (id: string): Promise<AxiosResponse<void>> =>
    api.delete(`/spots/${id}`),
  
  likeSpot: (id: string, isLike: boolean): Promise<AxiosResponse<void>> =>
    api.post(`/spots/${id}/like`, { isLike }),
  
  favoriteSpot: (id: string): Promise<AxiosResponse<void>> =>
    api.post(`/spots/${id}/favorite`),
  
  unfavoriteSpot: (id: string): Promise<AxiosResponse<void>> =>
    api.delete(`/spots/${id}/favorite`),
  
  getFavorites: (): Promise<AxiosResponse<Spot[]>> =>
    api.get('/spots/favorites'),
  
  searchLocations: (query: string, limit: number = 10): Promise<AxiosResponse<LocationSearchResponse>> =>
    api.get('/spots/search/locations', { params: { q: query, limit } }),
  
  geocodeLocation: (location: string): Promise<AxiosResponse<GeocodeResult>> =>
    api.get('/spots/geocode', { params: { location } }),
  
  reverseGeocode: (lat: number, lng: number): Promise<AxiosResponse<GeocodeResult>> =>
    api.get('/spots/reverse-geocode', { params: { lat, lng } }),
};

export default api;