import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'features' | 'users'>('features');

  const { data: features = [] } = useQuery({
    queryKey: ['feature-locks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('feature_locks').select('*').order('feature_name');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: userRoles = [] } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('user_roles').select('*');
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const toggleFeature = useMutation({
    mutationFn: async ({ id, is_locked }: { id: string; is_locked: boolean }) => {
      const { error } = await supabase.from('feature_locks').update({ is_locked: !is_locked }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-locks'] });
      toast.success('Feature updated');
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const { error } = await supabase.from('profiles').update({ plan }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User plan updated');
    },
  });

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-3 md:p-6 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-lg md:text-xl font-black text-foreground tracking-wide">⚙️ ADMIN PANEL</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Manage features, users and access control</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4">
        {(['features', 'users'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab ? 'bg-primary/10 text-primary border border-primary/30' : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'}`}>
            {tab === 'features' ? '🔒 Feature Locks' : '👥 Users'}
          </button>
        ))}
      </div>

      {activeTab === 'features' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {features.map((f: any) => (
            <div key={f.id} className="t-card p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-foreground">{f.feature_name}</h3>
                  <span className={`text-[8px] px-1.5 py-0.5 rounded font-semibold ${f.required_plan === 'premium' ? 'bg-terminal-amber/10 text-terminal-amber' : 'bg-terminal-blue/10 text-terminal-blue'}`}>
                    {f.required_plan?.toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{f.description}</p>
              </div>
              <button
                onClick={() => toggleFeature.mutate({ id: f.id, is_locked: f.is_locked })}
                className={`ml-4 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex-shrink-0 ${f.is_locked ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-primary/10 text-primary border border-primary/20'}`}
              >
                {f.is_locked ? '🔒 LOCKED' : '🔓 UNLOCKED'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          <div className="t-card p-3 hidden md:grid grid-cols-4 gap-4 text-[10px] font-semibold text-muted-foreground uppercase">
            <span>User</span>
            <span>Email</span>
            <span>Plan</span>
            <span>Joined</span>
          </div>
          {users.map((u: any) => {
            const roles = userRoles.filter((r: any) => r.user_id === u.id).map((r: any) => r.role);
            return (
              <div key={u.id} className="t-card p-3 grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4 items-center">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                    {(u.full_name || u.email || '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{u.full_name || 'User'}</p>
                    {roles.includes('admin') && <span className="text-[8px] text-terminal-amber font-semibold">ADMIN</span>}
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                <select
                  value={u.plan || 'free'}
                  onChange={(e) => updatePlan.mutate({ userId: u.id, plan: e.target.value })}
                  className="bg-secondary border border-border rounded px-2 py-1 text-[10px] text-foreground w-fit"
                >
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
                <p className="text-[10px] text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            );
          })}
          {users.length === 0 && <p className="text-xs text-muted-foreground p-4">No users found</p>}
        </div>
      )}
    </div>
  );
}
