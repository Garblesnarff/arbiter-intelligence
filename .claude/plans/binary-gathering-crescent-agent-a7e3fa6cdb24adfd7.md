# Semiotic + Pretext Integration Plan for Arbiter Intelligence

## Codebase Summary

**Existing structure** (flat, no `src/` directory):
- `index.tsx` -> providers: ToastProvider > ClaimDetailProvider > ClaimsProvider > App
- `App.tsx` -> sidebar nav, lazy-loaded routes, global ClaimDetailModal
- `components/Dashboard.tsx` -> hero signal card, ModelOptimizer, two Recharts charts (LineChart + PieChart), ChronicleFeed, Acceleration Trends
- `contexts/ClaimsContext.tsx` -> single source of truth, exposes `claims`, `loading`, `refreshClaims`
- `hooks/useClaimStats.ts` -> computes `topClaim`, `trendingEntities`, `chartData` (DayStat[]), `categoryStats` (CategoryStat[])
- `hooks/useDynamicModels.ts` -> enriches BASE_MODELS with chronicle claim intelligence
- `types.ts` -> Claim, ModelEntry, TaskCategory, etc.
- `styles.css` -> Geist + Geist Mono fonts already loaded via CDN, Tailwind v4 `@theme`
- `vite.config.ts` -> manual chunks for recharts, lucide, router, gemini, react-vendor

**Key data shapes**:
- `Claim.category`: "MODELS" | "CAPITAL" | "BIOLOGY" | "ROBOTICS" | "ENERGY" | "SPACE" | "COMPUTE" | "GOVERNANCE" | "INFRASTRUCTURE" | "CONSCIOUSNESS"
- `Claim.entities`: string[]
- `Claim.confidence`: "high" | "medium" | "low"
- `Claim.metric_value?`: string (e.g. "75%")
- `ModelEntry`: id, name, provider, input_cost_per_1m, output_cost_per_1m, latency_tier, benchmarks, chronicle_snippet

---

## Phase 0: Dependencies and Configuration

### 0a. Install packages

```bash
npm install semiotic @chenglou/pretext
```

### 0b. Update `vite.config.ts` manual chunks

Add Semiotic and Pretext to the chunk configuration so they do not bloat the main bundle:

```ts
// Inside manualChunks(id):
if (id.includes('semiotic')) {
  return 'semiotic';
}
if (id.includes('pretext') || id.includes('@chenglou/pretext')) {
  return 'pretext';
}
```

### 0c. Semiotic dark theme setup

Create **NEW FILE**: `lib/semioticTheme.ts`

This file defines a Semiotic ThemeProvider configuration that maps to the existing slate-950 palette. Semiotic v3.2.2 supports a `"dark"` preset plus CSS custom property overrides.

Exports:
- `ARBITER_SEMIOTIC_THEME` -- preset "dark" with overrides mapping to slate-950 bg, slate-700 axes, slate-800 grid, slate-400 text, slate-950 tooltip bg, slate-800 tooltip border
- `CATEGORY_SERIES_COLORS` -- reuses the same hex values from useClaimStats CATEGORY_COLORS
- `PROVIDER_COLORS` -- Google=#3b82f6, OpenAI=#10b981, Anthropic=#a855f7, Meta=#f97316

### 0d. Pretext font handle

Create **NEW FILE**: `lib/pretextFonts.ts`

Pretext requires explicit named fonts (not system-ui). The app already loads Geist via @font-face in styles.css.

Exports:
- `getGeistFont(weight, size)` -- returns a FontSpec for Pretext prepare() calls using the "Geist" family
- `getGeistMonoFont(weight, size)` -- same for "Geist Mono"
- `ensureFontsReady()` -- awaits document.fonts.ready before first layout

---

## Phase 1: Streaming Signal River (Semiotic RealtimeLineChart)

**Goal**: Replace the Recharts LineChart in Dashboard with a Semiotic RealtimeLineChart that pushes claims as they arrive, showing claims/min by category over time with a sliding window.

### New file: `components/charts/SignalRiver.tsx`

**Component**: `<SignalRiver />`

**Props**:
```ts
interface SignalRiverProps {
  claims: Claim[];
  className?: string;
}
```

**Internal architecture**:
1. Import `RealtimeLineChart` from `semiotic/realtime`
2. Maintain a `useRef` to the chart instance for `ref.current.push()` API
3. Use a `RingBuffer` with `windowMode: "sliding"` and a 7-day window (matching current 7d chart)
4. Transform claims into time-bucketed data points: group by hour or day, count by category
5. On mount, backfill existing claims from `useClaimStats().chartData`
6. On new claims arriving (detected via `claims.length` change or a diff), push new data points via `ref.current.push()`

**Data transformation** (useSignalRiverData hook):
- Input: `Claim[]`
- Output: time-series points `{ timestamp: Date, category: string, count: number }[]`
- Bucket claims into 1-hour intervals for the last 7 days
- Each category gets its own line/series

**Series configuration**:
- One line per active category, colored by `CATEGORY_SERIES_COLORS`
- X-axis: time (hours/days)
- Y-axis: claims count
- Sliding window keeps only last 7 days visible

**Tooltip**: Custom tooltip component matching the existing CustomTooltip style (slate-950 bg, slate-800 border, rounded-lg, text-xs)

### New file: `hooks/useSignalRiverData.ts`

**Purpose**: Transforms raw claims into the time-bucketed format needed by RealtimeLineChart, and provides a `pushNewClaims` function that computes incremental data points for newly arrived claims.

```ts
interface SignalRiverPoint {
  timestamp: string; // ISO string bucketed to hour
  category: string;
  count: number;
}

export function useSignalRiverData(claims: Claim[]): {
  initialData: SignalRiverPoint[];
  lastProcessedCount: React.MutableRefObject<number>;
  getNewPoints: (newClaims: Claim[]) => SignalRiverPoint[];
}
```

### New file: `components/charts/ChartTooltip.tsx`

Extract the existing `CustomTooltip` from Dashboard.tsx into a shared component for reuse by SignalRiver and any future chart.

### Modified file: `components/Dashboard.tsx`

**Changes**:
1. Remove the `LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer` imports from recharts (keep PieChart, Pie, Cell imports)
2. Remove the `CustomTooltip` component definition (now in ChartTooltip.tsx)
3. Import `SignalRiver` from `./charts/SignalRiver`
4. Get raw claims: add `const { claims } = useClaimsData();` 
5. Replace the "Signal Velocity (7d)" div block (lines 108-124) with:
   ```tsx
   <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
     <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
       <Activity className="w-4 h-4 text-indigo-500" />
       Signal Velocity (7d)
     </h3>
     <SignalRiver claims={claims} className="h-[200px]" />
   </div>
   ```

---

## Phase 2: Linked Dashboard (Semiotic LinkedCharts)

**Goal**: Wrap dashboard widgets in Semiotic LinkedCharts so hovering a category in the PieChart highlights matching claims in ChronicleFeed and related entities in Acceleration Trends.

### New file: `contexts/LinkedSelectionContext.tsx`

**Purpose**: A lightweight React context that bridges Semiotic useSelection/useLinkedHover hooks with non-Semiotic components (ChronicleFeed, Acceleration Trends). Semiotic hooks only work inside LinkedCharts, but the feed and trends are plain React components that need to react to the selection.

```ts
interface LinkedSelectionState {
  hoveredCategory: string | null;
  selectedCategories: Set<string>;
  hoveredEntity: string | null;
}

// Provider wraps the dashboard grid
// Exposes: setHoveredCategory, setSelectedCategories, setHoveredEntity
// Consumers: ChronicleFeed, AccelerationTrends filter/highlight by these values
```

### New file: `components/charts/LinkedDashboardWrapper.tsx`

**Component**: `<LinkedDashboardWrapper>`

**Architecture**:
1. Import `LinkedCharts` from `semiotic` and `useSelection`, `useLinkedHover` hooks
2. Wrap the two chart cards (SignalRiver and PieChart) inside `<LinkedCharts selections={selections}>`
3. Bridge Semiotic selection state to LinkedSelectionContext:
   - When a pie segment is hovered, set `hoveredCategory` in context
   - When a line in SignalRiver is hovered, set `hoveredCategory` in context
   - When an entity appears in a tooltip, set `hoveredEntity`

**Props**: children (the chart cards)

### Modified file: `components/Dashboard.tsx`

**Changes**:
1. Import `LinkedDashboardWrapper` and `LinkedSelectionProvider`
2. Wrap the two-chart grid (lines 107-176) inside `<LinkedDashboardWrapper>`
3. Wrap the entire dashboard return in `<LinkedSelectionProvider>` so ChronicleFeed and AccelerationTrends can consume the context

### Modified file: `components/ChronicleFeed.tsx`

**Changes**:
1. Import `useLinkedSelection` from the new context
2. Read `hoveredCategory` and `selectedCategories`
3. When `hoveredCategory` is set, visually highlight claims matching that category (add a left-border accent or bg tint) and dim non-matching claims (reduce opacity)
4. When `selectedCategories` is non-empty, filter `displayedClaims` to only show matching categories
5. Changes are purely visual/filtering -- no structural changes

### Modified file: `components/Dashboard.tsx` (Acceleration Trends section)

**Changes to the trends section** (lines 182-208):
1. Read `hoveredCategory` from `useLinkedSelection`
2. When a category is hovered, highlight entity pills whose claims belong to that category
3. Visual treatment: matching pills get `border-indigo-500` highlight, non-matching get `opacity-50`

---

## Phase 3: Model Pulseboard (Semiotic BubbleChart)

**Goal**: BubbleChart showing models as bubbles where size=benchmark score, color=provider, x=cost, y=latency. Chronicle snippets appear on hover via Semiotic annotations.

### New file: `components/charts/ModelPulseboard.tsx`

**Component**: `<ModelPulseboard />`

**Props**:
```ts
interface ModelPulseboardProps {
  models: ModelEntry[];
  className?: string;
}
```

**Data transformation** -- map each ModelEntry to a bubble datum:
```ts
{
  id: model.id,
  name: model.name,
  provider: model.provider,
  x: model.input_cost_per_1m,
  y: latencyToNumber(model.latency_tier), // fast=1, medium=2, slow=3
  size: extractBenchmarkScore(model.benchmarks), // parse first benchmark % to number
  color: PROVIDER_COLORS[model.provider],
  chronicle_snippet: model.chronicle_snippet,
  last_updated: model.last_updated,
}
```

**Semiotic configuration**:
- Import `BubbleChart` from `semiotic/xy`
- `sizeBy`: "size" field
- `colorBy`: "provider" field
- `sizeRange`: [20, 60] (pixel radius range)
- `annotations`: on hover, show a Semiotic annotation with model name, benchmark, and chronicle_snippet

**Custom annotation component**:
- slate-950 bg, slate-800 border, rounded-lg, shadow-xl
- Model name bold white, provider text-xs slate-400
- Chronicle snippet in blue-950/30 bg card if present

**Axes**:
- X: "Cost ($/1M tokens)" -- log scale since costs range from $0.10 to $20
- Y: "Latency Tier" -- discrete labels (Fast / Medium / Slow)

### Modified file: `components/ModelOptimizer.tsx`

**Changes**:
1. Import `ModelPulseboard` from `./charts/ModelPulseboard`
2. Add the pulseboard below the text input section and above the results section
3. Wrap in a card with header "Model Landscape":
   ```tsx
   <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
     <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
       <Activity className="w-4 h-4 text-purple-500" />
       Model Landscape
     </h3>
     <ModelPulseboard models={models} className="h-[280px]" />
   </div>
   ```

---

## Phase 4: Hero Signal Brief (Pretext inline flow)

**Goal**: Use Pretext layoutNextLine() with variable widths to flow the top claim text around inline confidence glyphs, benchmark chips, and entity badges.

### New file: `hooks/usePretextLayout.ts`

**Purpose**: Encapsulates Pretext layout logic for reuse between HeroSignalBrief and ShareCards.

```ts
interface InlineItem {
  type: 'text' | 'badge' | 'metric' | 'glyph';
  content: string;
  font: FontSpec;
  width?: number; // pre-computed for fixed-width items
}

interface LayoutResult {
  lines: Array<{
    items: Array<{
      type: InlineItem['type'];
      content: string;
      x: number;
      y: number;
      width: number;
    }>;
    y: number;
    height: number;
  }>;
  totalHeight: number;
}

export function usePretextLayout(
  items: InlineItem[],
  maxWidth: number,
  lineHeight: number
): LayoutResult | null
```

### New file: `components/hero/HeroSignalBrief.tsx`

**Component**: `<HeroSignalBrief />`

**Props**:
```ts
interface HeroSignalBriefProps {
  claim: Claim;
  onViewAnalysis: () => void;
  onViewOriginal: () => void;
}
```

**Architecture -- DOM measurement hybrid (recommended over pure canvas for interactivity)**:

1. Use Pretext `prepareInlineFlow(items[])` to compute positions for mixed elements
2. Items array includes:
   - Text segments of the claim text (split at entity mention boundaries)
   - Inline badge elements for entities (fixed width computed from text measurement)
   - Confidence glyph (small colored dot -- green=high, yellow=medium, red=low)
   - Metric chip if claim.metric_value exists
3. Use Pretext layout output to absolutely position DOM elements in a `position: relative` container
4. Each badge/chip is a real DOM element (interactive, hoverable, accessible)

**Inline elements**:
- **Confidence glyph**: Small colored circle inline with text
- **Entity badges**: `<span>` pills matching existing style (bg-slate-800 rounded border border-slate-700 text-slate-300)
- **Metric chip**: bg-indigo-500/15 text-indigo-400 border border-indigo-500/25

**Font handling**:
- Call `ensureFontsReady()` on mount
- Use `getGeistFont(700, 28)` for claim text (matching text-2xl md:text-3xl font-bold)
- Use `getGeistFont(500, 12)` for badge text measurement
- Use ResizeObserver to re-layout when container width changes

### Modified file: `components/Dashboard.tsx`

**Changes to hero section** (lines 53-101):
1. Import `HeroSignalBrief` from `./hero/HeroSignalBrief`
2. Replace the inner content of the hero card (the `<div className="relative z-10">` block):
   ```tsx
   <HeroSignalBrief
     claim={topClaim}
     onViewAnalysis={() => openClaim(topClaim)}
     onViewOriginal={() => openExternalUrl(topClaim.source_url)}
   />
   ```
3. Keep the outer gradient container div and the background Zap icon unchanged

---

## Phase 5: Canvas Share Cards (Pretext canvas rendering)

**Goal**: Export any claim as a beautiful canvas-rendered PNG image with precise text layout.

### New file: `components/share/ShareCardRenderer.ts`

**Purpose**: Pure function that renders a claim to an offscreen canvas and returns a Blob.

```ts
interface ShareCardOptions {
  claim: Claim;
  width?: number;   // default 1200
  height?: number;  // default 630 (OG image ratio)
  scale?: number;   // default 2 for retina
}

export async function renderShareCard(options: ShareCardOptions): Promise<Blob>
```

**Canvas layout**:
- Top bar: category badge (left), confidence indicator (right)
- Main body: claim text via prepareWithSegments + layoutWithLines for precise multi-line rendering
- Metric callout card (if metric_value exists): large number + context label
- Entity row: small rounded rect pills
- Divider line
- Footer: source feed name, date, "Arbiter Intelligence" branding

**Rendering steps**:
1. Create offscreen canvas at `width * scale` x `height * scale`
2. Draw background gradient (slate-950 to indigo-950/40)
3. Draw category badge with category color
4. Use prepareWithSegments + layoutWithLines for text, render with ctx.fillText in white (#f8fafc)
5. Draw metric callout card
6. Draw entity pills
7. Draw footer
8. Return canvas.toBlob('image/png')

### New file: `components/share/ShareCardButton.tsx`

**Component**: `<ShareCardButton />`

**Props**:
```ts
interface ShareCardButtonProps {
  claim: Claim;
  variant?: 'icon' | 'button';
}
```

**Behavior**:
1. On click, call `renderShareCard({ claim })`
2. Show brief loading spinner
3. Create download link via `URL.createObjectURL(blob)` and trigger download
4. Filename: `arbiter-${claim.category.toLowerCase()}-${claim.id}.png`

### Modified file: `components/ChronicleFeed.tsx`

Add `<ShareCardButton claim={claim} variant="icon" />` next to the existing Share2 icon button for each feed item.

### Modified file: `components/ClaimDetailModal.tsx`

Add a "Download Card" button using `<ShareCardButton claim={selectedClaim} variant="button" />` in the modal action bar.

---

## New Files Summary

| File | Purpose |
|------|---------|
| `lib/semioticTheme.ts` | Dark theme config, category colors, provider colors |
| `lib/pretextFonts.ts` | Font handle initialization for Pretext |
| `hooks/useSignalRiverData.ts` | Time-bucketed claim data for RealtimeLineChart |
| `hooks/usePretextLayout.ts` | Shared Pretext inline-flow layout hook |
| `contexts/LinkedSelectionContext.tsx` | Bridges Semiotic selection to non-Semiotic components |
| `components/charts/SignalRiver.tsx` | Semiotic RealtimeLineChart replacement |
| `components/charts/LinkedDashboardWrapper.tsx` | Semiotic LinkedCharts wrapper |
| `components/charts/ModelPulseboard.tsx` | Semiotic BubbleChart for models |
| `components/charts/ChartTooltip.tsx` | Shared tooltip component (extracted from Dashboard) |
| `components/hero/HeroSignalBrief.tsx` | Pretext inline-flow hero text |
| `components/share/ShareCardRenderer.ts` | Canvas rendering logic for share cards |
| `components/share/ShareCardButton.tsx` | Download button component |

## Modified Files Summary

| File | Changes |
|------|---------|
| `package.json` | Add semiotic, @chenglou/pretext |
| `vite.config.ts` | Add semiotic + pretext to manualChunks |
| `components/Dashboard.tsx` | Replace LineChart with SignalRiver, wrap charts in LinkedDashboardWrapper, wrap in LinkedSelectionProvider, replace hero text with HeroSignalBrief |
| `components/ChronicleFeed.tsx` | Add linked selection highlighting, add ShareCardButton |
| `components/ModelOptimizer.tsx` | Add ModelPulseboard section |
| `components/ClaimDetailModal.tsx` | Add ShareCardButton |

---

## Implementation Order and Dependencies

```
Phase 0 (foundation)
  |-- 0a: npm install
  |-- 0b: vite.config.ts chunks
  |-- 0c: lib/semioticTheme.ts
  +-- 0d: lib/pretextFonts.ts

Phase 1 (Signal River) -- depends on 0
  |-- hooks/useSignalRiverData.ts
  |-- components/charts/ChartTooltip.tsx (extract from Dashboard)
  |-- components/charts/SignalRiver.tsx
  +-- Dashboard.tsx (swap LineChart -> SignalRiver)

Phase 2 (Linked Dashboard) -- depends on 1
  |-- contexts/LinkedSelectionContext.tsx
  |-- components/charts/LinkedDashboardWrapper.tsx
  |-- Dashboard.tsx (wrap in providers)
  |-- ChronicleFeed.tsx (add highlight logic)
  +-- Dashboard.tsx Acceleration Trends (add highlight logic)

Phase 3 (Model Pulseboard) -- depends on 0, independent of 1/2
  |-- components/charts/ModelPulseboard.tsx
  +-- ModelOptimizer.tsx (add pulseboard section)

Phase 4 (Hero Signal Brief) -- depends on 0d
  |-- hooks/usePretextLayout.ts
  |-- components/hero/HeroSignalBrief.tsx
  +-- Dashboard.tsx (swap hero content)

Phase 5 (Share Cards) -- depends on 0d, reuses Phase 4 layout hook
  |-- components/share/ShareCardRenderer.ts
  |-- components/share/ShareCardButton.tsx
  |-- ChronicleFeed.tsx (add button)
  +-- ClaimDetailModal.tsx (add button)
```

Phases 3, 4, and 5 are independent of each other and can be parallelized. Phases 1 and 2 are sequential.

---

## Mobile Considerations

- **SignalRiver**: Use Semiotic built-in responsive sizing. On small screens, reduce to 3-day window and show fewer category lines.
- **LinkedDashboard**: Touch events should work as hover equivalents. On mobile, tap-to-select rather than hover-to-highlight.
- **ModelPulseboard**: On screens < 640px, switch to a compact list view instead of the bubble chart. Use a `useMediaQuery` hook or Tailwind responsive classes.
- **HeroSignalBrief**: Pretext layout adapts to container width via maxWidth parameter. Font size scales down on mobile (24px instead of 28px). Use ResizeObserver to re-layout on container resize.
- **ShareCards**: Fixed 1200x630 output regardless of screen size (OG image standard).

---

## Risk Areas and Mitigations

1. **Semiotic bundle size**: Tree-shakeable imports (semiotic/realtime, semiotic/xy, semiotic) keep chunks small. Manual chunk config isolates from main bundle.

2. **Pretext font readiness race**: The ensureFontsReady() pattern (awaiting document.fonts.ready) prevents layout with fallback fonts. Show skeleton/shimmer until fonts resolve.

3. **Recharts coexistence**: PieChart stays as Recharts. Both libraries render to SVG/canvas independently. No conflicts expected. Recharts import in Dashboard.tsx must be pruned to only PieChart imports.

4. **LinkedCharts scope**: Semiotic LinkedCharts only coordinates Semiotic charts. The bridge to ChronicleFeed and AccelerationTrends goes through React context, not Semiotic hooks. This is why LinkedSelectionContext exists as a separate layer.

5. **Canvas share card text quality**: Use scale: 2 (retina) and ensure ctx.textBaseline = "top" for consistent positioning. Test with Geist font specifically since Pretext measurements depend on exact font metrics.
