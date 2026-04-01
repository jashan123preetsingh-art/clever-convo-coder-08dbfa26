import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockSupabase = {
  auth: {
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    getSession: vi.fn(() => Promise.resolve({ data: { session: null } })),
  },
  from: vi.fn(),
};

vi.mock('@/integrations/supabase/client', () => ({ supabase: mockSupabase }));

describe('Auth Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should sign in with email and password', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: '123', email: 'test@test.com' }, session: {} },
      error: null,
    });

    const result = await mockSupabase.auth.signInWithPassword({ email: 'test@test.com', password: 'password123' });
    expect(result.error).toBeNull();
    expect(result.data.user.email).toBe('test@test.com');
  });

  it('should return error for wrong password', async () => {
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const result = await mockSupabase.auth.signInWithPassword({ email: 'test@test.com', password: 'wrong' });
    expect(result.error).not.toBeNull();
    expect(result.error.message).toBe('Invalid login credentials');
  });

  it('should sign up a new user', async () => {
    mockSupabase.auth.signUp.mockResolvedValue({
      data: { user: { id: '456', email: 'new@test.com' }, session: null },
      error: null,
    });

    const result = await mockSupabase.auth.signUp({ email: 'new@test.com', password: 'password123' });
    expect(result.error).toBeNull();
    expect(result.data.user.email).toBe('new@test.com');
  });

  it('should sign out', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });
    const result = await mockSupabase.auth.signOut();
    expect(result.error).toBeNull();
  });

  it('should send password reset email', async () => {
    mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });
    const result = await mockSupabase.auth.resetPasswordForEmail('test@test.com', {
      redirectTo: 'http://localhost/reset-password',
    });
    expect(result.error).toBeNull();
  });
});
