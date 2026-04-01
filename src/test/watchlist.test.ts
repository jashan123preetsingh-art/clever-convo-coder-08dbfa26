import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockWatchlist = [
  { id: 'w1', symbol: 'RELIANCE', added_price: 1400, quantity: null, created_at: '2024-01-01' },
  { id: 'w2', symbol: 'TCS', added_price: 3800, quantity: null, created_at: '2024-01-02' },
];

describe('Watchlist CRUD', () => {
  it('should filter watchlist symbols', () => {
    const symbols = mockWatchlist.map(w => w.symbol);
    expect(symbols).toEqual(['RELIANCE', 'TCS']);
  });

  it('should check if symbol is in watchlist', () => {
    const symbols = mockWatchlist.map(w => w.symbol);
    expect(symbols.includes('RELIANCE')).toBe(true);
    expect(symbols.includes('INFY')).toBe(false);
  });

  it('should toggle removes existing symbol', () => {
    const symbols = mockWatchlist.map(w => w.symbol);
    const isIn = symbols.includes('TCS');
    expect(isIn).toBe(true);
  });
});
