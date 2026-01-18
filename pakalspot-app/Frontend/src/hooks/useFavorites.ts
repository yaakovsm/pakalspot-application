import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { spotsAPI } from '../api/api';
import { Spot } from '../types/spot';

const FAVORITES_IDS_QUERY_KEY = ['favorites', 'ids'];
const FAVORITES_LIST_QUERY_KEY = ['favorites', 'list'];

export const useFavorites = () => {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // Fetch favorites and extract IDs into a Set for O(1) lookup
  const { data: favoriteIds = new Set<string>() } = useQuery({
    queryKey: FAVORITES_IDS_QUERY_KEY,
    queryFn: async () => {
      const response = await spotsAPI.getFavorites();
      return new Set(response.data.map(spot => spot.id));
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 minutes - favorites don't change often
  });

  // Fetch full favorites list for the favorites page
  const { data: favoritesList = [] } = useQuery({
    queryKey: FAVORITES_LIST_QUERY_KEY,
    queryFn: async () => {
      const response = await spotsAPI.getFavorites();
      return response.data;
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Favorite mutation with optimistic update
  const favoriteMutation = useMutation({
    mutationFn: (spotId: string) => spotsAPI.favoriteSpot(spotId),
    onMutate: async (spotId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: FAVORITES_IDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: FAVORITES_LIST_QUERY_KEY });

      // Snapshot the previous values
      const previousIds = queryClient.getQueryData<Set<string>>(FAVORITES_IDS_QUERY_KEY);
      const previousList = queryClient.getQueryData<Spot[]>(FAVORITES_LIST_QUERY_KEY);

      // Optimistically update IDs
      queryClient.setQueryData<Set<string>>(FAVORITES_IDS_QUERY_KEY, (old = new Set()) => {
        const newSet = new Set(old);
        newSet.add(spotId);
        return newSet;
      });

      // Optimistically update list (we need to find the spot from somewhere)
      // For now, we'll just invalidate the list query on success
      // The list will be refetched automatically

      // Return a context object with the snapshotted values
      return { previousIds, previousList };
    },
    onError: (err, spotId, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousIds) {
        queryClient.setQueryData(FAVORITES_IDS_QUERY_KEY, context.previousIds);
      }
      if (context?.previousList) {
        queryClient.setQueryData(FAVORITES_LIST_QUERY_KEY, context.previousList);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: FAVORITES_IDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FAVORITES_LIST_QUERY_KEY });
    },
  });

  // Unfavorite mutation with optimistic update
  const unfavoriteMutation = useMutation({
    mutationFn: (spotId: string) => spotsAPI.unfavoriteSpot(spotId),
    onMutate: async (spotId) => {
      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: FAVORITES_IDS_QUERY_KEY });
      await queryClient.cancelQueries({ queryKey: FAVORITES_LIST_QUERY_KEY });

      // Snapshot the previous values
      const previousIds = queryClient.getQueryData<Set<string>>(FAVORITES_IDS_QUERY_KEY);
      const previousList = queryClient.getQueryData<Spot[]>(FAVORITES_LIST_QUERY_KEY);

      // Optimistically update IDs
      queryClient.setQueryData<Set<string>>(FAVORITES_IDS_QUERY_KEY, (old = new Set()) => {
        const newSet = new Set(old);
        newSet.delete(spotId);
        return newSet;
      });

      // Optimistically update list - remove the spot from the list
      queryClient.setQueryData<Spot[]>(FAVORITES_LIST_QUERY_KEY, (old = []) => 
        old.filter(spot => spot.id !== spotId)
      );

      // Return a context object with the snapshotted values
      return { previousIds, previousList };
    },
    onError: (err: any, spotId, context) => {
      // If it's a 404, the favorite doesn't exist, which is the desired state - treat as success
      if (err?.response?.status === 404) {
        // Don't rollback - the optimistic update was correct
        return;
      }
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousIds) {
        queryClient.setQueryData(FAVORITES_IDS_QUERY_KEY, context.previousIds);
      }
      if (context?.previousList) {
        queryClient.setQueryData(FAVORITES_LIST_QUERY_KEY, context.previousList);
      }
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we're in sync
      queryClient.invalidateQueries({ queryKey: FAVORITES_IDS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: FAVORITES_LIST_QUERY_KEY });
    },
  });

  return {
    favoriteIds,
    favorites: favoritesList, // Full favorites list for the favorites page
    isFavorited: (spotId: string) => favoriteIds.has(spotId),
    favoriteSpot: (spotId: string) => favoriteMutation.mutate(spotId),
    unfavoriteSpot: (spotId: string) => unfavoriteMutation.mutate(spotId),
    isLoading: favoriteMutation.isPending || unfavoriteMutation.isPending,
  };
};

