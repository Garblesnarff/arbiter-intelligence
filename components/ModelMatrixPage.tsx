import React from 'react';
import { MODELS } from '../constants';
import { ArrowUpDown, Zap, DollarSign, Check, X } from 'lucide-react';

export const ModelMatrixPage = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Model Matrix</h1>
          <p className="text-slate-400 text-sm">Live performance, cost, and capability tracking.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800">
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Model Identity</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1 cursor-pointer hover:text-slate-200">
                    Cost (In/Out) <DollarSign className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Latency <Zap className="w-3 h-3" />
                  </div>
                </th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Top Benchmark</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Strengths</th>
                <th className="p-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Chronicle Intel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {MODELS.map((model) => (
                <tr key={model.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="p-4">
                    <div className="font-medium text-slate-200">{model.name}</div>
                    <div className="text-xs text-slate-500">{model.provider}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-mono text-sm text-slate-300">
                      ${model.input_cost_per_1m.toFixed(2)} / ${model.output_cost_per_1m.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-600">per 1M tokens</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${
                      model.latency_tier === 'fast' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      model.latency_tier === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                      'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}>
                      {model.latency_tier.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-4">
                    {Object.entries(model.benchmarks).length > 0 ? (
                      <div>
                        <div className="text-sm text-slate-200 font-mono">
                          {Object.values(model.benchmarks)[0]}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {Object.keys(model.benchmarks)[0]}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {model.strengths.slice(0, 2).map(s => (
                        <span key={s} className="text-[10px] px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-400 rounded">
                          {s}
                        </span>
                      ))}
                      {model.strengths.length > 2 && (
                        <span className="text-[10px] text-slate-600">+{model.strengths.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 max-w-xs">
                    {model.chronicle_snippet ? (
                      <div className="text-xs text-blue-300 italic border-l-2 border-blue-500 pl-2">
                        "{model.chronicle_snippet}"
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">No recent signals</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};