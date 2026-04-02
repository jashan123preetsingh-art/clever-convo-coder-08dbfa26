import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { BarChart3, Search, PenTool, LayoutGrid, ArrowLeftRight, Layers, TrendingUp, Gem } from 'lucide-react';

interface QuickActionProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  to: string;
}

function QuickAction({ icon, title, desc, to }: QuickActionProps) {
  return (
    <Link to={to}>
      <motion.div whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }}
        className="p-3 sm:p-4 rounded-xl bg-card/40 border border-border/10 hover:border-primary/20 hover:bg-card/70 transition-all duration-300 flex flex-col items-center text-center gap-1.5 sm:gap-2 group cursor-pointer h-full">
        <span className="text-muted-foreground group-hover:text-primary transition-colors duration-300">{icon}</span>
        <p className="text-[9px] sm:text-[10px] font-bold text-foreground group-hover:text-primary transition-colors leading-tight">{title}</p>
        <p className="text-[8px] text-muted-foreground/70 leading-relaxed hidden sm:block">{desc}</p>
      </motion.div>
    </Link>
  );
}

export default function QuickActionsGrid() {
  return (
    <div>
      <p className="text-[8px] sm:text-[9px] text-muted-foreground/70 font-bold mb-2 uppercase tracking-[0.15em]">Quick Actions</p>
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
        <QuickAction icon={<BarChart3 className="w-5 h-5" />} title="Option Chain" desc="NIFTY / BNF" to="/options" />
        <QuickAction icon={<Search className="w-5 h-5" />} title="Scanner" desc="Find setups" to="/scanner" />
        <QuickAction icon={<PenTool className="w-5 h-5" />} title="Strategies" desc="Build & test" to="/options" />
        <QuickAction icon={<LayoutGrid className="w-5 h-5" />} title="Heatmap" desc="Market view" to="/heatmap" />
        <QuickAction icon={<ArrowLeftRight className="w-5 h-5" />} title="FII / DII" desc="Fund flows" to="/fii-dii" />
        <QuickAction icon={<Layers className="w-5 h-5" />} title="Sectors" desc="Rotation" to="/sectors" />
        <QuickAction icon={<TrendingUp className="w-5 h-5" />} title="OI Analysis" desc="OI trends" to="/oi-analysis" />
      </div>
    </div>
  );
}
