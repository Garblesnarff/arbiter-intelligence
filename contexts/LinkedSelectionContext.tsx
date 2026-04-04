import React, { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

interface LinkedSelectionState {
  hoveredCategory: string | null;
  selectedCategory: string | null;
  setHoveredCategory: (category: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
}

const LinkedSelectionContext = createContext<LinkedSelectionState | undefined>(undefined);

export const LinkedSelectionProvider = ({ children }: PropsWithChildren) => {
  const [hoveredCategory, setHoveredCategoryRaw] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategoryRaw] = useState<string | null>(null);

  const setHoveredCategory = useCallback((category: string | null) => {
    setHoveredCategoryRaw(category);
  }, []);

  const setSelectedCategory = useCallback((category: string | null) => {
    // Toggle off if clicking the same category
    setSelectedCategoryRaw((prev) => (prev === category ? null : category));
  }, []);

  const value = useMemo<LinkedSelectionState>(
    () => ({
      hoveredCategory,
      selectedCategory,
      setHoveredCategory,
      setSelectedCategory,
    }),
    [hoveredCategory, selectedCategory, setHoveredCategory, setSelectedCategory],
  );

  return (
    <LinkedSelectionContext.Provider value={value}>
      {children}
    </LinkedSelectionContext.Provider>
  );
};

export const useLinkedSelection = (): LinkedSelectionState => {
  const ctx = useContext(LinkedSelectionContext);
  if (!ctx) {
    throw new Error('useLinkedSelection must be used within a LinkedSelectionProvider');
  }
  return ctx;
};
