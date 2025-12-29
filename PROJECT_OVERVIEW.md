## PROJECT OVERVIEW
**Name:** arbiter-intelligence
**One-liner:** An AI model intelligence dashboard that tracks capabilities, benchmarks, and costs of frontier LLMs using real-time news extraction.
**Purpose:** Provides a centralized view of the AI model landscape by automatically extracting structured claims from "The Innermost Loop" Substack chronicles. Helps users make informed decisions about which AI model to use for different tasks based on latest benchmark data, pricing, and capabilities.

## CURRENT STATE
**Status:** prototype / active development
**Last meaningful work:** UI enhancements, dynamic model data integration from chronicles via Gemini AI extraction (Dec 2025)
**What's working:**
- Dashboard with cost optimization charts and critical signal alerts
- Model Matrix page with live performance/cost tracking
- Chronicle feed that fetches RSS and extracts structured claims via Gemini AI
- Client-side routing between pages (Dashboard, Chronicles, Models, Alerts, Settings)
- LocalStorage caching for extracted claims
- Dynamic model updates based on extracted chronicle data

**What's broken/incomplete:**
- Alerts and Settings pages are placeholder stubs
- Uses corsproxy.io CORS proxy (fragile external dependency)
- Some dashboard data is mocked (usage stats, trending entities)
- No test suite
- No proper error boundaries or loading states
- Requires manual `GEMINI_API_KEY` setup in `.env.local`

**Next logical step:** Implement real alerts based on extracted claims or add proper error handling/loading states throughout the app.

## TECH STACK
- **Runtime:** Node.js (browser SPA)
- **Framework:** React 19 + TypeScript
- **Database:** LocalStorage (client-side caching)
- **Deployment:** Local dev / AI Studio (Google)
- **Key dependencies:**
  - `@google/genai` - Gemini AI for claim extraction
  - `react-router-dom` - Client-side routing
  - `recharts` - Cost visualization charts
  - `lucide-react` - Icons

## KEY FILES
- `App.tsx` - Main app layout, routing, sidebar navigation
- `types.ts` - Core types (Claim, ModelEntry, TaskCategory)
- `constants.ts` - Base model data and mock claims
- `services/rssService.ts` - RSS fetching from Substack with caching
- `services/extractionService.ts` - Gemini AI claim extraction with structured prompts
- `hooks/useDynamicModels.ts` - Merges base models with extracted chronicle claims
- `components/Dashboard.tsx` - Main dashboard with model optimizer and charts
- `components/ModelMatrixPage.tsx` - Model comparison table with live data
- `components/ChronicleFeed.tsx` - Displays extracted claims by category

## ENTRY POINTS
- **Run dev:** `npm run dev`
- **Build:** `npm run build`
- **Test:** (none configured)
- **Deploy:** AI Studio at https://ai.studio/apps/drive/1BPLTbhFJB77KFhwOssuBEZx7ZPoZlS1V

## CONNECTIONS
- **Depends on:**
  - The Innermost Loop Substack RSS feed (`theinnermostloop.substack.com/feed`)
  - corsproxy.io for CORS bypass
  - Google Gemini API (`gemini-3-flash-preview`)
- **Used by:** Standalone app (not consumed by other projects)
- **Related repos:** None identified
