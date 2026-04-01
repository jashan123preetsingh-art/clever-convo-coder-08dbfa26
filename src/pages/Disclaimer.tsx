import { Link } from 'react-router-dom';

export default function Disclaimer() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-sm font-black text-foreground">Trade Arsenal</Link>
          <Link to="/" className="text-xs text-primary hover:underline">← Back</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black mb-8">Disclaimer</h1>

        <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-bold text-foreground mb-3">⚠️ Important Notice</h2>
          <p className="text-sm leading-relaxed text-foreground font-semibold">
            Investment in securities market are subject to market risks. Read all the related documents carefully before investing.
          </p>
        </div>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <p>Trade Arsenal is an <strong className="text-foreground">informational and educational platform</strong> for the Indian stock market. It is <strong className="text-foreground">NOT</strong> a SEBI-registered:</p>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>Research Analyst (RA)</li>
            <li>Investment Advisor (IA)</li>
            <li>Portfolio Manager (PMS)</li>
            <li>Stock Broker</li>
          </ul>

          <p>The platform provides market data visualization, technical analysis tools, and AI-powered analysis. <strong className="text-foreground">None of the content on this platform should be construed as financial advice, buy/sell recommendations, or trading signals.</strong></p>

          <p>AI-generated analysis, quality scores, and trading agent outputs are algorithmic opinions based on publicly available data. They may contain errors and should not be the sole basis for any investment decision.</p>

          <h3 className="text-base font-bold text-foreground mt-8">Risk Disclosure</h3>
          <ul className="list-disc list-inside space-y-1 pl-4">
            <li>Trading in derivatives (F&O) involves substantial risk of loss and is not suitable for all investors.</li>
            <li>Past performance of any stock, strategy, or analysis does not guarantee future results.</li>
            <li>You may lose more than your initial investment when trading derivatives.</li>
            <li>Market data may be delayed or inaccurate. Always verify with your broker.</li>
          </ul>

          <h3 className="text-base font-bold text-foreground mt-8">Your Responsibility</h3>
          <p>You are solely responsible for your investment decisions. Consult a qualified financial advisor before making any investment. Trade Arsenal, its founders, employees, and affiliates shall not be held responsible for any losses incurred from using this platform.</p>

          <div className="mt-8 pt-6 border-t border-border/30">
            <p className="text-[10px] text-muted-foreground/60">
              By using Trade Arsenal, you acknowledge that you have read and understood this disclaimer and agree to its terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
