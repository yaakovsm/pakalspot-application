import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Spot } from '../types/spot';
import { Heart, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/use-toast';
import AuthDialog from './AuthDialog';
import { getTranslatedSpotContent } from '../utils/spotTranslations';

interface FavoriteSpotCardProps {
  spot: Spot;
  onViewDetails?: (spot: Spot) => void;
  className?: string;
}

const FavoriteSpotCard: React.FC<FavoriteSpotCardProps> = ({ spot, onViewDetails, className }) => {
  const { selectSpot } = useSpots();
  const { isAuthenticated } = useAuth();
  const { isFavorited, unfavoriteSpot } = useFavorites();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const photos = spot.photos || [];
  const hasMultiplePhotos = photos.length > 1;
  const currentPhoto = photos[currentImageIndex];

  // Get translated content
  const translatedTitle = getTranslatedSpotContent(spot, t, 'title');
  const translatedSubtitle = getTranslatedSpotContent(spot, t, 'subtitle');
  
  // Check if spot is favorited using global state (should always be true on favorites page)
  const isSpotFavorited = isFavorited(spot.id);

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    // On favorites page, we only unfavorite
    unfavoriteSpot(spot.id);
    toast({
      title: t('spots.removed_from_favorites'),
      description: t('spots.removed_from_favorites_desc'),
    });
  };

  const handleCardClick = () => {
    selectSpot(spot);
    onViewDetails?.(spot);
  };

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  const getTypeColor = (type: string) => {
    const typeColors: { [key: string]: string } = {
      viewpoint: 'bg-blue-500',
      beach: 'bg-cyan-500',
      mountain: 'bg-green-600',
      lake: 'bg-blue-600',
      forest: 'bg-green-500',
      waterfall: 'bg-blue-400',
      cave: 'bg-gray-600',
      park: 'bg-green-400',
      historical: 'bg-amber-600',
      restaurant: 'bg-orange-500',
      cafe: 'bg-yellow-500',
      bar: 'bg-purple-500',
      shop: 'bg-pink-500',
      spring: 'bg-blue-500',
      other: 'bg-gray-500',
    };
    return typeColors[type] || typeColors.other;
  };

  return (
    <>
      <Card 
        className={`cursor-pointer transition-all duration-200 hover:shadow-lg group overflow-hidden ${className}`}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image Section - Airbnb style */}
        <div className="relative w-full aspect-[4/3] bg-gradient-card overflow-hidden">
          {currentPhoto ? (
            <>
              <img 
                src={currentPhoto.url} 
                alt={translatedTitle}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              
              {/* Heart button overlay - top right */}
              <div className="absolute top-3 right-3 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleFavoriteToggle}
                  className="h-9 w-9 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-md transition-all"
                >
                  <Heart className={`w-5 h-5 ${isSpotFavorited ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
                </Button>
              </div>

              {/* Navigation arrows - show on hover if multiple photos */}
              {hasMultiplePhotos && isHovered && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToPrevious}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-md z-10"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-700" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={goToNext}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-md z-10"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-700" />
                  </Button>
                </>
              )}

              {/* Photo indicators - bottom center */}
              {hasMultiplePhotos && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1 z-10">
                  {photos.map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 rounded-full transition-all ${
                        index === currentImageIndex 
                          ? 'w-6 bg-white' 
                          : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Type badge - top left */}
              <div className="absolute top-3 left-3 z-10">
                <Badge 
                  className={`${getTypeColor(spot.spot_type)} text-white text-xs font-medium px-2 py-1`}
                >
                  {t(`spot_types.${spot.spot_type}`)}
                </Badge>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {translatedTitle}
          </h3>
          
          {/* Subtitle */}
          {translatedSubtitle && (
            <p className="text-sm text-muted-foreground line-clamp-1">
              {translatedSubtitle}
            </p>
          )}

          {/* Distance and Author */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            {spot.distance && (
              <span>
                {spot.distance < 1 
                  ? `${Math.round(spot.distance * 1000)}m away` 
                  : `${spot.distance.toFixed(1)}km away`}
              </span>
            )}
            {spot.createdBy && (
              <span className="text-right">
                {t('spots.created_by')} {spot.createdBy.username}
              </span>
            )}
          </div>
        </div>
      </Card>

      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title={t('auth.sign_in_required')}
        description={t('auth.favorites_sign_in_description')}
        actionText={t('auth.sign_in')}
        cancelText={t('common.cancel')}
      />
    </>
  );
};

export default FavoriteSpotCard;

