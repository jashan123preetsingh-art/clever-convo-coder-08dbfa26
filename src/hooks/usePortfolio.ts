import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface PortfolioPosition {
  id: string;
  symbol: string;
  entry_price: number;
  quantity: number;
  entry_date: string;
  exit_price: number | null;
  exit_date: string | null;
  notes: string | null;
  trade_type: string;
  status: string;
  created_at: string;
}

export function usePortfolio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: positions = [], isLoading } = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('portfolio_positions')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PortfolioPosition[];
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const addPosition = useMutation({
    mutationFn: async (pos: { symbol: string; entry_price: number; quantity: number; trade_type: string; notes?: string }) => {
      const { error } = await supabase.from('portfolio_positions').insert({
        user_id: user!.id,
        ...pos,
      });
      if (error) throw error;
    },
    onSuccess: (_, { symbol }) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast.success(`${symbol} added to portfolio`);
    },
    onError: () => toast.error('Failed to add position'),
  });

  const closePosition = useMutation({
    mutationFn: async ({ id, exit_price }: { id: string; exit_price: number }) => {
      const { error } = await supabase.from('portfolio_positions')
        .update({ exit_price, exit_date: new Date().toISOString(), status: 'closed' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
      toast.success('Position closed');
    },
  });

  const deletePosition = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('portfolio_positions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status === 'closed');

  return {
    positions, openPositions, closedPositions, isLoading,
    addPosition: addPosition.mutate,
    closePosition: closePosition.mutate,
    deletePosition: deletePosition.mutate,
  };
}
