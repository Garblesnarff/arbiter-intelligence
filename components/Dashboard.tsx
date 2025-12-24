import React from 'react';
import { ChronicleFeed } from './ChronicleFeed';
import { ModelOptimizer } from './ModelOptimizer';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertCircle, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';

const MOCK_USAGE_DATA = [
  { day: 'Mon', cost: 12.4, saved: 45.2 },
  { day: 'Tue', cost: 15.1, saved: 52.8 },
  { day: 'Wed', cost: 8.5, saved: 32.1 },
  { day: 'Thu', cost: 18.2, saved: 65.4 },
  { day: 'Fri', cost: 14.8, saved: 48.9 },
  { day: 'Sat', cost: 5.2, saved: 15.0 },
  { day: 'Sun', cost: 3.1, saved: 12.5 },
];

export const Dashboard = () => {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      
      {/* Top Signal - The "Front-row seat" */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-32 h-32 text-indigo-500" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
                <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20 animate-pulse">
                    CRITICAL SIGNAL
                </span>
                <span className="text-slate-500 text-xs font-mono">DEC 24, 2025</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 max-w-2xl">
                GPT-5.2-xhigh achieves 75% on ARC-AGI-2 at &lt;$8/task
            </h1>
            <p className="text-slate-400 mb-6 max-w-xl">
                Reasoning tasks are now 15% cheaper. Previous best was 60% at $12/task.
                <br/>Arbiter recommends routing <span className="text-indigo-400 font-medium">Coding</span> and <span className="text-indigo-400 font-medium">Math</span> tasks to the new endpoint.
            </p>
            <div className="flex gap-3">
                <button className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Update Routing Rules
                </button>
                <button className="text-slate-400 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    View Full Analysis
                </button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Model Optimizer */}
        <div className="lg:col-span-7 space-y-8">
            <ModelOptimizer />
            
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 uppercase tracking-wider">Cost Optimization (This Week)</h3>
                <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={MOCK_USAGE_DATA}>
                            <XAxis dataKey="day" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc' }}
                                itemStyle={{ color: '#cbd5e1' }}
                            />
                            <Line type="monotone" dataKey="saved" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name="Saved" />
                            <Line type="monotone" dataKey="cost" stroke="#6366f1" strokeWidth={2} dot={false} name="Spent" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex gap-6 mt-4 justify-center">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                        <span className="text-sm text-slate-300">Saved: <span className="font-mono text-emerald-400">$271.90</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                        <span className="text-sm text-slate-300">Spent: <span className="font-mono text-indigo-400">$84.30</span></span>
                    </div>
                </div>
            </div>
        </div>

        {/* Right Column: Feed & Stats */}
        <div className="lg:col-span-5 space-y-6">
            <ChronicleFeed />

            {/* Entity Trends Mini-widget */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-slate-500" />
                    Trending Entities (7d)
                </h3>
                <div className="flex flex-wrap gap-2">
                    {['Gemini 3 Flash', 'GPT-5.2', 'SpaceX', 'Tesla', 'DeepMind', 'Anthropic'].map((tag, i) => (
                        <div key={tag} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-full text-xs text-slate-300 hover:border-slate-600 cursor-pointer transition-colors">
                            {tag}
                            <span className="text-[10px] text-slate-600 font-mono">{10 - i}</span>
                            <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                        </div>
                    ))}
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};
