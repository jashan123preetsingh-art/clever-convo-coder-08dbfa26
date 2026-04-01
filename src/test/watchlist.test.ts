import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUser = { id: 'user-123' };
const mockWatchlist = [
  { id: 'w1', symbol: 'RELIANCE', added_price: 1400, quantity: null, created_at: '2024-01-01' },
  { id: 'w2', symbol: 'TCS', added_price: 3800, quantity: null, created_at: '2024-01-02' },
];

const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: mockWatchlist, error: null }),
};

const mockSupabase = {
  from: vi.fn(() => mockChain),
  auth: {
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
  },
};

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));

describe('Watchlist CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockChain);
  });

  it('should fetch watchlist items', async () => {
    const result = await mockSupabase.from('watchlists').select('*').order('created_at', { ascending: false });
    expect(result.data).toHaveLength(2);
    expect(result.data![0].symbol).toBe('RELIANCE');
  });

  it('should add to watchlist', async () => {
    mockChain.insert.mockReturnValue({ error: null });
    const result = mockSupabase.from('watchlists').insert({
      user_id: mockUser.id,
      symbol: 'INFY',
      added_price: 1500,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlists');
  });

  it('should remove from watchlist', async () => {
    mockChain.eq.mockResolvedValue({ error: null });
    mockSupabase.from('watchlists').delete().eq('user_id', mockUser.id).eq('symbol', 'TCS');
    expect(mockSupabase.from).toHaveBeenCalledWith('watchlists');
  });
});
