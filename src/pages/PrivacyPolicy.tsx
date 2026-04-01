import { Link } from 'react-router-dom';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border/30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-sm font-black text-foreground">Trade Arsenal</Link>
          <Link to="/" className="text-xs text-primary hover:underline">← Back</Link>
        </div>
      </nav>
      <div className="max-w-4xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black mb-8">Privacy Policy</h1>
        <div className="prose prose-sm text-muted-foreground space-y-6">
          <p className="text-sm leading-relaxed"><strong>Effective Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>

          <h2 className="text-lg font-bold text-foreground mt-8">1. Information We Collect</h2>
          <p className="text-sm leading-relaxed">We collect information you provide directly: email address, name, and usage data when you use Trade Arsenal. We do not collect financial account details, trading credentials, or brokerage login information.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">2. How We Use Your Information</h2>
          <p className="text-sm leading-relaxed">Your information is used to provide and improve the service, send relevant notifications (price alerts), and maintain security. We do not sell your personal data to third parties.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">3. Data Storage & Security</h2>
          <p className="text-sm leading-relaxed">Data is stored using industry-standard encryption. We use secure cloud infrastructure with row-level security to ensure your data is accessible only to you.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">4. Third-Party Services</h2>
          <p className="text-sm leading-relaxed">We use third-party APIs for market data (NSE, BSE). These services have their own privacy policies. We do not share your personal information with data providers.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">5. Your Rights</h2>
          <p className="text-sm leading-relaxed">You can request deletion of your account and associated data at any time. Contact us at support@tradearsenal.in for data requests.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">6. Cookies</h2>
          <p className="text-sm leading-relaxed">We use essential cookies for authentication and session management. No third-party tracking cookies are used.</p>

          <h2 className="text-lg font-bold text-foreground mt-8">7. Changes</h2>
          <p className="text-sm leading-relaxed">We may update this policy periodically. Changes will be posted on this page with an updated effective date.</p>
        </div>
      </div>
    </div>
  );
}
