import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useClaimsData } from '../contexts/ClaimsContext';
import type { Claim } from '../types';

export interface SignalDataPoint {
  time: number;
  total: number;
  models: number;
}

/**
 * Rounds a Date-parseable string down to the start of its hour (UTC ms).
 */
function toHourBucket(dateStr: string): number {
  const d = new Date(dateStr);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

/**
 * Buckets an array of claims into hourly SignalDataPoints.
 * Returns points sorted ascending by time.
 */
function bucketClaims(claims: Claim[]): SignalDataPoint[] {
  const map = new Map<number, { total: number; models: number }>();

  for (const claim of claims) {
    const t = toHourBucket(claim.date);
    const bucket = map.get(t) ?? { total: 0, models: 0 };
    bucket.total += 1;
    if (claim.model_relevance) {
      bucket.models += 1;
    }
    map.set(t, bucket);
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, counts]) => ({ time, ...counts }));
}

/**
 * Consumes claims from ClaimsContext and transforms them into hourly
 * time-bucketed data points suitable for the Signal River chart.
 *
 * Tracks seen claim IDs to avoid double-counting when claims array
 * is updated with a mix of old and new entries.
 */
export function useSignalStream() {
  const { claims } = useClaimsData();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const [streamData, setStreamData] = useState<SignalDataPoint[]>([]);
  const [latestClaims, setLatestClaims] = useState<Claim[]>([]);

  const processNewClaims = useCallback((allClaims: Claim[]) => {
    const seen = seenIdsRef.current;
    const newClaims = allClaims.filter((c) => !seen.has(c.id));

    if (newClaims.length === 0) return;

    for (const c of newClaims) {
      seen.add(c.id);
    }

    setLatestClaims(newClaims);

    const newBuckets = bucketClaims(newClaims);

    setStreamData((prev) => {
      // Merge new buckets into existing data
      const merged = new Map<number, SignalDataPoint>();

      for (const pt of prev) {
        merged.set(pt.time, { ...pt });
      }

      for (const pt of newBuckets) {
        const existing = merged.get(pt.time);
        if (existing) {
          existing.total += pt.total;
          existing.models += pt.models;
        } else {
          merged.set(pt.time, { ...pt });
        }
      }

      return Array.from(merged.values()).sort((a, b) => a.time - b.time);
    });
  }, []);

  // Process initial + subsequent claim updates
  useEffect(() => {
    if (claims.length > 0) {
      processNewClaims(claims);
    }
  }, [claims, processNewClaims]);

  return useMemo(
    () => ({ streamData, latestClaims }),
    [streamData, latestClaims],
  );
}
