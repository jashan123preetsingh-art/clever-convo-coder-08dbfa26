

# World-Class Enhancements Plan

## What's Already Strong
The app has a solid Bloomberg-terminal aesthetic, live data hooks, a 12-agent AI system, options chain with strategy builder, squarified treemap heatmap, and quality-scored scanner. The foundation is excellent.

## Proposed Enhancements (Priority Order)

### 1. Watchlist & Portfolio Tracker (Persistent)
- Add a database-backed watchlist so users can save favorite stocks
- Show a "My Watchlist" widget on the Dashboard with live P&L tracking
- Add a quick "★" button on every stock row/card to add/remove
- Store in a `watchlists` table with user_id, symbol, added_price, quantity (optional)

### 2. Real-Time Price Alerts
- Let users set price alerts (e.g., "Notify me when RELIANCE crosses ₹2,900")
- Store alerts in a `price_alerts` table
- Show a notification bell in the header with active/triggered alerts
- Use toast notifications when conditions are met during the session

### 3. Interactive TradingView-Style Charts
- Replace the current basic chart on StockDetail with a proper candlestick chart using `lightweight-charts` (TradingView's open-source library)
- Support drawing tools, indicators (RSI, MACD, Bollinger Bands)
- Multiple timeframes (1m, 5m, 15m, 1h, 1D, 1W)
- Volume bars below the candle chart

### 4. Dark/Light Theme Toggle + Custom Accent Colors
- Add a theme switcher in the header (dark is default, add a clean light mode)
- Let users pick accent color (green, blue, cyan, amber) for personalization
- Store preference in localStorage or user profile

### 5. Keyboard Power-User Shortcuts
- Global command palette (Cmd+K / Ctrl+K) for quick navigation, stock search, actions
- Keyboard shortcuts already partially exist (F1-F9) — extend with stock-specific actions
- Show a shortcut cheat sheet overlay (press `?`)

### 6. Dashboard Customizable Layout
- Let users drag-and-drop widgets to rearrange the Dashboard
- Choose which widgets to show/hide (indices, gainers, losers, sectors, news, watchlist)
- Save layout preference per user in the database

### 7. Performance & PWA
- Add a service worker for offline access to cached data
- Add a manifest.json for "Add to Home Screen" on mobile
- Implement skeleton loading states across all pages for perceived speed

## Technical Approach

### Database Changes (2 new tables)
- `watchlists` — user_id, symbol, added_price, quantity, created_at
- `price_alerts` — user_id, symbol, condition (above/below), target_price, triggered, created_at

### New Dependencies
- `lightweight-charts` for TradingView-style candlestick charts

### Files to Create/Modify
- **New**: `src/components/Watchlist.tsx`, `src/components/CommandPalette.tsx`, `src/components/CandlestickChart.tsx`, `src/components/PriceAlerts.tsx`
- **Modify**: `src/pages/Dashboard.tsx` (add watchlist widget), `src/pages/StockDetail.tsx` (replace chart), `src/components/TerminalLayout.tsx` (add command palette, alert bell, theme toggle)

### Implementation Order
1. Watchlist + DB tables (most user-visible impact)
2. TradingView charts (biggest "wow" factor)
3. Command palette (power-user delight)
4. Price alerts
5. Theme toggle
6. Dashboard layout customization
7. PWA/performance

