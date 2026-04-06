import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import MapView from '../components/MapView';
import SpotDetailSidebar from '../components/SpotDetailSidebar';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { Spot } from '../types/spot';
import { useAuthModal } from '../components/AuthModalProvider';
import { useAddSpotModal } from '../components/AddSpotModalProvider';

const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { fetchSpots, setUserLocation, selectedSpot } = useSpots();
  const { isAuthenticated } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { openAddSpot } = useAddSpotModal();
  const [showDetailSidebar, setShowDetailSidebar] = useState(false);
  const [isClosingSidebar, setIsClosingSidebar] = useState(false);
  const [isOpeningSidebar, setIsOpeningSidebar] = useState(false);
  const [hoveredSpot, setHoveredSpot] = useState<Spot | null>(null);

  useEffect(() => {
    // Get user location and fetch spots
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Could not get user location:', error);
          // Set default location to Israel center
          setUserLocation({ lat: 31.5, lng: 34.8 });
          
          // Show user-friendly message based on error type
          if (error.code === 1) {
            console.info('Location access denied. You can click the location button in the header to try again.');
          } else if (error.code === 2) {
            console.info('Location unavailable. Using default location.');
          } else if (error.code === 3) {
            console.info('Location request timed out. Using default location.');
          }
        }
      );
    } else {
      // Set default location to Israel center
      setUserLocation({ lat: 31.5, lng: 34.8 });
    }

    fetchSpots();
  }, [fetchSpots, setUserLocation]);

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

  const handleInfoClick = () => {
    setShowDetailSidebar(true);
    setIsOpeningSidebar(true);
    // Reset opening state after animation completes
    setTimeout(() => {
      setIsOpeningSidebar(false);
    }, 300);
  };

  const handleCloseDetailSidebar = () => {
    setIsClosingSidebar(true);
    setTimeout(() => {
      setShowDetailSidebar(false);
      setIsClosingSidebar(false);
      // Keep selectedSpot when closing so SpotActionCard can reappear
    }, 300); // Match the animation duration
  };

  const handleInfoHover = (spot: Spot | null) => {
    setHoveredSpot(spot);
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block w-96 h-full">
          <Sidebar onAddSpot={handleAddSpot} onInfoClick={handleInfoClick} onInfoHover={handleInfoHover} />
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapView 
            className="w-full h-full" 
            hoveredSpot={hoveredSpot}
            isSpotDetailsOpen={showDetailSidebar}
            onOpenDetails={handleInfoClick}
          />

          {/* Add Spot FAB */}
          <Button
            variant="hero"
            size="icon"
            onClick={handleAddSpot}
            className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-strong z-40"
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
      </div>

      {/* Spot Detail Sidebar */}
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