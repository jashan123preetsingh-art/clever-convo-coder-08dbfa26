export default function StatusBar() {
  return (
    <footer className="h-7 bg-gradient-to-r from-card/50 via-card/30 to-card/50 glass border-t border-border/15 items-center justify-between px-5 flex-shrink-0 hidden md:flex">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.5)]" />
          <span className="text-[9px] text-muted-foreground/60 font-medium font-data">CONNECTED</span>
        </div>
        <span className="text-[9px] text-muted-foreground/40">NSE · BSE</span>
        <span className="text-[9px] text-muted-foreground/40">500+ stocks</span>
      </div>
      <div className="flex items-center gap-5">
        <span className="text-[9px] text-muted-foreground/40">
          {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <span className="text-[9px] text-primary/50 font-semibold tracking-wide">Trade Arsenal v3.2</span>
      </div>
    </footer>
  );
}
