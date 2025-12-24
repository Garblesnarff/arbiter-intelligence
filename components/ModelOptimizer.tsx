import React, { useState } from 'react';
import { Search, Sparkles, ChevronRight, BarChart2, CheckCircle2, AlertCircle } from 'lucide-react';
import { analyzeTask } from '../services/geminiService';
import { MODELS } from '../constants';
import { TaskAnalysis, ModelEntry } from '../types';

export const ModelOptimizer = () => {
  const [prompt, setPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<TaskAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<ModelEntry[]>([]);

  const handleAnalyze = async () => {
    if (!prompt.trim()) return;
    setIsAnalyzing(true);
    setAnalysis(null);

    // 1. Get Gemini Analysis of the task
    const result = await analyzeTask(prompt);
    setAnalysis(result);

    // 2. Filter and Sort Models based on Intelligence
    const compatibleModels = MODELS.filter(m => 
        m.recommended_for.includes(result.category) || 
        m.recommended_for.includes("general" as any)
    );

    // Simple scoring: prioritize models with specific chronicle intelligence snippets
    // In a real app, this would be the complex scoring algorithm from PRD 2.3
    const ranked = compatibleModels.sort((a, b) => {
        // Prioritize models with chronicle data relevant to task
        if (a.chronicle_snippet && !b.chronicle_snippet) return -1;
        if (!a.chronicle_snippet && b.chronicle_snippet) return 1;
        // Then by cost (cheaper first for MVP)
        return a.input_cost_per_1m - b.input_cost_per_1m;
    });

    setRecommendations(ranked.slice(0, 3)); // Top 3
    setIsAnalyzing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Input Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Find Your Optimal Model
        </h2>
        
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your task (e.g., 'Review this Python code for bugs' or 'Write a creative story about Mars')..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 min-h-[120px] resize-none"
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !prompt}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                ${isAnalyzing || !prompt 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-900/20'}`}
            >
              {isAnalyzing ? (
                <>
                    <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                    Analyzing...
                </>
              ) : (
                <>
                    <Search className="w-4 h-4" />
                    Analyze & Recommend
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {analysis && (
        <div className="animate-fade-in space-y-6">
            
            {/* Analysis Summary */}
            <div className="flex items-center gap-4 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
                <div className="p-2 bg-purple-500/10 rounded-md">
                    <BarChart2 className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                    <div className="text-xs text-slate-500 uppercase font-semibold">Task Detected</div>
                    <div className="text-slate-200 font-medium">{analysis.category.replace('_', ' ')} <span className="text-slate-600">•</span> {analysis.complexity} complexity</div>
                </div>
                <div className="ml-auto text-sm text-slate-400 italic">
                    "{analysis.reasoning}"
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recommendations.map((model, idx) => (
                    <div key={model.id} className={`relative p-5 rounded-xl border transition-all hover:translate-y-[-2px]
                        ${idx === 0 
                            ? 'bg-gradient-to-b from-slate-900 to-slate-900 border-purple-500/50 shadow-lg shadow-purple-900/10' 
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                        
                        {idx === 0 && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-sm tracking-wide">
                                TOP RECOMMENDATION
                            </div>
                        )}

                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-100">{model.name}</h3>
                                <p className="text-xs text-slate-500">{model.provider}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-mono text-emerald-400">${model.input_cost_per_1m.toFixed(2)}</div>
                                <div className="text-[10px] text-slate-600">/ 1M tokens</div>
                            </div>
                        </div>

                        {/* Chronicle Intelligence Badge */}
                        {model.chronicle_snippet && (
                             <div className="mb-4 p-3 bg-blue-950/30 border border-blue-900/50 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <Sparkles className="w-3 h-3 text-blue-400" />
                                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Chronicle Intel</span>
                                </div>
                                <p className="text-xs text-blue-200 italic leading-relaxed">
                                    "{model.chronicle_snippet}"
                                </p>
                             </div>
                        )}

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-xs border-b border-slate-800 pb-2">
                                <span className="text-slate-500">Benchmark (Best)</span>
                                <span className="text-slate-300 font-mono">
                                    {Object.values(model.benchmarks)[0] || 'N/A'}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs border-b border-slate-800 pb-2">
                                <span className="text-slate-500">Latency</span>
                                <span className={`font-medium ${
                                    model.latency_tier === 'fast' ? 'text-emerald-400' : 
                                    model.latency_tier === 'medium' ? 'text-yellow-400' : 'text-slate-400'
                                }`}>
                                    {model.latency_tier.toUpperCase()}
                                </span>
                            </div>
                        </div>

                        <button className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-2 group">
                            Select Model
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};
