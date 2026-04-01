

# Improvements Plan for Trade Arsenal Terminal

## Issues Found

### 1. Console Warnings — Sectors Page
`SectorIcon` and `MiniHeatmap` function components are being passed refs by framer-motion but don't use `forwardRef`. This causes React warnings.

### 2. Heatmap Colors Hardcoded
`getHeatColor()` in Heatmap.tsx uses hardcoded HSL values instead of theme CSS variables, so it doesn't adapt to light/dark mode.

### 3. Missing Loading States
The `QueryClient` is created with no default options — no `staleTime`, no `retry` config. Individual queries set these inconsistently.

### 4. Auth Page — No "Forgot Password" Flow
Users have no way to reset their password.

### 5. Landing Page Polish
The landing page (`Index.tsx`) could use social proof, a demo video placeholder, and a more compelling CTA section.

### 6. Accessibility Gaps
- No `aria-label` on icon-only buttons (theme toggle, hamburger, alert bell)
- Very small font sizes (`text-[7px]`) may fail WCAG minimum size guidelines
- No skip-to-content link

### 7. Empty States
Pages like Watchlist, Scanner results, and News don't have polished empty/error states.

### 8. SEO & Meta Tags
`index.html` likely has default Vite meta tags — should have proper title, description, OG tags for sharing.

---

## Proposed Improvements (Priority Order)

### Phase 1: Bug Fixes & Polish
1. **Fix Sectors forwardRef warnings** — Wrap `SectorIcon` and `MiniHeatmap` with `React.forwardRef`
2. **Theme-aware Heatmap colors** — Replace hardcoded HSL in `getHeatColor()` with CSS variable-based colors that respect light/dark mode
3. **Minimum font size audit** — Bump all `text-[7px]` instances to `text-[8px]` minimum for accessibility

### Phase 2: UX Enhancements
4. **Add "Forgot Password" to Auth page** — Add a password reset flow using the auth system's `resetPasswordForEmail`
5. **Add aria-labels to icon buttons** — Theme toggle, hamburger menu, alert bell, search icon
6. **Better empty/error states** — Add illustrated empty states for Scanner (no results), Watchlist (empty), and API errors

### Phase 3: Performance & SEO
7. **Global QueryClient defaults** — Set sensible `staleTime` (60s), `retry` (2), and `refetchOnWindowFocus: false` at the QueryClient level
8. **SEO meta tags** — Update `index.html` with proper title, description, OG image, and favicon
9. **Add skip-to-content link** — For keyboard navigation accessibility

---

## Technical Details

### Files Modified
- `src/pages/Sectors.tsx` — forwardRef on SectorIcon and MiniHeatmap
- `src/pages/Heatmap.tsx` — theme-aware color function
- `src/pages/Auth.tsx` — forgot password UI + logic
- `src/App.tsx` — QueryClient default options
- `src/components/TerminalLayout.tsx` — aria-labels, skip-to-content
- `index.html` — meta tags, OG tags
- Multiple files — font size audit (`text-[7px]` → `text-[8px]`)

### No New Dependencies Required

### Estimated Scope
~9 files modified, no database changes needed.

