import { useMemo } from 'react';
import { useIndices } from '@/hooks/useStockData';
import { INDICES as MOCK_INDICES } from '@/data/mockData';
import type { IndexData } from '@/types/stock';

export function useIndicesWithFallback() {
  const { data: liveIndices, isLoading, isError, error, refetch } = useIndices();

  const indices: IndexData[] = useMemo(() => {
    if (liveIndices?.length > 0 && !liveIndices[0]?.error) return liveIndices;
    return MOCK_INDICES;
  }, [liveIndices]);

  const hasLiveData = liveIndices?.length > 0 && !liveIndices[0]?.error;
  const isUsingMockData = !hasLiveData && !isLoading;

  return { indices, hasLiveData, isLoading, isError, error, isUsingMockData, refetch };
}
