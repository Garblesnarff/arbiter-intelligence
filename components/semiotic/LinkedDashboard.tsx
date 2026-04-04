import React, { type PropsWithChildren } from 'react';
import { LinkedSelectionProvider } from '../../contexts/LinkedSelectionContext';

/**
 * LinkedDashboard wraps children in the app-level cross-filtering context.
 * Semiotic's LinkedCharts/CategoryColorProvider are used only inside
 * individual chart components to avoid React context conflicts.
 */
export const LinkedDashboard: React.FC<PropsWithChildren<{ className?: string }>> = ({
  children,
  className,
}) => {
  return (
    <LinkedSelectionProvider>
      <div className={className}>{children}</div>
    </LinkedSelectionProvider>
  );
};
