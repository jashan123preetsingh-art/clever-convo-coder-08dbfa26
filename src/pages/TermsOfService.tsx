import { Link } from 'react-router-dom';

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-sm font-black text-foreground">Trade Arsenal</Link>
          <Link to="/" className="text-xs text-primary hover:underline">← Back</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black mb-8">Terms of Service</h1>
        <div className="prose prose-sm text-muted-foreground space-y-6">
          <p className="text-sm leading-relaxed"><strong>Effective Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

          <h2 className="text-lg font-bold text-foreground mt-8">1. Acceptance of Terms</h2>
          <p className="text-sm leading-relaxed">By accessing Trade Arsenal, you agree to be bound by these terms. If you do not agree, please discontinue use immediately.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">2. Service Description</h2>
          <p className="text-sm leading-relaxed">Trade Arsenal is a market analysis and information platform for the Indian stock market. We provide data visualization, technical analysis tools, and AI-powered insights.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">3. Not Financial Advice</h2>
          <p className="text-sm leading-relaxed font-semibold text-foreground">Trade Arsenal does NOT provide financial advice, investment recommendations, or trading signals. All analysis, scores, and AI outputs are for informational and educational purposes only. You are solely responsible for your investment decisions.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">4. SEBI Disclaimer</h2>
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4">
            <p className="text-sm leading-relaxed text-foreground">
              <strong>⚠️ Investment in securities market are subject to market risks. Read all related documents carefully before investing.</strong>
            </p>
            <p className="text-sm leading-relaxed mt-2">Trade Arsenal is not a SEBI-registered Research Analyst, Investment Advisor, or Portfolio Manager. The platform does not guarantee the accuracy, completeness, or timeliness of the information provided. Past performance is not indicative of future results.</p>
            <p className="text-sm leading-relaxed mt-2">Registration granted by SEBI and certification from NISM in no way guarantee performance of the intermediary or provide any assurance of returns to investors.</p>
          </div>

          <h2 className="text-lg font-bold text-foreground mt-8">5. Data Accuracy</h2>
          <p className="text-sm leading-relaxed">Market data is sourced from third-party providers and may be delayed or inaccurate. We do not guarantee real-time accuracy. Always verify data with your broker before making trading decisions.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">6. User Responsibilities</h2>
          <p className="text-sm leading-relaxed">You agree not to use the service for any unlawful purpose, attempt to reverse-engineer the platform, or redistribute data obtained through Trade Arsenal.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">7. Limitation of Liability</h2>
          <p className="text-sm leading-relaxed">Trade Arsenal shall not be liable for any direct, indirect, incidental, or consequential damages arising from the use of this platform, including but not limited to trading losses.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">8. Governing Law</h2>
          <p className="text-sm leading-relaxed">These terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.</p>
        </div>
      </div>
    </div>
  );
}
