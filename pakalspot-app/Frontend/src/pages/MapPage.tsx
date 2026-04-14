import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '../components/MapView';
import { useSpotDiscoveryBootstrap } from '../hooks/useSpotDiscoveryBootstrap';
import { useSpots } from '../hooks/useSpots';
import { Button } from '../components/ui/button';
import { Plus } from 'lucide-react';
import { useAddSpotModal } from '../components/AddSpotModalProvider';
import { useTranslation } from 'react-i18next';

const MapPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedSpot } = useSpots();
  const { openAddSpot } = useAddSpotModal();
  useSpotDiscoveryBootstrap();

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const apply = () => {
      if (mq.matches) {
        navigate('/', { replace: true });
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [navigate]);

  const handleAddSpot = () => {
    openAddSpot();
  };

  const handleInfoClick = () => {
    if (!selectedSpot) return;
    navigate(`/spot/${selectedSpot.id}`);
  };

  return (
    <div className="flex flex-col h-[100dvh] lg:h-screen bg-background overflow-hidden">
      <div className="flex-1 relative min-h-0">
        <MapView
          className="w-full h-full min-h-[50vh]"
          isSpotDetailsOpen={false}
          onOpenDetails={handleInfoClick}
        />
        <Button
          variant="hero"
          size="icon"
          onClick={handleAddSpot}
          className="lg:hidden fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] end-4 w-14 h-14 rounded-full shadow-strong z-40"
          aria-label={t('mobile.add_spot_fab')}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

    </div>
  );
};

export default MapPage;
