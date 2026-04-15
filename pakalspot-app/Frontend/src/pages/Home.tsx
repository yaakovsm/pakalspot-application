import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MapView from '../components/MapView';
import SpotDetailSidebar from '../components/SpotDetailSidebar';
import MobileExploreFeed from '../components/mobile/MobileExploreFeed';
import { useSpotDiscoveryBootstrap } from '../hooks/useSpotDiscoveryBootstrap';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { Spot } from '../types/spot';
import { useAuthModal } from '../components/AuthModalProvider';
import { useAddSpotModal } from '../components/AddSpotModalProvider';
import { useTranslation } from 'react-i18next';
import { useMediaQuery, MIN_WIDTH_LG } from '../hooks/use-media-query';

const Home: React.FC = () => {
  const isDesktop = useMediaQuery(MIN_WIDTH_LG);
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedSpot } = useSpots();
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { openAddSpot } = useAddSpotModal();
  const { t } = useTranslation();
  useSpotDiscoveryBootstrap();

  const [showDetailSidebar, setShowDetailSidebar] = useState(false);
  const [isClosingSidebar, setIsClosingSidebar] = useState(false);
  const [isOpeningSidebar, setIsOpeningSidebar] = useState(false);
  const [hoveredSpot, setHoveredSpot] = useState<Spot | null>(null);

  useEffect(() => {
    if (searchParams.get('add') !== '1') return;
    const next = new URLSearchParams(searchParams);
    next.delete('add');
    setSearchParams(next, { replace: true });
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    openAddSpot();
  }, [searchParams, setSearchParams, isAuthenticated, openAddSpot, openAuthModal]);

  const handleAddSpot = () => {
    openAddSpot();
  };

  const handleConfirmMapPinAdd = (location: { lat: number; lng: number }) => {
    openAddSpot({ initialLocation: location });
  };

  const handleInfoClick = () => {
    setShowDetailSidebar(true);
    setIsOpeningSidebar(true);
    setTimeout(() => {
      setIsOpeningSidebar(false);
    }, 300);
  };

  const handleCloseDetailSidebar = () => {
    setIsClosingSidebar(true);
    setTimeout(() => {
      setShowDetailSidebar(false);
      setIsClosingSidebar(false);
    }, 300);
  };

  const handleInfoHover = (spot: Spot | null) => {
    setHoveredSpot(spot);
  };

  return (
    <div className="flex flex-col h-[100dvh] lg:h-screen bg-background min-h-0 overflow-hidden">
      {isDesktop ? (
        <>
          <Header className="shrink-0" />
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="w-96 h-full shrink-0">
              <Sidebar onAddSpot={handleAddSpot} onInfoClick={handleInfoClick} onInfoHover={handleInfoHover} />
            </div>
            <div className="flex flex-1 relative min-w-0 min-h-0">
              <MapView
                className="w-full h-full"
                hoveredSpot={hoveredSpot}
                isSpotDetailsOpen={showDetailSidebar}
                onOpenDetails={handleInfoClick}
                onConfirmMapPinAdd={handleConfirmMapPinAdd}
              />
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 flex-col min-h-0 min-w-0 relative">
          <MobileExploreFeed />
          <Button
            variant="hero"
            size="icon"
            onClick={handleAddSpot}
            className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] end-4 w-14 h-14 rounded-full shadow-strong z-40"
            aria-label={t('mobile.add_spot_fab')}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      )}

      {showDetailSidebar && selectedSpot && (
        <SpotDetailSidebar
          spot={selectedSpot}
          onClose={handleCloseDetailSidebar}
          isClosing={isClosingSidebar}
          isOpening={isOpeningSidebar}
        />
      )}
    </div>
  );
};

export default Home;
