import { useMemo, useRef } from 'react';

type LayoutLine = {
  text: string;
  x: number;
  y: number;
  width: number;
};

type PretextLayoutInput = {
  text: string;
  font: string;
  maxWidth: number;
  lineHeight: number;
  floatWidth?: number;
  floatHeight?: number;
};

type PretextLayoutResult = {
  lines: LayoutLine[];
  totalHeight: number;
};

// Lazy import cache so we only resolve the module once
let pretextModule: typeof import('@chenglou/pretext') | null = null;
let pretextLoadFailed = false;

function getPretextSync() {
  if (pretextLoadFailed) return null;
  if (pretextModule) return pretextModule;
  try {
    // The module is already bundled by Vite; dynamic import returns a thenable
    // but for a hook we need sync access. We eagerly import at module level instead.
    return null; // Will be set by the eager loader below
  } catch {
    pretextLoadFailed = true;
    return null;
  }
}

// Eagerly load pretext at module evaluation time
import('@chenglou/pretext')
  .then((mod) => {
    pretextModule = mod;
  })
  .catch(() => {
    pretextLoadFailed = true;
  });

type PreparedCache = {
  text: string;
  font: string;
  prepared: import('@chenglou/pretext').PreparedTextWithSegments;
};

export function usePretextLayout({
  text,
  font,
  maxWidth,
  lineHeight,
  floatWidth,
  floatHeight,
}: PretextLayoutInput): PretextLayoutResult {
  const cacheRef = useRef<PreparedCache | null>(null);

  return useMemo(() => {
    const empty: PretextLayoutResult = { lines: [], totalHeight: 0 };

    const pretext = pretextModule;
    if (!pretext || !text || maxWidth <= 0) return empty;

    try {
      // Reuse prepared text if text+font haven't changed
      let prepared: import('@chenglou/pretext').PreparedTextWithSegments;
      if (
        cacheRef.current &&
        cacheRef.current.text === text &&
        cacheRef.current.font === font
      ) {
        prepared = cacheRef.current.prepared;
      } else {
        prepared = pretext.prepareWithSegments(text, font);
        cacheRef.current = { text, font, prepared };
      }

      const gap = 16; // px gap between text and float
      const hasFloat = floatWidth && floatWidth > 0 && floatHeight && floatHeight > 0;

      const lines: LayoutLine[] = [];
      let cursor: import('@chenglou/pretext').LayoutCursor = {
        segmentIndex: 0,
        graphemeIndex: 0,
      };
      let y = 0;

      while (true) {
        // Determine available width for this line
        let availableWidth = maxWidth;
        if (hasFloat && y < floatHeight!) {
          availableWidth = maxWidth - floatWidth! - gap;
          // Guard against impossibly narrow lines
          if (availableWidth < 40) availableWidth = maxWidth;
        }

        const line = pretext.layoutNextLine(prepared, cursor, availableWidth);
        if (!line) break;

        lines.push({
          text: line.text,
          x: 0,
          y,
          width: line.width,
        });

        cursor = line.end;
        y += lineHeight;
      }

      return { lines, totalHeight: y };
    } catch (e) {
      console.warn('usePretextLayout: layout failed', e);
      return empty;
    }
  }, [text, font, maxWidth, lineHeight, floatWidth, floatHeight]);
}
