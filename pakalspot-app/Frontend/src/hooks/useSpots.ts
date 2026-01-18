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
      params.sortBy = filters.sortBy;

      const response = await spotsAPI.getSpots(params);
      // Ensure response.data is an array
      const spotsData = Array.isArray(response.data) ? response.data : [];
      set({ spots: spotsData, isLoading: false });
    } catch (error) {
      set({ spots: [], isLoading: false });
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

  // Note: favoriteSpot and unfavoriteSpot are now handled by useFavorites hook (React Query)
  // These actions are kept for backward compatibility but should not be used directly
  // Use useFavorites hook instead for all favorite operations
  favoriteSpot: async (spotId: string) => {
    // Deprecated: Use useFavorites hook instead
    console.warn('favoriteSpot from useSpots is deprecated. Use useFavorites hook instead.');
    await spotsAPI.favoriteSpot(spotId);
  },

  unfavoriteSpot: async (spotId: string) => {
    // Deprecated: Use useFavorites hook instead
    console.warn('unfavoriteSpot from useSpots is deprecated. Use useFavorites hook instead.');
    await spotsAPI.unfavoriteSpot(spotId);
  },

  fetchFavorites: async () => {
    try {
      const response = await spotsAPI.getFavorites();
      // Fetch full spot data for favorites page display
      // Note: Favorite state (isFavorited) is now managed by useFavorites hook (React Query)
      // This function only fetches the full spot objects for display purposes
      set({ favorites: response.data });
    } catch (error) {
      console.error('Failed to fetch favorites:', error);
      // Don't clear favorites on error - preserve existing state
      // This prevents favorites from disappearing on refresh if API fails
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