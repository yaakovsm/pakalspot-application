import React from 'react';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import Header from '../components/Header';
import FavoriteSpotCard from '../components/FavoriteSpotCard';
import { Button } from '../components/ui/button';
import { Heart, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import i18n from 'i18next';
import type { Spot } from '../types/spot';

const Favorites: React.FC = () => {
  const { selectSpot } = useSpots();
  const { isAuthenticated } = useAuth();
  const { favorites } = useFavorites(); // Get full favorites list from React Query
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isHebrew = (i18n.language || 'he') === 'he';

  // No need for useEffect - React Query handles fetching automatically

  const handleViewDetails = (spot: Spot) => {
    selectSpot(spot);
    navigate(`/spot/${spot.id}`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
        <Header className="hidden lg:block" />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('auth.sign_in_to_view_favorites')}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {t('auth.favorites_sign_in_description')}
              </p>
              <Button variant="hero" onClick={() => navigate('/')} className="gap-2">
                <MapPin className="w-4 h-4" />
                {t('spots.explore_spots')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir={isHebrew ? 'rtl' : 'ltr'}>
      <Header className="hidden lg:block" />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-hero rounded-xl flex items-center justify-center">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{t('favorites.title')}</h1>
              <p className="text-muted-foreground">
                {t('favorites.spots_saved_plural', { count: favorites.length })}
              </p>
            </div>
          </div>

          {/* Content */}
          {favorites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {favorites.map(spot => (
                <FavoriteSpotCard 
                  key={spot.id} 
                  spot={spot} 
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {t('favorites.no_favorites_yet')}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {t('favorites.start_exploring_description')}
              </p>
              <Button variant="hero" onClick={() => navigate('/')} className="gap-2">
                <MapPin className="w-4 h-4" />
                {t('favorites.discover_spots')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Favorites;