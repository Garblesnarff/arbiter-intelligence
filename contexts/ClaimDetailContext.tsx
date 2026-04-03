
import React, { createContext, useContext, useState, type PropsWithChildren } from 'react';
import { Claim } from '../types';

interface ClaimDetailContextType {
  selectedClaim: Claim | null;
  claimList: Claim[];
  openClaim: (claim: Claim, list?: Claim[]) => void;
  closeClaim: () => void;
  nextClaim: () => void;
  prevClaim: () => void;
}

const ClaimDetailContext = createContext<ClaimDetailContextType | undefined>(undefined);

// Fix: Use PropsWithChildren to ensure children are correctly typed and recognized by the JSX factory in App.tsx
export const ClaimDetailProvider = ({ children }: PropsWithChildren) => {
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimList, setClaimList] = useState<Claim[]>([]);

  const openClaim = (claim: Claim, list: Claim[] = []) => {
    setSelectedClaim(claim);
    setClaimList(list);
  };

  const closeClaim = () => {
    setSelectedClaim(null);
    setClaimList([]);
  };

  const currentIndex = selectedClaim ? claimList.findIndex(c => c.id === selectedClaim.id) : -1;

  const nextClaim = () => {
    if (currentIndex !== -1 && currentIndex < claimList.length - 1) {
      setSelectedClaim(claimList[currentIndex + 1]);
    }
  };

  const prevClaim = () => {
    if (currentIndex > 0) {
      setSelectedClaim(claimList[currentIndex - 1]);
    }
  };

  return (
    <ClaimDetailContext.Provider value={{ 
      selectedClaim, 
      claimList, 
      openClaim, 
      closeClaim, 
      nextClaim, 
      prevClaim 
    }}>
      {children}
    </ClaimDetailContext.Provider>
  );
};

export const useClaimDetail = () => {
  const context = useContext(ClaimDetailContext);
  if (!context) {
    throw new Error('useClaimDetail must be used within a ClaimDetailProvider');
  }
  return context;
};
