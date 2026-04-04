import type { Claim } from '../types';
import { FONTS, LINE_HEIGHTS } from '../utils/pretext';

// Canvas share card: 1200x630 OG image dimensions

const CARD_W = 1200;
const CARD_H = 630;

const CATEGORY_HEX: Record<string, string> = {
  MODELS: '#3B82F6',
  CAPITAL: '#10B981',
  ENERGY: '#EAB308',
  ROBOTICS: '#F97316',
  SPACE: '#6366F1',
  BIOLOGY: '#F43F5E',
  GOVERNANCE: '#94A3B8',
  COMPUTE: '#06B6D4',
  INFRASTRUCTURE: '#71717A',
  CONSCIOUSNESS: '#A855F7',
};

const CONFIDENCE_HEX: Record<string, string> = {
  high: '#10B981',
  medium: '#F59E0B',
  low: '#EF4444',
};

/**
 * Render a share card (1200x630) for a claim to an offscreen canvas, returning a PNG Blob.
 */
export async function renderShareCard(claim: Claim): Promise<Blob> {
  // Try loading pretext for proper text layout
  let pretext: typeof import('@chenglou/pretext') | null = null;
  try {
    pretext = await import('@chenglou/pretext');
  } catch {
    // fallback to manual wrapping
  }

  const canvas = new OffscreenCanvas(CARD_W, CARD_H);
  const ctx = canvas.getContext('2d')!;

  // --- Background ---
  ctx.fillStyle = '#020617'; // slate-950
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle gradient overlay
  const grad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  grad.addColorStop(0, 'rgba(99, 102, 241, 0.06)');
  grad.addColorStop(0.5, 'rgba(2, 6, 23, 0)');
  grad.addColorStop(1, 'rgba(99, 102, 241, 0.04)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Top-right decorative glow
  const radGrad = ctx.createRadialGradient(CARD_W - 100, 100, 0, CARD_W - 100, 100, 400);
  radGrad.addColorStop(0, 'rgba(99, 102, 241, 0.08)');
  radGrad.addColorStop(1, 'rgba(99, 102, 241, 0)');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const pad = 60;
  let y = pad;

  // --- Top row: category badge + date ---
  const catColor = CATEGORY_HEX[claim.category] || '#94A3B8';
  const badgeText = claim.category;

  // Category badge (colored rounded rect)
  ctx.font = '700 14px "Geist", sans-serif';
  const badgeMetrics = ctx.measureText(badgeText);
  const badgePadX = 14;
  const badgePadY = 6;
  const badgeW = badgeMetrics.width + badgePadX * 2;
  const badgeH = 28;

  ctx.fillStyle = catColor;
  ctx.beginPath();
  ctx.roundRect(pad, y, badgeW, badgeH, 6);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, pad + badgePadX, y + badgeH / 2 + 1);

  // Confidence indicator
  const confColor = CONFIDENCE_HEX[claim.confidence] || CONFIDENCE_HEX.medium;
  const confText = claim.confidence.toUpperCase();
  ctx.font = '600 12px "Geist", sans-serif';
  const confMetrics = ctx.measureText(confText);
  const confX = pad + badgeW + 16;
  const confBadgeW = confMetrics.width + 20;
  ctx.strokeStyle = confColor;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(confX, y + 2, confBadgeW, 24, 4);
  ctx.stroke();
  ctx.fillStyle = confColor;
  ctx.textBaseline = 'middle';
  ctx.fillText(confText, confX + 10, y + badgeH / 2);

  // Date (right-aligned)
  const formattedDate = new Date(claim.date)
    .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    .toUpperCase();
  ctx.font = '500 14px "Geist Mono", monospace';
  ctx.fillStyle = '#64748B'; // slate-500
  ctx.textBaseline = 'middle';
  const dateMetrics = ctx.measureText(formattedDate);
  ctx.fillText(formattedDate, CARD_W - pad - dateMetrics.width, y + badgeH / 2 + 1);

  y += badgeH + 36;

  // --- Center: claim text ---
  // Layout area: left text, optional right metric
  const hasMetric = !!claim.metric_value;
  const metricColWidth = hasMetric ? 220 : 0;
  const textAreaWidth = CARD_W - pad * 2 - metricColWidth - (hasMetric ? 40 : 0);

  const headingFont = '700 32px "Geist", sans-serif';
  const headingLineHeight = 44;

  let claimLines: string[] = [];

  if (pretext) {
    try {
      const prepared = pretext.prepareWithSegments(claim.claim_text, headingFont);
      const result = pretext.layoutWithLines(prepared, textAreaWidth, headingLineHeight);
      claimLines = result.lines.map((l) => l.text);
    } catch {
      claimLines = [];
    }
  }

  // Fallback: manual word-wrap if pretext didn't produce lines
  if (claimLines.length === 0) {
    ctx.font = headingFont;
    const words = claim.claim_text.split(' ');
    let currentLine = '';
    for (const word of words) {
      const test = currentLine ? currentLine + ' ' + word : word;
      if (ctx.measureText(test).width > textAreaWidth && currentLine) {
        claimLines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = test;
      }
    }
    if (currentLine) claimLines.push(currentLine);
  }

  // Render claim lines
  ctx.font = headingFont;
  ctx.fillStyle = '#F1F5F9'; // slate-100
  ctx.textBaseline = 'top';

  const maxVisibleLines = 6;
  const visibleLines = claimLines.slice(0, maxVisibleLines);

  for (let i = 0; i < visibleLines.length; i++) {
    let lineText = visibleLines[i];
    if (i === maxVisibleLines - 1 && claimLines.length > maxVisibleLines) {
      lineText = lineText.replace(/\s+\S*$/, '...');
    }
    ctx.fillText(lineText, pad, y + i * headingLineHeight);
  }

  // --- Right: metric value (if present) ---
  if (hasMetric) {
    const metricX = CARD_W - pad - metricColWidth;
    const metricY = y + 8;

    // Metric value
    ctx.font = '500 48px "Geist Mono", monospace';
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'top';
    ctx.fillText(claim.metric_value!, metricX, metricY);

    // Unit
    if (claim.metric_unit) {
      ctx.font = '400 18px "Geist", sans-serif';
      ctx.fillStyle = '#94A3B8';
      ctx.fillText(claim.metric_unit, metricX, metricY + 58);
    }

    // Context
    if (claim.metric_context) {
      ctx.font = '400 14px "Geist", sans-serif';
      ctx.fillStyle = '#64748B';
      const contextLines = wrapText(ctx, claim.metric_context, metricColWidth, '400 14px "Geist", sans-serif');
      for (let i = 0; i < Math.min(contextLines.length, 3); i++) {
        ctx.fillText(contextLines[i], metricX, metricY + (claim.metric_unit ? 86 : 58) + i * 20);
      }
    }
  }

  // --- Bottom section ---
  const bottomY = CARD_H - pad - 10;

  // Entity chips
  if (claim.entities.length > 0) {
    const chipY = bottomY - 44;
    let chipX = pad;
    ctx.textBaseline = 'middle';

    const chips = claim.entities
      .filter((e) => e !== claim.source_feed_name && e !== claim.source_name)
      .slice(0, 5);

    for (const entity of chips) {
      ctx.font = '500 13px "Geist", sans-serif';
      const m = ctx.measureText(entity);
      const chipW = m.width + 20;
      const chipH = 28;

      // Chip bg
      ctx.fillStyle = 'rgba(51, 65, 85, 0.6)'; // slate-700/60
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipW, chipH, 14);
      ctx.fill();

      // Chip border
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.5)'; // slate-600/50
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(chipX, chipY, chipW, chipH, 14);
      ctx.stroke();

      // Chip text
      ctx.fillStyle = '#CBD5E1'; // slate-300
      ctx.fillText(entity, chipX + 10, chipY + chipH / 2 + 1);

      chipX += chipW + 8;
      if (chipX > CARD_W - pad - 100) break;
    }
  }

  // Source name (bottom left)
  ctx.font = '500 14px "Geist", sans-serif';
  ctx.fillStyle = '#64748B';
  ctx.textBaseline = 'bottom';
  ctx.fillText(claim.source_feed_name, pad, bottomY);

  // Watermark (bottom right)
  ctx.font = '700 12px "Geist", sans-serif';
  ctx.fillStyle = '#334155'; // slate-700
  const watermark = 'ARBITER INTELLIGENCE';
  const wmMetrics = ctx.measureText(watermark);
  ctx.fillText(watermark, CARD_W - pad - wmMetrics.width, bottomY);

  // Subtle bottom border line
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, CARD_H - 20);
  ctx.lineTo(CARD_W - pad, CARD_H - 20);
  ctx.stroke();

  // Export as PNG blob
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return blob;
}

/** Simple word-wrap helper for canvas text */
function wrapText(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font: string,
): string[] {
  ctx.font = font;
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}
