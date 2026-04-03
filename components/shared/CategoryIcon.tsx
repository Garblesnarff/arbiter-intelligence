import React from 'react';
import { Cpu, DollarSign, Zap, Activity, Globe, Rocket, Heart, Shield, Hash, Database } from 'lucide-react';

const CATEGORY_MAP: Record<string, { icon: React.ElementType; colorClass: string }> = {
  MODELS: { icon: Cpu, colorClass: 'text-blue-400' },
  CAPITAL: { icon: DollarSign, colorClass: 'text-emerald-400' },
  ENERGY: { icon: Zap, colorClass: 'text-yellow-400' },
  ROBOTICS: { icon: Activity, colorClass: 'text-orange-400' },
  SPACE: { icon: Rocket, colorClass: 'text-indigo-400' },
  BIOLOGY: { icon: Heart, colorClass: 'text-rose-400' },
  GOVERNANCE: { icon: Shield, colorClass: 'text-slate-300' },
  COMPUTE: { icon: Hash, colorClass: 'text-cyan-400' },
  INFRASTRUCTURE: { icon: Database, colorClass: 'text-zinc-400' },
  CONSCIOUSNESS: { icon: Globe, colorClass: 'text-purple-400' },
};

export const CATEGORY_BADGE_COLORS: Record<string, string> = {
  MODELS: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  CAPITAL: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  ENERGY: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
  ROBOTICS: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  SPACE: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  BIOLOGY: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  GOVERNANCE: 'text-slate-300 bg-slate-500/10 border-slate-500/20',
  COMPUTE: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  INFRASTRUCTURE: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  CONSCIOUSNESS: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
};

export const CATEGORY_SOLID_COLORS: Record<string, string> = {
  MODELS: 'bg-blue-500',
  CAPITAL: 'bg-emerald-500',
  ENERGY: 'bg-yellow-500',
  ROBOTICS: 'bg-orange-500',
  SPACE: 'bg-indigo-500',
  BIOLOGY: 'bg-rose-500',
  GOVERNANCE: 'bg-slate-400',
  COMPUTE: 'bg-cyan-500',
  INFRASTRUCTURE: 'bg-zinc-500',
  CONSCIOUSNESS: 'bg-purple-500',
};

type CategoryIconProps = {
  category: string;
  size?: 'sm' | 'md';
};

export const CategoryIcon = ({ category, size = 'sm' }: CategoryIconProps) => {
  const entry = CATEGORY_MAP[category] || { icon: Globe, colorClass: 'text-slate-400' };
  const Icon = entry.icon;
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  return <Icon className={`${sizeClass} ${entry.colorClass}`} />;
};
