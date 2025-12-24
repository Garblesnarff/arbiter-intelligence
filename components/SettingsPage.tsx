import React from 'react';
import { User, Shield, CreditCard, LogOut, Key } from 'lucide-react';

export const SettingsPage = () => {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
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
                <div className="text-xs text-slate-500">2 Active Keys</div>
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

            {/* Security */}
            <div className="p-6 flex items-center gap-4 hover:bg-slate-800/30 transition-colors cursor-pointer">
                <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-medium text-slate-200">Security</h3>
                    <p className="text-xs text-slate-500">Password, 2FA, and active sessions.</p>
                </div>
            </div>
        </div>
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