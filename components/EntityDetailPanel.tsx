import React from 'react';
import type { EntityDetail } from '../services/claimsPersistence';
import { ENTITY_TYPE_COLORS } from './semiotic/theme';

interface EntityDetailPanelProps {
  detail: EntityDetail | null;
  onClose: () => void;
  onEntityClick?: (entityId: string) => void;
}

function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Side panel showing entity details, related claims, and related entities.
 * Slides in from the right with animation.
 */
export default function EntityDetailPanel({
  detail,
  onClose,
  onEntityClick,
}: EntityDetailPanelProps) {
  if (!detail) return null;

  const { entity, claims, related } = detail;
  const typeColor =
    ENTITY_TYPE_COLORS[entity.entity_type ?? 'unknown'] ??
    ENTITY_TYPE_COLORS.unknown;

  return (
    <div
      className="animate-slide-in-right"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 350,
        background: '#0f172a',
        borderLeft: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 600,
              color: '#f1f5f9',
              lineHeight: 1.3,
              wordBreak: 'break-word',
            }}
          >
            {entity.canonical_name}
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            {entity.entity_type && (
              <span
                style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  borderRadius: 9999,
                  fontSize: 11,
                  fontWeight: 500,
                  background: typeColor + '22',
                  color: typeColor,
                  border: `1px solid ${typeColor}44`,
                  textTransform: 'capitalize',
                }}
              >
                {entity.entity_type}
              </span>
            )}
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              {entity.mention_count} mention{entity.mention_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close detail panel"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            color: '#64748b',
            fontSize: 20,
            lineHeight: 1,
            flexShrink: 0,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#e2e8f0')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
        >
          &#x2715;
        </button>
      </div>

      {/* Date range */}
      <div
        style={{
          padding: '10px 20px',
          borderBottom: '1px solid #1e293b',
          fontSize: 12,
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <span>First seen: {formatDate(entity.first_seen)}</span>
        <span>Last seen: {formatDate(entity.last_seen)}</span>
      </div>

      {/* Related entities */}
      {related.length > 0 && (
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #1e293b',
            flexShrink: 0,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#94a3b8',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: 8,
            }}
          >
            Related Entities
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {related.map((rel) => {
              const relColor =
                ENTITY_TYPE_COLORS[rel.entity_type ?? 'unknown'] ??
                ENTITY_TYPE_COLORS.unknown;
              return (
                <button
                  key={rel.id}
                  onClick={() => onEntityClick?.(rel.id)}
                  style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 500,
                    background: relColor + '18',
                    color: relColor,
                    border: `1px solid ${relColor}33`,
                    cursor: onEntityClick ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = relColor + '30')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = relColor + '18')
                  }
                >
                  {rel.canonical_name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Claims list */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px 20px 8px',
            fontSize: 11,
            fontWeight: 600,
            color: '#94a3b8',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            flexShrink: 0,
          }}
        >
          Claims ({claims.length})
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0 20px 16px',
          }}
        >
          {claims.length === 0 ? (
            <div style={{ fontSize: 13, color: '#475569', paddingTop: 8 }}>
              No claims linked to this entity yet.
            </div>
          ) : (
            claims.map((claim) => (
              <div
                key={claim.id}
                style={{
                  padding: '10px 0',
                  borderBottom: '1px solid #1e293b',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: '#cbd5e1',
                  }}
                >
                  {claim.claim_text}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 6,
                    fontSize: 11,
                    color: '#64748b',
                  }}
                >
                  <span>{formatDate(claim.date)}</span>
                  {claim.source_feed_name && (
                    <>
                      <span style={{ color: '#334155' }}>|</span>
                      <span>{claim.source_feed_name}</span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
