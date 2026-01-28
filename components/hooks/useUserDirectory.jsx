import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useUserDirectory(userIds = null) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-directory', userIds ? JSON.stringify(userIds) : 'all'],
    queryFn: async () => {
      const response = await base44.functions.invoke('getUserDirectory', {
        userIds: userIds && userIds.length > 0 ? userIds : undefined
      });
      return response.data?.users || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 1
  });

  // Create a map for quick lookups
  const userById = (data || []).reduce((acc, user) => {
    acc[user.id] = user;
    return acc;
  }, {});

  // Helper to get display name
  const getDisplayName = (userId) => {
    const user = userById[userId];
    return user?.callsign || 'Unknown';
  };

  return {
    users: data || [],
    userById,
    getDisplayName,
    isLoading,
    error,
    isEmpty: !isLoading && (!data || data.length === 0)
  };
}