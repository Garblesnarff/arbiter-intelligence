import React from 'react';
import { Dashboard } from './components/Dashboard';
import { LayoutDashboard, BookOpen, Settings, Sliders, Bell, User } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active = false }: { icon: any, label: string, active?: boolean }) => (
  <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
    active 
      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
  }`}>
    <Icon className="w-5 h-5" />
    <span className="text-sm font-medium">{label}</span>
  </div>
);

const App = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-950 hidden md:flex flex-col sticky top-0 h-screen z-20">
        <div className="p-6 border-b border-slate-800">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center">
                    <span className="font-bold text-white">A</span>
                </div>
                <div>
                    <h1 className="font-bold text-lg text-white leading-none">Arbiter</h1>
                    <span className="text-[10px] text-slate-500 tracking-wider">INTELLIGENCE</span>
                </div>
            </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-3 mb-2 mt-2">Platform</div>
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
            <SidebarItem icon={BookOpen} label="Chronicles" />
            <SidebarItem icon={Sliders} label="Model Matrix" />
            
            <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider px-3 mb-2 mt-6">Config</div>
            <SidebarItem icon={Bell} label="Alerts" />
            <SidebarItem icon={Settings} label="Settings" />
        </nav>

        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2">
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                    <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">Rob</div>
                    <div className="text-xs text-slate-500 truncate">Pro Plan</div>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-950/80 backdrop-blur-md sticky top-0 z-10">
            <div className="md:hidden font-bold text-white">Arbiter</div>
            <div className="ml-auto flex items-center gap-4">
                 <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-xs font-medium text-emerald-400">Systems Nominal</span>
                 </div>
                 <Bell className="w-5 h-5 text-slate-400 cursor-pointer hover:text-white" />
            </div>
        </header>

        <Dashboard />
      </main>

    </div>
  );
};

export default App;
