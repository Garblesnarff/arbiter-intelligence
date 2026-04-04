import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { MOCK_CLAIMS } from '../constants';
import { fetchClaimsFromRSS, fetchFeedStatus, LAST_FETCH_KEY, type FeedStatus } from '../services/rssService';
import { fetchHackerNewsClaims, getHNFeedStatus } from '../services/hackernewsAdapter';
import { fetchArxivClaims, getArxivFeedStatus } from '../services/arxivAdapter';
import { fetchGitHubClaims, getGitHubFeedStatus } from '../services/githubAdapter';
import { Claim } from '../types';

type RefreshClaimsOptions = {
  forceRefresh?: boolean;
};

type RefreshClaimsResult = {
  claims: Claim[];
  usingMockData: boolean;
  error: string | null;
};

interface ClaimsContextType {
  claims: Claim[];
  loading: boolean;
  error: string | null;
  usingMockData: boolean;
  feedStatuses: FeedStatus[];
  lastFetchedAt: string | null;
  refreshClaims: (options?: RefreshClaimsOptions) => Promise<RefreshClaimsResult>;
}

const ClaimsContext = createContext<ClaimsContextType | undefined>(undefined);

/** Deduplicate claims by canonical URL or id */
function dedupeClaims(claims: Claim[]): Claim[] {
  const seen = new Set<string>();
  return claims.filter(claim => {
    // Prefer URL-based dedup, fall back to id
    const key = claim.source_url || claim.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Collect feed statuses from all source types */
function getAllFeedStatuses(): FeedStatus[] {
  const rssStatuses = fetchFeedStatus();
  const hnStatus = getHNFeedStatus();
  const arxivStatus = getArxivFeedStatus();
  const ghStatus = getGitHubFeedStatus();
  return [...rssStatuses, hnStatus, arxivStatus, ghStatus];
}

export const ClaimsProvider = ({ children }: PropsWithChildren) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingMockData, setUsingMockData] = useState(false);
  const [feedStatuses, setFeedStatuses] = useState<FeedStatus[]>(() => getAllFeedStatuses());
  const [lastFetchedAt, setLastFetchedAt] = useState<string | null>(() => localStorage.getItem(LAST_FETCH_KEY));
  const claimsRef = useRef<Claim[]>([]);
  const usingMockDataRef = useRef(false);

  useEffect(() => {
    claimsRef.current = claims;
  }, [claims]);

  useEffect(() => {
    usingMockDataRef.current = usingMockData;
  }, [usingMockData]);

  const refreshClaims = useCallback(async ({ forceRefresh = false }: RefreshClaimsOptions = {}): Promise<RefreshClaimsResult> => {
    setLoading(true);
    setError(null);

    try {
      // Fetch from all sources in parallel
      const [rssClaims, hnClaims, arxivClaims, ghClaims] = await Promise.all([
        fetchClaimsFromRSS({ forceRefresh }),
        fetchHackerNewsClaims().catch((err) => { console.warn('HN fetch failed:', err); return [] as Claim[]; }),
        fetchArxivClaims().catch((err) => { console.warn('arXiv fetch failed:', err); return [] as Claim[]; }),
        fetchGitHubClaims().catch((err) => { console.warn('GitHub fetch failed:', err); return [] as Claim[]; }),
      ]);

      const allClaims = dedupeClaims([...rssClaims, ...hnClaims, ...arxivClaims, ...ghClaims]);
      const shouldUseMockData = allClaims.length === 0 && (claimsRef.current.length === 0 || usingMockDataRef.current);
      const nextClaims = allClaims.length > 0
        ? allClaims
        : shouldUseMockData
          ? MOCK_CLAIMS
          : claimsRef.current;

      setClaims(nextClaims);
      setUsingMockData(shouldUseMockData);
      setFeedStatuses(getAllFeedStatuses());
      setLastFetchedAt(localStorage.getItem(LAST_FETCH_KEY));

      return {
        claims: nextClaims,
        usingMockData: shouldUseMockData,
        error: null,
      };
    } catch (caughtError) {
      console.error('Failed to refresh claims:', caughtError);
      const fallbackToMockData = claimsRef.current.length === 0 || usingMockDataRef.current;
      const fallbackClaims = fallbackToMockData ? MOCK_CLAIMS : claimsRef.current;
      const nextError = 'Unable to refresh live claims.';

      setClaims(fallbackClaims);
      setUsingMockData(fallbackToMockData);
      setFeedStatuses(getAllFeedStatuses());
      setLastFetchedAt(localStorage.getItem(LAST_FETCH_KEY));
      setError(nextError);

      return {
        claims: fallbackClaims,
        usingMockData: fallbackToMockData,
        error: nextError,
      };
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshClaims();
  }, [refreshClaims]);

  const value = useMemo<ClaimsContextType>(() => ({
    claims,
    loading,
    error,
    usingMockData,
    feedStatuses,
    lastFetchedAt,
    refreshClaims,
  }), [claims, loading, error, usingMockData, feedStatuses, lastFetchedAt, refreshClaims]);

  return <ClaimsContext.Provider value={value}>{children}</ClaimsContext.Provider>;
};

export const useClaimsData = () => {
  const context = useContext(ClaimsContext);
  if (!context) {
    throw new Error('useClaimsData must be used within a ClaimsProvider');
  }
  return context;
};
