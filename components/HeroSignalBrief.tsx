import React, { useRef, useState, useEffect } from 'react';
import { Zap, ExternalLink, ArrowRight } from 'lucide-react';
import { usePretextLayout } from '../hooks/usePretextLayout';
import { CategoryIcon, CATEGORY_BADGE_COLORS } from './shared/CategoryIcon';
import { FONTS, LINE_HEIGHTS } from '../utils/pretext';
import type { Claim } from '../types';

const CONFIDENCE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  high: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label: 'HIGH CONFIDENCE' },
  medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'MEDIUM' },
  low: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'LOW' },
};

const SENTIMENT_INDICATOR: Record<string, string> = {
  positive: 'text-emerald-400',
  negative: 'text-red-400',
  neutral: 'text-slate-400',
};

type HeroSignalBriefProps = {
  claim: Claim;
  onViewAnalysis?: () => void;
  onViewOriginal?: () => void;
};

// Metrics panel dimensions for float layout
const FLOAT_WIDTH = 200;
const FLOAT_HEIGHT = 180;

export const HeroSignalBrief: React.FC<HeroSignalBriefProps> = ({
  claim,
  onViewAnalysis,
  onViewOriginal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const isShortText = claim.claim_text.length < 100;
  const isMobile = containerWidth > 0 && containerWidth < 768;
  const useFloatLayout = !isMobile && !isShortText && containerWidth > 0;

  // Available width for text (subtract padding)
  const textMaxWidth = useFloatLayout ? containerWidth - 48 : 0; // 24px padding each side

  const { lines, totalHeight } = usePretextLayout({
    text: claim.claim_text,
    font: FONTS.headingLg,
    maxWidth: textMaxWidth,
    lineHeight: LINE_HEIGHTS.headingLg,
    floatWidth: useFloatLayout ? FLOAT_WIDTH : undefined,
    floatHeight: useFloatLayout ? FLOAT_HEIGHT : undefined,
  });

  const conf = CONFIDENCE_STYLES[claim.confidence] || CONFIDENCE_STYLES.medium;
  const sentimentColor = SENTIMENT_INDICATOR[claim.sentiment] || SENTIMENT_INDICATOR.neutral;

  const filteredEntities = claim.entities
    .filter((e) => e !== claim.source_feed_name && e !== claim.source_name)
    .slice(0, 3);

  const formattedDate = new Date(claim.date)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();

  // Metrics panel rendered as a float or block depending on layout mode
  const metricsPanel = (
    <div
      className={
        useFloatLayout
          ? 'absolute top-6 right-6 z-10'
          : 'mt-4 mb-2'
      }
      style={useFloatLayout ? { width: FLOAT_WIDTH } : undefined}
    >
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 backdrop-blur-sm space-y-3">
        {/* Confidence badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider ${conf.bg} ${conf.text} border border-current/20`}>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              claim.confidence === 'high'
                ? 'bg-emerald-400'
                : claim.confidence === 'medium'
                ? 'bg-amber-400'
                : 'bg-red-400'
            }`}
          />
          {conf.label}
        </div>

        {/* Metric value */}
        {claim.metric_value && (
          <div>
            <div className="text-2xl font-mono font-medium text-white leading-tight">
              {claim.metric_value}
              {claim.metric_unit && (
                <span className="text-sm text-slate-400 ml-1">{claim.metric_unit}</span>
              )}
            </div>
            {claim.metric_context && (
              <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                {claim.metric_context}
              </p>
            )}
          </div>
        )}

        {/* Entity chips */}
        {filteredEntities.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {filteredEntities.map((entity) => (
              <span
                key={entity}
                className="text-[10px] font-medium px-2 py-0.5 bg-slate-700/50 rounded border border-slate-600/40 text-slate-300"
              >
                {entity}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group"
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
        <Zap className="w-32 h-32 text-indigo-500" />
      </div>

      <div className="relative z-10">
        {/* Header row: badge + category + date */}
        <div className="flex items-center gap-2 mb-3">
          <span className="bg-indigo-500/15 text-indigo-400 text-[11px] font-bold px-2 py-0.5 rounded border border-indigo-500/25 uppercase tracking-wider">
            PRIMARY SIGNAL
          </span>
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
              CATEGORY_BADGE_COLORS[claim.category] || 'text-slate-400 bg-slate-500/10 border-slate-500/20'
            }`}
          >
            <CategoryIcon category={claim.category} size="sm" />
            {claim.category}
          </span>
          <span className="text-slate-500 text-xs font-mono">{formattedDate}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${sentimentColor.replace('text-', 'bg-')}`} />
        </div>

        {/* Float layout: pretext-rendered lines + metrics panel */}
        {useFloatLayout && lines.length > 0 ? (
          <div className="relative mb-4" style={{ minHeight: Math.max(totalHeight, FLOAT_HEIGHT + 8) }}>
            {metricsPanel}
            {lines.map((line, i) => (
              <span
                key={i}
                className="absolute text-white font-bold leading-tight"
                style={{
                  left: line.x,
                  top: line.y,
                  fontSize: 28,
                  fontFamily: '"Geist", sans-serif',
                  fontWeight: 700,
                  lineHeight: `${LINE_HEIGHTS.headingLg}px`,
                }}
              >
                {line.text}
              </span>
            ))}
          </div>
        ) : (
          /* Block fallback layout */
          <>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 max-w-2xl leading-tight">
              {claim.claim_text}
            </h1>
            {metricsPanel}
          </>
        )}

        {/* Source row */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <CategoryIcon category={claim.category} size="sm" />
            <span className="text-sm font-medium">{claim.source_feed_name}</span>
          </div>
          {claim.source_name && claim.source_name !== claim.source_feed_name && (
            <span className="text-xs text-slate-500">{claim.source_name}</span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={onViewAnalysis}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors inline-flex items-center gap-2"
          >
            View Signal Analysis
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onViewOriginal}
            className="text-slate-400 hover:text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-800 hover:bg-slate-800 inline-flex items-center gap-2"
          >
            View Original
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
