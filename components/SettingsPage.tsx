
import React from 'react';
import { User, Shield, CreditCard, LogOut, Key, Database, CheckCircle2, AlertTriangle } from 'lucide-react';
import { FEED_SOURCES } from '../constants';

export const SettingsPage = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      {/* Profile Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <User className="w-8 h-8 text-slate-400" />
            </div>
            <div className="flex-1">
                <h2 className="text-lg font-semibold text-slate-200">Rob</h2>
                <p className="text-slate-400 text-sm mb-4">rob@example.com</p>
                <div className="flex gap-3">
                    <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded font-medium">
                        Pro Plan
                    </span>
                    <span className="text-xs bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded">
                        Member since Dec 2025
                    </span>
                </div>
            </div>
            <button className="text-sm text-slate-400 hover:text-white border border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors">
                Edit Profile
            </button>
        </div>

        <div className="divide-y divide-slate-800">
             {/* API Keys */}
            <div className="p-6 flex items-center gap-4 hover:bg-slate-800/30 transition-colors cursor-pointer">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <Key className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-slate-200">API Configuration</h3>
                    <p className="text-xs text-slate-500">Manage your Arbiter API keys and provider integrations.</p>
                </div>
                <div className="text-xs text-slate-500 font-mono">2 Active Keys</div>
            </div>

            {/* Billing */}
            <div className="p-6 flex items-center gap-4 hover:bg-slate-800/30 transition-colors cursor-pointer">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <CreditCard className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-slate-200">Subscription & Billing</h3>
                    <p className="text-xs text-slate-500">Update payment methods and view invoices.</p>
                </div>
            </div>
        </div>
      </div>

      {/* Signal Sources Feed Management */}
      <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white">Signal Sources</h2>
            <span className="ml-auto text-xs text-slate-500 font-mono">{FEED_SOURCES.length} Active Feeds</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
             {FEED_SOURCES.map((source) => (
               <div key={source.name} className="p-4 flex items-center gap-4 hover:bg-slate-800/20 transition-colors">
                  <div className={`w-2 h-2 rounded-full ${source.quality === 'High' ? 'bg-emerald-500' : 'bg-yellow-500'}`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-100">{source.name}</span>
                        <span className="text-[10px] text-slate-600 font-mono tracking-tighter uppercase">{source.author}</span>
                    </div>
                    <div className="flex gap-2 mt-1">
                       {source.categories.map(cat => (
                         <span key={cat} className="text-[9px] px-1.5 py-0.5 bg-slate-950 border border-slate-800 text-slate-500 rounded uppercase font-bold tracking-widest">{cat}</span>
                       ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                     <span className="text-[10px] font-bold text-emerald-500/80 bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10">ACTIVE</span>
                     <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
               </div>
             ))}
          </div>
          <p className="text-xs text-slate-500 italic text-center">
            Signal quality is assessed based on historical accuracy and impact of the publisher's reports.
          </p>
      </div>

      <div className="pt-4 border-t border-slate-800">
        <button className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
        </button>
      </div>
    </div>
  );
};
