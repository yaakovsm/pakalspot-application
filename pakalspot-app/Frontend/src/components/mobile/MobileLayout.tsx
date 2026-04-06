import React from 'react';
import MobileBottomNav from './MobileBottomNav';

interface MobileLayoutProps {
  children: React.ReactNode;
}

/**
 * Adds bottom tab bar on viewports below lg; desktop pages ignore padding via lg:pb-0.
 */
const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen min-h-[100dvh] pb-[calc(4.25rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
      {children}
      <MobileBottomNav />
    </div>
  );
};

export default MobileLayout;
