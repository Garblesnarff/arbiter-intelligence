import React, { useMemo } from 'react';
import { Activity } from 'lucide-react';
import { LineChart } from 'semiotic';
import { useSignalStream } from '../../hooks/useSignalStream';

/**
 * Signal Velocity (7d) — Semiotic line chart showing hourly claim volume.
 * Two lines: total claims (indigo) + model-relevant claims (blue).
 */
export const SignalRiver: React.FC<{ className?: string }> = ({ className }) => {
  const { streamData } = useSignalStream();

  // Aggregate hourly buckets into daily totals for cleaner display
  const dailyData = useMemo(() => {
    const dayMap = new Map<string, { day: string; total: number; models: number; time: number }>();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (const d of streamData) {
      const date = new Date(d.time);
      const dayKey = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const dayName = days[date.getDay()];
      const existing = dayMap.get(dayKey);
      if (existing) {
        existing.total += d.total;
        existing.models += d.models;
      } else {
        dayMap.set(dayKey, { day: dayName, total: d.total, models: d.models, time: d.time });
      }
    }
    return Array.from(dayMap.values()).sort((a, b) => a.time - b.time);
  }, [streamData]);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-xl p-6 ${className ?? ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
          Signal Velocity (7d)
        </h3>
      </div>

      <div className="h-[200px] w-full">
        {dailyData.length > 0 ? (
          <LineChart
            data={dailyData}
            xAccessor="day"
            yAccessor="total"
            width={500}
            height={200}
            responsiveWidth
            stroke="#6366f1"
            strokeWidth={2}
            showGrid
            margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
            tooltip={(d: any) => `${d.day} — ${d.total} signals`}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-600 text-sm">
            Collecting signal data...
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-indigo-500 rounded-full inline-block" />
          All signals
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-blue-500 rounded-full inline-block" />
          Model-relevant
        </div>
      </div>
    </div>
  );
};
