export const SEMIOTIC_DARK_THEME = {
  '--semiotic-bg': '#020617',
  '--semiotic-text': '#e2e8f0',
  '--semiotic-grid': '#1e293b',
  '--semiotic-primary': '#6366f1',
  '--semiotic-border': '#334155',
};

export const CATEGORY_CHART_COLORS: Record<string, string> = {
  MODELS: '#3b82f6',
  CAPITAL: '#10b981',
  ENERGY: '#eab308',
  ROBOTICS: '#f97316',
  SPACE: '#6366f1',
  BIOLOGY: '#f43f5e',
  GOVERNANCE: '#94a3b8',
  COMPUTE: '#06b6d4',
  INFRASTRUCTURE: '#71717a',
  CONSCIOUSNESS: '#a855f7',
};

export const PROVIDER_COLORS: Record<string, string> = {
  Google: '#4285f4',
  OpenAI: '#10a37f',
  Anthropic: '#d4a574',
  Meta: '#0668e1',
  Mistral: '#f97316',
};

export const ENTITY_TYPE_COLORS: Record<string, string> = {
  company: '#6366f1',     // indigo
  product: '#3b82f6',     // blue
  person: '#10b981',      // emerald
  technology: '#f59e0b',  // amber
  benchmark: '#ec4899',   // pink
  concept: '#8b5cf6',     // violet
  unknown: '#64748b',     // slate
};

export const ENTITY_TYPE_COLORS_ARRAY = Object.values(ENTITY_TYPE_COLORS);
