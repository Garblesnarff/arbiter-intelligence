import React, { useState, useCallback } from 'react';
import { Image, Loader2 } from 'lucide-react';
import { renderShareCard } from './ShareCard';
import type { Claim } from '../types';

type ShareCardButtonProps = {
  claim: Claim;
  className?: string;
};

export const ShareCardButton: React.FC<ShareCardButtonProps> = ({ claim, className }) => {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const blob = await renderShareCard(claim);
      const url = URL.createObjectURL(blob);
      const filename = `arbiter-${claim.category.toLowerCase()}-${Date.now()}.png`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      // Clean up the object URL after a short delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      console.error('ShareCardButton: render failed', err);
    } finally {
      setLoading(false);
    }
  }, [claim, loading]);

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      title="Download share card"
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
        text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800
        disabled:opacity-50 disabled:cursor-wait
        ${className || ''}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Image className="w-4 h-4" />
      )}
      Share Card
    </button>
  );
};
