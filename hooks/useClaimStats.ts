import { useMemo } from 'react';
import { useClaimsData } from '../contexts/ClaimsContext';

export interface EntityTrend {
  name: string;
  count: number;
  trend: 'up' | 'down' | 'neutral';
}

export interface DayStat {
  day: string;
  total: number;
  models: number;
}

export interface CategoryStat {
  name: string;
  value: number;
  color: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  MODELS: '#3b82f6', // blue-500
  CAPITAL: '#10b981', // emerald-500
  ENERGY: '#eab308', // yellow-500
  ROBOTICS: '#f97316', // orange-500
  SPACE: '#6366f1', // indigo-500
  BIOLOGY: '#f43f5e', // rose-500
  GOVERNANCE: '#94a3b8', // slate-400
  COMPUTE: '#06b6d4', // cyan-500
  INFRASTRUCTURE: '#71717a', // zinc-500
  CONSCIOUSNESS: '#a855f7', // purple-500
};

export const useClaimStats = () => {
  const { claims, loading, feedStatuses } = useClaimsData();

  const topClaim = useMemo(() => {
    if (claims.length === 0) return null;

    return [...claims].sort((a, b) => {
      const isFallback = (c: typeof a) => c.entities.length <= 1 && !c.metric_value && !c.original_sentence;
      const aScore = (isFallback(a) ? -20 : 0) +
                     (a.category === 'MODELS' || a.category === 'COMPUTE' ? 10 : 0) +
                     (a.metric_value ? 5 : 0) +
                     (a.confidence === 'high' ? 3 : a.confidence === 'medium' ? 1 : 0) +
                     (a.entities.length >= 2 ? 2 : 0);
      const bScore = (isFallback(b) ? -20 : 0) +
                     (b.category === 'MODELS' || b.category === 'COMPUTE' ? 10 : 0) +
                     (b.metric_value ? 5 : 0) +
                     (b.confidence === 'high' ? 3 : b.confidence === 'medium' ? 1 : 0) +
                     (b.entities.length >= 2 ? 2 : 0);
      
      if (bScore !== aScore) return bScore - aScore;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    })[0];
  }, [claims]);

  const trendingEntities = useMemo(() => {
    const counts: Record<string, { total: number; recent: number; old: number }> = {};
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    claims.forEach(claim => {
      const claimDate = new Date(claim.date);
      if (claimDate < sevenDaysAgo) return;

      claim.entities.forEach(entity => {
        if (!counts[entity]) counts[entity] = { total: 0, recent: 0, old: 0 };
        counts[entity].total += 1;
        if (claimDate >= threeDaysAgo) {
          counts[entity].recent += 1;
        } else {
          counts[entity].old += 1;
        }
      });
    });

    return Object.entries(counts)
      .map(([name, stat]): EntityTrend => ({
        name,
        count: stat.total,
        trend: stat.recent > (stat.old / 4 * 3) ? 'up' : stat.recent < (stat.old / 4) ? 'down' : 'neutral'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [claims]);

  const chartData = useMemo((): DayStat[] => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    const result: DayStat[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dayName = days[d.getDay()];
      const dayStart = new Date(d.setHours(0, 0, 0, 0));
      const dayEnd = new Date(d.setHours(23, 59, 59, 999));

      const dayClaims = claims.filter(c => {
        const date = new Date(c.date);
        return date >= dayStart && date <= dayEnd;
      });

      result.push({
        day: dayName,
        total: dayClaims.length,
        models: dayClaims.filter(c => c.category === 'MODELS').length
      });
    }
    return result;
  }, [claims]);

  const categoryStats = useMemo((): CategoryStat[] => {
    const counts: Record<string, number> = {};
    claims.forEach(c => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({
      name,
      value,
      color: CATEGORY_COLORS[name] || '#64748b'
    })).sort((a, b) => b.value - a.value);
  }, [claims]);

  return { 
    topClaim, 
    trendingEntities, 
    chartData, 
    categoryStats, 
    feedStatuses, 
    loading,
    totalClaims: claims.length
  };
};
