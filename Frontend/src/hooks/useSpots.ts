import { create } from 'zustand';
import { Spot, SpotFilters, CreateSpotRequest } from '../types/spot';
import { spotsAPI } from '../api/api';

interface SpotsState {
  spots: Spot[];
  selectedSpot: Spot | null;
  favorites: Spot[];
  filters: SpotFilters;
  isLoading: boolean;
  userLocation: { lat: number; lng: number } | null;
  
  // Actions
  fetchSpots: () => Promise<void>;
  selectSpot: (spot: Spot | null) => void;
  createSpot: (data: CreateSpotRequest) => Promise<Spot>;
  likeSpot: (spotId: string, isLike: boolean) => Promise<void>;
  favoriteSpot: (spotId: string) => Promise<void>;
  unfavoriteSpot: (spotId: string) => Promise<void>;
  fetchFavorites: () => Promise<void>;
  updateFilters: (filters: Partial<SpotFilters>) => void;
  setUserLocation: (location: { lat: number; lng: number }) => void;
}

export const useSpotsStore = create<SpotsState>((set, get) => ({
  spots: [],
  selectedSpot: null,
  favorites: [],
  filters: {
    types: [],
    sortBy: 'distance',
  },
  isLoading: false,
  userLocation: null,

  fetchSpots: async () => {
    try {
      set({ isLoading: true });
      const { filters, userLocation } = get();
      
      const params: any = {};
      if (userLocation) {
        params.lat = userLocation.lat;
        params.lng = userLocation.lng;
      }
      if (filters.maxDistance) {
        params.radius = filters.maxDistance;
      }
      if (filters.types.length > 0) {
        params.type = filters.types.join(',');
      }
      if (filters.region) {
        params.region = filters.region;
      }
      params.sortBy = filters.sortBy;

      const response = await spotsAPI.getSpots(params);
      set({ spots: response.data, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      console.error('Failed to fetch spots:', error);
    }
  },

  selectSpot: (spot: Spot | null) => {
    set({ selectedSpot: spot });
  },

  createSpot: async (data: CreateSpotRequest) => {
    try {
      const response = await spotsAPI.createSpot(data);
      const newSpot = response.data;
      
      set((state) => ({
        spots: [newSpot, ...state.spots],
      }));
      
      return newSpot;
    } catch (error) {
      console.error('Failed to create spot:', error);
      throw error;
    }
  },

  likeSpot: async (spotId: string, isLike: boolean) => {
    try {
      await spotsAPI.likeSpot(spotId, isLike);
      
      set((state) => ({
        spots: state.spots.map((spot) =>
          spot.id === spotId
            ? {
                ...spot,
                userLike: { id: 'temp', userId: 'temp', spotId, isLike, createdAt: new Date().toISOString() },
                likeCount: isLike ? spot.likeCount + 1 : spot.likeCount,
                dislikeCount: !isLike ? spot.dislikeCount + 1 : spot.dislikeCount,
              }
            : spot
        ),
        selectedSpot: state.selectedSpot?.id === spotId
          ? {
              ...state.selectedSpot,
              userLike: { id: 'temp', userId: 'temp', spotId, isLike, createdAt: new Date().toISOString() },
              likeCount: isLike ? state.selectedSpot.likeCount + 1 : state.selectedSpot.likeCount,
              dislikeCount: !isLike ? state.selectedSpot.dislikeCount + 1 : state.selectedSpot.dislikeCount,
            }
          : state.selectedSpot,
      }));
    } catch (error) {
      console.error('Failed to like/dislike spot:', error);
    }
  },

  favoriteSpot: async (spotId: string) => {
    try {
      await spotsAPI.favoriteSpot(spotId);
      
      set((state) => ({
        spots: state.spots.map((spot) =>
          spot.id === spotId ? { ...spot, isFavorited: true } : spot
        ),
        selectedSpot: state.selectedSpot?.id === spotId
          ? { ...state.selectedSpot, isFavorited: true }
          : state.selectedSpot,
      }));
    } catch (error) {
      console.error('Failed to favorite spot:', error);
    }
  },

  unfavoriteSpot: async (spotId: string) => {
    try {
      await spotsAPI.unfavoriteSpot(spotId);
      
      set((state) => ({
        spots: state.spots.map((spot) =>
          spot.id === spotId ? { ...spot, isFavorited: false } : spot
        ),
        selectedSpot: state.selectedSpot?.id === spotId
          ? { ...state.selectedSpot, isFavorited: false }
          : state.selectedSpot,
        favorites: state.favorites.filter((spot) => spot.id !== spotId),
      }));
    } catch (error) {
      console.error('Failed to unfavorite spot:', error);
    }
  },

  fetchFavorites: async () => {
    try {
      const response = await spotsAPI.getFavorites();
      set({ favorites: response.data });
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
    }
  },

  updateFilters: (newFilters: Partial<SpotFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    
    // Auto-fetch with new filters
    get().fetchSpots();
  },

  setUserLocation: (location: { lat: number; lng: number }) => {
    set({ userLocation: location });
  },
}));

export const useSpots = () => {
  const {
    spots,
    selectedSpot,
    favorites,
    filters,
    isLoading,
    userLocation,
    fetchSpots,
    selectSpot,
    createSpot,
    likeSpot,
    favoriteSpot,
    unfavoriteSpot,
    fetchFavorites,
    updateFilters,
    setUserLocation,
  } = useSpotsStore();

  return {
    spots,
    selectedSpot,
    favorites,
    filters,
    isLoading,
    userLocation,
    fetchSpots,
    selectSpot,
    createSpot,
    likeSpot,
    favoriteSpot,
    unfavoriteSpot,
    fetchFavorites,
    updateFilters,
    setUserLocation,
  };
};