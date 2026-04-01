import { describe, it, expect } from 'vitest';

const mockAlerts = [
  { id: 'a1', symbol: 'RELIANCE', condition: 'above', target_price: 1500, triggered: false, triggered_at: null },
  { id: 'a2', symbol: 'TCS', condition: 'below', target_price: 3700, triggered: true, triggered_at: '2024-01-05' },
];

describe('Price Alerts', () => {
  it('should filter active vs triggered alerts', () => {
    const active = mockAlerts.filter(a => !a.triggered);
    const triggered = mockAlerts.filter(a => a.triggered);
    expect(active).toHaveLength(1);
    expect(triggered).toHaveLength(1);
    expect(active[0].symbol).toBe('RELIANCE');
    expect(triggered[0].symbol).toBe('TCS');
  });

  it('should validate alert conditions', () => {
    const alert = mockAlerts[0];
    const currentPrice = 1550;
    const shouldTrigger = alert.condition === 'above' && currentPrice > alert.target_price;
    expect(shouldTrigger).toBe(true);
  });

  it('should not trigger below condition when price is above', () => {
    const alert = mockAlerts[1];
    const currentPrice = 3800;
    const shouldTrigger = alert.condition === 'below' && currentPrice < alert.target_price;
    expect(shouldTrigger).toBe(false);
  });
});
