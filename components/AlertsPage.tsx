import React from 'react';
import { Bell, Plus, Trash2, Mail, Zap } from 'lucide-react';

export const AlertsPage = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Signal Alerts</h1>
          <p className="text-slate-400 text-sm">Get notified immediately when specific claims appear.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
          <Plus className="w-4 h-4" />
          Create Alert
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-4 bg-slate-950/50 border-b border-slate-800 flex items-center gap-2">
            <Bell className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-semibold text-slate-200">Active Alerts (3)</h2>
        </div>
        <div className="divide-y divide-slate-800">
            {/* Alert Item 1 */}
            <div className="p-5 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Zap className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-slate-200">New SOTA Benchmarks</h3>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">ACTIVE</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">
                        Notify when any model scores &gt; 90% on <span className="text-slate-300">ARC-AGI-1</span> or <span className="text-slate-300">GPQA Diamond</span>.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email
                        </span>
                        <span>Last triggered: 2 days ago</span>
                    </div>
                </div>
                <button className="text-slate-600 hover:text-red-400 transition-colors p-2">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Alert Item 2 */}
            <div className="p-5 flex items-start gap-4 hover:bg-slate-800/20 transition-colors">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <Zap className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-slate-200">Anthropic Watch</h3>
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-900">ACTIVE</span>
                    </div>
                    <p className="text-sm text-slate-400 mb-3">
                        Notify on any claims containing <span className="text-slate-300">"Anthropic"</span> or <span className="text-slate-300">"Claude"</span>.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email
                        </span>
                        <span>Last triggered: 4 hours ago</span>
                    </div>
                </div>
                <button className="text-slate-600 hover:text-red-400 transition-colors p-2">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
            
             {/* Alert Item 3 */}
             <div className="p-5 flex items-start gap-4 hover:bg-slate-800/20 transition-colors opacity-75">
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700">
                    <Bell className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-slate-400">Pricing Drops</h3>
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">PAUSED</span>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">
                        Notify when <span className="text-slate-400">GPT-5 class</span> models drop below $5/1M input.
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email
                        </span>
                        <span>Last triggered: Never</span>
                    </div>
                </div>
                <button className="text-slate-600 hover:text-red-400 transition-colors p-2">
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
      </div>
      
      <div className="p-4 rounded-lg bg-indigo-900/20 border border-indigo-900/50 text-center">
        <p className="text-sm text-indigo-200">
            Need real-time webhooks? <span className="font-semibold underline cursor-pointer">Upgrade to Team Plan</span>.
        </p>
      </div>
    </div>
  );
};