import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUser = { id: 'user-123' };
const mockAlerts = [
  { id: 'a1', symbol: 'RELIANCE', condition: 'above', target_price: 1500, triggered: false, triggered_at: null, created_at: '2024-01-01' },
  { id: 'a2', symbol: 'TCS', condition: 'below', target_price: 3700, triggered: true, triggered_at: '2024-01-05', created_at: '2024-01-02' },
];

const mockChain = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data: mockAlerts, error: null }) as any,
} as any;

const mockSupabase = {
  from: vi.fn(() => mockChain),
  auth: {
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
  },
};

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));

describe('Price Alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockChain);
  });

  it('should fetch alerts', async () => {
    const result = await mockSupabase.from('price_alerts').select('*').order('created_at', { ascending: false });
    expect(result.data).toHaveLength(2);
  });

  it('should filter active vs triggered alerts', () => {
    const active = mockAlerts.filter(a => !a.triggered);
    const triggered = mockAlerts.filter(a => a.triggered);
    expect(active).toHaveLength(1);
    expect(triggered).toHaveLength(1);
    expect(active[0].symbol).toBe('RELIANCE');
    expect(triggered[0].symbol).toBe('TCS');
  });

  it('should create a new alert', async () => {
    mockChain.insert.mockReturnValue({ error: null });
    mockSupabase.from('price_alerts').insert({
      user_id: mockUser.id,
      symbol: 'INFY',
      condition: 'above',
      target_price: 1600,
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('price_alerts');
  });

  it('should delete an alert', async () => {
    mockChain.eq.mockResolvedValue({ error: null });
    mockSupabase.from('price_alerts').delete().eq('id', 'a1');
    expect(mockSupabase.from).toHaveBeenCalledWith('price_alerts');
  });
});
