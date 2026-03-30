import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Lock, Users, CreditCard, BarChart3,
  Shield, Crown, Zap, TrendingUp, UserCheck, AlertTriangle,
  CheckCircle2, XCircle, Search, ChevronDown, Settings,
  Eye, EyeOff, IndianRupee, Star, Sparkles, Activity,
  Plus, Pencil, Trash2, X, Save
} from 'lucide-react';

type AdminTab = 'dashboard' | 'features' | 'users' | 'pricing' | 'analytics';

const PLAN_CONFIG = {
  free: { label: 'Free', color: 'text-muted-foreground', bg: 'bg-muted/50', icon: Zap, price: 0 },
  pro: { label: 'Pro', color: 'text-primary', bg: 'bg-primary/10', icon: Star, price: 999 },
  premium: { label: 'Premium', color: 'text-terminal-amber', bg: 'bg-terminal-amber/10', icon: Crown, price: 2499 },
};

const TABS: { key: AdminTab; label: string; icon: React.ElementType }[] = [
  { key: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { key: 'features', label: 'Features', icon: Lock },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'pricing', label: 'Pricing', icon: CreditCard },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
];

export default function Admin() {
  const { user, isAdmin, loading, roleLoading } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [userSearch, setUserSearch] = useState('');

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
      toast.success('Feature toggled');
    },
  });

  const createFeature = useMutation({
    mutationFn: async (data: { feature_key: string; feature_name: string; description: string; required_plan: string }) => {
      const { error } = await supabase.from('feature_locks').insert({ ...data, is_locked: true });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-locks'] });
      toast.success('Feature created');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateFeature = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; feature_name: string; description: string; required_plan: string; feature_key: string }) => {
      const { error } = await supabase.from('feature_locks').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-locks'] });
      toast.success('Feature updated');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteFeature = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('feature_locks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-locks'] });
      toast.success('Feature deleted');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updatePlan = useMutation({
    mutationFn: async ({ userId, plan }: { userId: string; plan: string }) => {
      const { error } = await supabase.from('profiles').update({ plan }).eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Plan updated');
    },
  });

  // Computed stats
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const proUsers = users.filter((u: any) => u.plan === 'pro').length;
    const premiumUsers = users.filter((u: any) => u.plan === 'premium').length;
    const freeUsers = users.filter((u: any) => !u.plan || u.plan === 'free').length;
    const lockedFeatures = features.filter((f: any) => f.is_locked).length;
    const unlockedFeatures = features.filter((f: any) => !f.is_locked).length;
    const admins = userRoles.filter((r: any) => r.role === 'admin').length;
    const todayUsers = users.filter((u: any) => {
      const d = new Date(u.created_at);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    }).length;
    const mrr = proUsers * 999 + premiumUsers * 2499;
    return { totalUsers, proUsers, premiumUsers, freeUsers, lockedFeatures, unlockedFeatures, admins, todayUsers, mrr };
  }, [users, features, userRoles]);

  const filteredUsers = useMemo(() => {
    if (!userSearch) return users;
    const q = userSearch.toLowerCase();
    return users.filter((u: any) =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.plan || '').toLowerCase().includes(q)
    );
  }, [users, userSearch]);

  if (loading || roleLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-3 md:p-6 max-w-[1600px] mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <h1 className="text-base md:text-lg font-black text-foreground tracking-wide">ADMIN CONTROL CENTER</h1>
              <p className="text-[10px] text-muted-foreground">Trade Arsenal Terminal • System Management</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground hidden md:inline">Logged in as</span>
          <span className="text-[10px] font-semibold text-primary bg-primary/10 px-2 py-1 rounded-lg border border-primary/20">
            {user.email}
          </span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3 md:px-4 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap border ${
                isActive
                  ? 'bg-primary/10 text-primary border-primary/30 shadow-sm shadow-primary/5'
                  : 'bg-secondary/50 text-muted-foreground border-border/50 hover:text-foreground hover:bg-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'dashboard' && <DashboardTab stats={stats} />}
          {activeTab === 'features' && <FeaturesTab features={features} toggleFeature={toggleFeature} createFeature={createFeature} updateFeature={updateFeature} deleteFeature={deleteFeature} />}
          {activeTab === 'users' && (
            <UsersTab
              users={filteredUsers}
              userRoles={userRoles}
              userSearch={userSearch}
              setUserSearch={setUserSearch}
              updatePlan={updatePlan}
              totalCount={users.length}
            />
          )}
          {activeTab === 'pricing' && <PricingTab stats={stats} />}
          {activeTab === 'analytics' && <AnalyticsTab stats={stats} users={users} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ─── STAT CARD ─── */
function StatCard({ icon: Icon, label, value, sub, accent = false }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 transition-all ${accent ? 'bg-primary/5 border-primary/20' : 'bg-card border-border/60'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${accent ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-xl font-black ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

/* ─── DASHBOARD TAB ─── */
function DashboardTab({ stats }: { stats: any }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`+${stats.todayUsers} today`} accent />
        <StatCard icon={IndianRupee} label="Est. MRR" value={`₹${stats.mrr.toLocaleString('en-IN')}`} sub={`${stats.proUsers} Pro + ${stats.premiumUsers} Premium`} />
        <StatCard icon={Lock} label="Features" value={`${stats.unlockedFeatures}/${stats.lockedFeatures + stats.unlockedFeatures}`} sub={`${stats.lockedFeatures} locked`} />
        <StatCard icon={Shield} label="Admins" value={stats.admins} sub="With full access" />
      </div>

      {/* Plan distribution bar */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">Plan Distribution</h3>
        <div className="flex rounded-full overflow-hidden h-3 bg-muted">
          {stats.totalUsers > 0 && (
            <>
              <div className="bg-muted-foreground/40 h-full transition-all" style={{ width: `${(stats.freeUsers / stats.totalUsers) * 100}%` }} />
              <div className="bg-primary h-full transition-all" style={{ width: `${(stats.proUsers / stats.totalUsers) * 100}%` }} />
              <div className="bg-terminal-amber h-full transition-all" style={{ width: `${(stats.premiumUsers / stats.totalUsers) * 100}%` }} />
            </>
          )}
        </div>
        <div className="flex gap-4 mt-2">
          {[
            { label: 'Free', count: stats.freeUsers, cls: 'bg-muted-foreground/40' },
            { label: 'Pro', count: stats.proUsers, cls: 'bg-primary' },
            { label: 'Premium', count: stats.premiumUsers, cls: 'bg-terminal-amber' },
          ].map(p => (
            <div key={p.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${p.cls}`} />
              <span className="text-[10px] text-muted-foreground">{p.label}: <span className="text-foreground font-semibold">{p.count}</span></span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { icon: Lock, title: 'Feature Gates', desc: 'Control which features are available per plan', tab: 'features' },
          { icon: Users, title: 'User Management', desc: 'View, search and manage user subscriptions', tab: 'users' },
          { icon: CreditCard, title: 'Pricing Config', desc: 'Configure plan tiers, features and pricing', tab: 'pricing' },
        ].map(item => (
          <div key={item.tab} className="rounded-xl border border-border/60 bg-card p-4 hover:border-primary/30 transition-all cursor-default group">
            <div className="flex items-center gap-2 mb-1.5">
              <item.icon className="w-4 h-4 text-primary" />
              <h4 className="text-xs font-bold text-foreground">{item.title}</h4>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── FEATURES TAB ─── */
function FeaturesTab({ features, toggleFeature }: { features: any[]; toggleFeature: any }) {
  const locked = features.filter((f: any) => f.is_locked);
  const unlocked = features.filter((f: any) => !f.is_locked);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Feature Access Control</h2>
        <div className="flex gap-2">
          <span className="text-[9px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">{unlocked.length} active</span>
          <span className="text-[9px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-semibold">{locked.length} locked</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {features.map((f: any) => (
          <motion.div
            key={f.id}
            layout
            className={`rounded-xl border p-4 transition-all ${
              f.is_locked ? 'bg-card border-border/60' : 'bg-primary/[0.03] border-primary/20'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {f.is_locked ? <XCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0" /> : <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                  <h3 className="text-xs font-bold text-foreground truncate">{f.feature_name}</h3>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed ml-5.5">{f.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                f.required_plan === 'premium' ? 'bg-terminal-amber/10 text-terminal-amber border border-terminal-amber/20' :
                f.required_plan === 'pro' ? 'bg-primary/10 text-primary border border-primary/20' :
                'bg-muted text-muted-foreground border border-border'
              }`}>
                {f.required_plan || 'free'}
              </span>
              <button
                onClick={() => toggleFeature.mutate({ id: f.id, is_locked: f.is_locked })}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                  f.is_locked
                    ? 'bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20'
                    : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                }`}
              >
                {f.is_locked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {f.is_locked ? 'LOCKED' : 'ACTIVE'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {features.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Lock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">No features configured yet</p>
        </div>
      )}
    </div>
  );
}

/* ─── USERS TAB ─── */
function UsersTab({ users, userRoles, userSearch, setUserSearch, updatePlan, totalCount }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-foreground">User Management</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="bg-secondary border border-border rounded-lg pl-7 pr-3 py-1.5 text-[11px] text-foreground w-48 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/30 placeholder:text-muted-foreground/60"
            />
          </div>
          <span className="text-[9px] text-muted-foreground bg-muted px-2 py-1 rounded-lg">
            {users.length}{users.length !== totalCount ? ` / ${totalCount}` : ''} users
          </span>
        </div>
      </div>

      {/* Header */}
      <div className="hidden md:grid grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-3 px-4 py-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
        <span>User</span>
        <span>Email</span>
        <span>Role</span>
        <span>Plan</span>
        <span>Joined</span>
      </div>

      <div className="space-y-1.5">
        {users.map((u: any) => {
          const roles = userRoles.filter((r: any) => r.user_id === u.id).map((r: any) => r.role);
          const planKey = (u.plan || 'free') as keyof typeof PLAN_CONFIG;
          const plan = PLAN_CONFIG[planKey] || PLAN_CONFIG.free;
          const PlanIcon = plan.icon;

          return (
            <div key={u.id} className="grid grid-cols-1 md:grid-cols-[2fr_2fr_1fr_1fr_1fr] gap-2 md:gap-3 items-center rounded-xl border border-border/50 bg-card px-4 py-3 hover:border-border transition-all">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center text-primary text-[11px] font-black flex-shrink-0">
                  {(u.full_name || u.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{u.full_name || 'Unnamed'}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground truncate font-mono">{u.email}</p>
              <div className="flex gap-1 flex-wrap">
                {roles.map((r: string) => (
                  <span key={r} className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    r === 'admin' ? 'bg-terminal-amber/10 text-terminal-amber border border-terminal-amber/20' :
                    r === 'moderator' ? 'bg-terminal-blue/10 text-terminal-blue border border-terminal-blue/20' :
                    'bg-muted text-muted-foreground border border-border/50'
                  }`}>{r}</span>
                ))}
              </div>
              <select
                value={u.plan || 'free'}
                onChange={(e) => updatePlan.mutate({ userId: u.id, plan: e.target.value })}
                className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-[10px] text-foreground font-semibold w-full md:w-fit cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/30"
              >
                <option value="free">🆓 Free</option>
                <option value="pro">⭐ Pro</option>
                <option value="premium">👑 Premium</option>
              </select>
              <p className="text-[10px] text-muted-foreground">
                {new Date(u.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
              </p>
            </div>
          );
        })}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-xs">{userSearch ? 'No users match your search' : 'No users found'}</p>
        </div>
      )}
    </div>
  );
}

/* ─── PRICING TAB ─── */
function PricingTab({ stats }: { stats: any }) {
  const plans = [
    {
      key: 'free',
      name: 'Free',
      price: 0,
      icon: Zap,
      color: 'text-muted-foreground',
      border: 'border-border/60',
      bg: 'bg-card',
      users: stats.freeUsers,
      features: ['Market Dashboard', 'Basic Watchlist (5 stocks)', 'Daily Market Brief', 'Basic Scanner'],
      limits: ['No Options Chain', 'No AI Analysis', 'No Trading Agent', 'Limited Screener'],
    },
    {
      key: 'pro',
      name: 'Pro',
      price: 999,
      icon: Star,
      color: 'text-primary',
      border: 'border-primary/30',
      bg: 'bg-primary/[0.03]',
      popular: true,
      users: stats.proUsers,
      features: ['Everything in Free', 'Full Options Chain', 'OI Analysis', 'AI Stock Analysis', 'Advanced Screener', 'Price Alerts (20)', 'Unlimited Watchlist'],
      limits: ['No Trading Agent', 'No Priority Support'],
    },
    {
      key: 'premium',
      name: 'Premium',
      price: 2499,
      icon: Crown,
      color: 'text-terminal-amber',
      border: 'border-terminal-amber/30',
      bg: 'bg-terminal-amber/[0.03]',
      users: stats.premiumUsers,
      features: ['Everything in Pro', 'AI Trading Agent', 'FII/DII Live Data', 'Sector Heatmaps', 'VWAP Scanner', 'Priority Support', 'Early Access Features', 'Unlimited Alerts'],
      limits: [],
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold text-foreground">Pricing & Plan Configuration</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">Manage subscription tiers and feature access for each plan</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-foreground">₹{stats.mrr.toLocaleString('en-IN')}</p>
          <p className="text-[9px] text-muted-foreground">Estimated MRR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(plan => {
          const Icon = plan.icon;
          return (
            <div key={plan.key} className={`rounded-2xl border ${plan.border} ${plan.bg} p-5 relative transition-all`}>
              {plan.popular && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span className="text-[8px] bg-primary text-primary-foreground px-3 py-1 rounded-full font-bold uppercase tracking-widest">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl ${plan.bg} border ${plan.border} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${plan.color}`} />
                </div>
                <div>
                  <h3 className={`text-sm font-black ${plan.color}`}>{plan.name}</h3>
                  <p className="text-[9px] text-muted-foreground">{plan.users} active users</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex items-baseline gap-0.5">
                  {plan.price > 0 && <span className="text-[10px] text-muted-foreground">₹</span>}
                  <span className="text-2xl font-black text-foreground">{plan.price === 0 ? 'Free' : plan.price.toLocaleString('en-IN')}</span>
                  {plan.price > 0 && <span className="text-[10px] text-muted-foreground">/mo</span>}
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Included</p>
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="text-[10px] text-foreground">{f}</span>
                  </div>
                ))}
              </div>

              {plan.limits.length > 0 && (
                <div className="space-y-1.5 pt-2 border-t border-border/30">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-2">Not included</p>
                  {plan.limits.map(l => (
                    <div key={l} className="flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                      <span className="text-[10px] text-muted-foreground">{l}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── ANALYTICS TAB ─── */
function AnalyticsTab({ stats, users }: { stats: any; users: any[] }) {
  // Signup trends (last 7 days)
  const last7Days = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toDateString();
      const count = users.filter((u: any) => new Date(u.created_at).toDateString() === dateStr).length;
      days.push({ label: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), count });
    }
    return days;
  }, [users]);

  const maxSignups = Math.max(...last7Days.map(d => d.count), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={TrendingUp} label="Conversion Rate" value={`${stats.totalUsers > 0 ? (((stats.proUsers + stats.premiumUsers) / stats.totalUsers) * 100).toFixed(1) : 0}%`} sub="Free → Paid" accent />
        <StatCard icon={UserCheck} label="Paid Users" value={stats.proUsers + stats.premiumUsers} sub={`of ${stats.totalUsers} total`} />
        <StatCard icon={Activity} label="New Today" value={stats.todayUsers} sub="Signups" />
        <StatCard icon={IndianRupee} label="ARPU" value={`₹${stats.totalUsers > 0 ? Math.round(stats.mrr / stats.totalUsers) : 0}`} sub="Per user/month" />
      </div>

      {/* Signup chart */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="text-xs font-semibold text-foreground mb-4">Signups — Last 7 Days</h3>
        <div className="flex items-end gap-2 h-28">
          {last7Days.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-foreground">{day.count}</span>
              <div className="w-full rounded-t-md bg-primary/20 relative overflow-hidden" style={{ height: `${(day.count / maxSignups) * 100}%`, minHeight: day.count > 0 ? 4 : 2 }}>
                <div className="absolute inset-0 bg-primary/60 rounded-t-md" />
              </div>
              <span className="text-[8px] text-muted-foreground">{day.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan breakdown */}
      <div className="rounded-xl border border-border/60 bg-card p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">Revenue Breakdown</h3>
        <div className="space-y-3">
          {[
            { plan: 'Pro', users: stats.proUsers, price: 999, color: 'bg-primary' },
            { plan: 'Premium', users: stats.premiumUsers, price: 2499, color: 'bg-terminal-amber' },
          ].map(item => (
            <div key={item.plan}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-semibold text-foreground">{item.plan}</span>
                <span className="text-[10px] text-muted-foreground">{item.users} × ₹{item.price} = <span className="text-foreground font-bold">₹{(item.users * item.price).toLocaleString('en-IN')}</span></span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full ${item.color} rounded-full transition-all`} style={{ width: stats.mrr > 0 ? `${((item.users * item.price) / stats.mrr) * 100}%` : '0%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
