

# Trading Agent UI Enhancement Plan

## Current State
The Trading Agent page has a functional but basic UI: a text input, quick-pick chips, a 6-step horizontal progress bar, and collapsible agent report cards using the `t-card` class with markdown rendering.

## Proposed Enhancements

### 1. Animated Loading State with Live Agent Status
- Replace the simple interval-based step counter with a rich loading experience
- Show a **vertical timeline** during loading with animated "thinking" dots for the active agent
- Display real-time status text like "Analyzing fundamentals..." per step
- Add a pulsing glow effect on the active step node

### 2. Hero Summary Card (Final Verdict)
- After results load, show a prominent **verdict card** at the top with:
  - Large BUY/SELL/HOLD badge with color coding (green/red/amber)
  - Risk score as a circular gauge (1-10)
  - Confidence percentage bar
  - One-line summary from the Portfolio Manager
- This gives users the "answer" immediately before diving into details

### 3. Glassmorphism Agent Cards with Status Indicators
- Add a colored left-border accent per agent group (green for analysts, amber for debate, cyan for manager, etc.)
- Show a small **sentiment badge** on each card header (Bullish/Bearish/Neutral) extracted from content
- Add subtle gradient backgrounds matching the terminal aesthetic
- Improve the expand/collapse with smoother spring animations

### 4. Visual Flow Diagram (Replace Horizontal Stepper)
- Replace the flat horizontal stepper with a **connected node graph** layout
- Show arrows/connections between agent groups to visualize the data flow
- Nodes light up with checkmarks as each step completes
- On mobile, collapse to a compact vertical timeline

### 5. Empty State with Animated Illustration
- Replace the static emoji grid with an **animated agent network** visualization
- Show subtle floating connection lines between the 6 agent nodes
- Add a typewriter effect on the description text
- Make quick-pick buttons more prominent with hover animations

### 6. Export & Share
- Add a "Download Report" button that generates a formatted summary
- Add a "Copy to Clipboard" for the final verdict
- Share button for the analysis URL

## Technical Approach

### Files to modify:
- **`src/pages/TradingAgent.tsx`** — Complete UI overhaul with new components:
  - `VerdictCard` — Hero summary with gauge + badge
  - `AgentTimeline` — Vertical animated timeline for loading state
  - `AgentFlowGraph` — Visual node graph replacing horizontal stepper
  - `AgentReportCard` — Enhanced card with accent colors and sentiment badges
- **`src/index.css`** — Add keyframe animations for the flow graph nodes and pulse effects

### Key design decisions:
- Keep everything in one file to avoid over-splitting since it's a single page feature
- Use Framer Motion for all animations (already imported)
- Match the Bloomberg terminal aesthetic with glassmorphism, JetBrains Mono data font, and the existing color palette
- Maintain the existing API contract — no backend changes needed

