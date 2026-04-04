import React, { useMemo, useState } from 'react';
import { Scatterplot } from 'semiotic';
import type { ModelEntry } from '../../types';
import { PROVIDER_COLORS } from './theme';

interface ModelPulseboardProps {
  models: ModelEntry[];
}

const LATENCY_MAP: Record<string, number> = { fast: 3, medium: 2, slow: 1 };
const LATENCY_LABELS: Record<number, string> = { 1: 'Slow', 2: 'Medium', 3: 'Fast' };

function parseBenchmarkSize(benchmarks: Record<string, string | number>): number {
  for (const v of Object.values(benchmarks)) {
    if (typeof v === 'number') return Math.max(10, Math.min(v, 100));
    if (typeof v === 'string') {
      const num = parseFloat(v.replace('%', ''));
      if (!isNaN(num)) return Math.max(10, Math.min(num, 100));
    }
  }
  return 50;
}

function providerColor(provider: string): string {
  return PROVIDER_COLORS[provider] ?? '#94a3b8';
}

interface BubbleDatum {
  cost: number;
  speed: number;
  size: number;
  name: string;
  provider: string;
  chronicle_snippet?: string;
  _model: ModelEntry;
}

export default function ModelPulseboard({ models }: ModelPulseboardProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const data = useMemo<BubbleDatum[]>(
    () =>
      models.map((m) => ({
        cost: m.input_cost_per_1m,
        speed: LATENCY_MAP[m.latency_tier] ?? 2,
        size: parseBenchmarkSize(m.benchmarks),
        name: m.name,
        provider: m.provider,
        chronicle_snippet: m.chronicle_snippet,
        _model: m,
      })),
    [models],
  );

  const providers = useMemo(() => {
    const seen = new Set<string>();
    models.forEach((m) => seen.add(m.provider));
    return Array.from(seen);
  }, [models]);

  if (models.length === 0) return null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-200 mb-1 flex items-center gap-2">
        <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <circle cx="7.5" cy="7.5" r="3" /><circle cx="16" cy="16" r="4" /><circle cx="17" cy="6" r="2" /><circle cx="6" cy="17" r="2.5" />
        </svg>
        Model Pulseboard
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Cost vs speed. Bubble size reflects benchmark score.
      </p>

      {/* Provider legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {providers.map((p) => (
          <span key={p} className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: providerColor(p) }} />
            {p}
          </span>
        ))}
      </div>

      <div className="h-[300px] w-full">
        <Scatterplot
          data={data}
          xAccessor="cost"
          yAccessor="speed"
          sizeAccessor={(d: BubbleDatum) => d.size / 10}
          colorBy={(d: BubbleDatum) => providerColor(d.provider)}
          width={600}
          height={300}
          responsiveWidth
          margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
          showGrid
          tooltip={(d: BubbleDatum) => (
            <div className="max-w-[240px] text-xs bg-slate-950 border border-slate-800 p-3 rounded-lg shadow-xl">
              <div className="font-semibold text-slate-100 text-sm mb-1">{d.name}</div>
              <div className="text-slate-400 mb-1">{d.provider}</div>
              <div className="text-slate-300">Cost: <span className="text-indigo-400">${d.cost}</span>/1M</div>
              <div className="text-slate-300">Speed: <span className="text-emerald-400">{LATENCY_LABELS[d.speed]}</span></div>
              {d.chronicle_snippet && (
                <div className="mt-2 pt-2 border-t border-slate-700 text-slate-400 italic text-[11px]">
                  {d.chronicle_snippet.length > 100 ? d.chronicle_snippet.slice(0, 100) + '...' : d.chronicle_snippet}
                </div>
              )}
            </div>
          )}
          annotations={data.map((d) => ({
            type: 'label' as const,
            cost: d.cost,
            speed: d.speed,
            label: d.name,
            dx: 0,
            dy: -14,
            color: '#94a3b8',
          }))}
          onClick={(d: BubbleDatum) => setSelected(selected === d.name ? null : d.name)}
        />
      </div>

      {/* Selected model detail */}
      {selected && (() => {
        const model = data.find((d) => d.name === selected)?._model;
        if (!model) return null;
        return (
          <div className="mt-4 bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 flex items-start gap-3 animate-fade-in">
            <div className="mt-1 w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: providerColor(model.provider) }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200">{model.name}</span>
                <span className="text-xs text-slate-500">{model.provider}</span>
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                ${model.input_cost_per_1m}/1M in · ${model.output_cost_per_1m}/1M out · {model.latency_tier}
              </div>
              {model.strengths.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {model.strengths.slice(0, 4).map((s) => (
                    <span key={s} className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{s}</span>
                  ))}
                </div>
              )}
              {model.chronicle_snippet && (
                <p className="text-xs text-slate-500 italic mt-1.5 line-clamp-2">{model.chronicle_snippet}</p>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-slate-300 text-xs shrink-0">x</button>
          </div>
        );
      })()}
    </div>
  );
}
