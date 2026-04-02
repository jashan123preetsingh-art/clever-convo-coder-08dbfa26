

# What More We Can Do — Trade Arsenal

## Already Done (from previous plan)
- forwardRef warnings fixed
- SEO & OG meta tags added
- Skip-to-content link added
- QueryClient global defaults set
- Forgot password flow working
- Data safety hardening (no more undefined errors)
- Admin RLS policy for plan switching

## Still Pending (Quick Wins)

### 1. Font Size Accessibility Audit
Bump all `text-[7px]` instances (78 occurrences across 6 files) to `text-[8px]` minimum. Small but important for professional polish and WCAG compliance.

### 2. Aria-Labels on Icon Buttons
Add `aria-label` attributes to theme toggle, hamburger menu, alert bell, and search buttons in the Header component. Important for accessibility compliance.

### 3. Polished Empty States
Add illustrated empty states for Scanner (no results), Watchlist (empty list), and News (no articles) instead of blank areas.

## New Feature Ideas (High Impact)

### 4. Export & Reports
Allow users to export their Portfolio, Scanner results, or AI analysis as PDF/CSV. Very useful for a company demo — shows data can be acted on.

### 5. Notification System
In-app toast notifications for price alerts, portfolio changes, and market events. Makes the app feel alive and professional.

### 6. User Onboarding Tour
A first-time guided tour (tooltip walkthrough) highlighting key features — Dashboard, Scanner, AI Agent, Portfolio. Great for impressing new users and company reviewers.

### 7. Dark/Light Theme Polish
The heatmap colors are still hardcoded HSL. Making them theme-aware ensures the app looks polished in both modes.

### 8. PWA Support (Install as App)
Add a manifest.json and service worker so the app can be installed on mobile/desktop as a native-like app. Very impressive for demos.

### 9. Landing Page Social Proof
Add testimonials section, a demo video placeholder, and trust badges to the landing page for a more compelling first impression.

### 10. Performance Dashboard for Admin
Add charts showing user signups over time, active users, and popular features in the Admin panel. Shows the app has real analytics.

---

## Recommended Priority for Company Demo

| Priority | Feature | Impact | Effort |
|----------|---------|--------|--------|
| 1 | Font size + aria-label fixes | Professional polish | Small |
| 2 | Export to PDF/CSV | Actionable data | Medium |
| 3 | User onboarding tour | First impression | Medium |
| 4 | Empty states | No broken-looking pages | Small |
| 5 | PWA support | "Install as app" wow factor | Small |

Pick which ones you want me to build and I will implement them.

