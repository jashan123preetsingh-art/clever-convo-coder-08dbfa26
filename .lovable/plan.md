# Bloomberg-Level Indian Finance Terminal — Feature Roadmap

Here's what your app already has vs. what top Bloomberg-style terminals offer, with the highest-impact additions prioritized.

## What You Already Have (Strong Foundation)

- Live indices, market breadth, heatmap, sectors
- Options chain with PCR/Max Pain
- FII/DII analytics (4-tab pro layout)
- Commodities with AI analysis
- Stock detail with candlestick charts + technicals
- Scanner, screener, portfolio with live P&L
- AI Trading Agent, price alerts, watchlist
- Command palette, dark/light themes

---

## Recommended Additions (Priority Order)

### 1. Global Market Ticker Tape

A scrolling horizontal ticker at the top showing Dow, S&P 500, NASDAQ, FTSE, Nikkei, Hang Seng, SGX Nifty, USD/INR, US 10Y yield, Bitcoin — giving instant global context like Bloomberg terminals always have.

**Files:** `src/components/layout/TickerTape.tsx`, update `TerminalLayout.tsx`

### 2. Economic Calendar

A dedicated section showing upcoming events — RBI policy dates, US Fed meetings, GDP releases, earnings dates for Nifty 50 companies. Bloomberg users live by this.

**Files:** New `src/pages/Calendar.tsx`, new edge function to fetch events



&nbsp;

### 4. IPO Tracker

Upcoming, ongoing, and recently listed IPOs with subscription data, GMP (grey market premium), and listing performance. Very India-specific and high demand.

**Files:** New `src/pages/IPO.tsx`, edge function for IPO data

### 5. Currency & Forex Dashboard

Beyond just USD/INR — show EUR/INR, GBP/INR, JPY/INR, crypto pairs, with mini charts. Bloomberg always has a dedicated FX screen.

**Files:** Extend commodities edge function or new `src/pages/Forex.tsx`

### 6. Market Alerts & Events Feed

A unified real-time feed combining: circuit breakers, bulk/block deals, insider trades, SEBI announcements. Like Bloomberg's NEWS panel but filtered for actionable events.

**Files:** New `src/components/dashboard/EventsFeed.tsx`

### 7. Keyboard Shortcuts Overlay

Bloomberg is 100% keyboard-driven. Add a `?` shortcut that shows all available hotkeys in a modal — reinforces the pro terminal feel.

**Files:** New `src/components/KeyboardShortcuts.tsx`

---

## Technical Approach

- Global ticker uses the existing `stock-data` edge function with a new `action: "global-indices"` for international data via Yahoo Finance
- Economic calendar can scrape from public sources or use a free API
- Multi-chart reuses the existing lightweight-charts integration
- All new pages follow the existing `TerminalLayout` + sidebar nav pattern
- New nav items added to sidebar, mobile nav, and command palette

## Suggested Implementation Order

1. **Global Ticker Tape** — small effort, massive visual impact
2. **Keyboard Shortcuts Overlay** — tiny effort, pro feel
3. **Economic Calendar** — high utility for traders
4. **Multi-Chart Compare** — power-user feature
5. **IPO Tracker** — India-specific differentiator