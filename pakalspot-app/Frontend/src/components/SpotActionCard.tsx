import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Spot } from '../types/spot';
import { Heart, MapPin, Info, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getTranslatedSpotContent } from '../utils/spotTranslations';

interface SpotActionCardProps {
  spot: Spot;
  onOpenDetails: () => void;
  onNavigate: () => void;
  onToggleFavorite: () => void;
  isFavorite: boolean;
  onClearSelection?: () => void;
  className?: string;
}

const SpotActionCard: React.FC<SpotActionCardProps> = ({
  spot,
  onOpenDetails,
  onNavigate,
  onToggleFavorite,
  isFavorite,
  onClearSelection,
  className
}) => {
  const { t, i18n } = useTranslation();
  const currentLanguage = i18n.language || 'he';
  const isRTL = currentLanguage === 'he';
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Get translated content
  const translatedTitle = getTranslatedSpotContent(spot, t, 'title');
  const translatedSubtitle = getTranslatedSpotContent(spot, t, 'subtitle');

  const photos = spot.photos || [];
  const hasMultiplePhotos = photos.length > 1;

  const goToPrevious = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? photos.length - 1 : prev - 1));
  };

  const goToNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === photos.length - 1 ? 0 : prev + 1));
  };

  return (
    <Card 
      className={`rounded-2xl shadow-strong bg-white overflow-hidden flex flex-col ${className}`}
      style={{
        width: '240px',
        transform: 'translate(-50%, 10px)',
      }}
    >
      {/* Image Carousel Section - Exact Airbnb dimensions: 240x155.55 */}
      <div 
        className="relative flex-shrink-0 cursor-pointer bg-gray-100 overflow-hidden rounded-t-2xl"
        style={{
          width: '240px',
          height: '155.55px',
        }}
        onClick={onOpenDetails}
      >
        {photos.length > 0 ? (
          <>
            <div 
              className="relative w-full h-full"
              style={{
                display: 'flex',
                direction: 'ltr', // Force LTR for carousel to work correctly
                transform: `translateX(-${currentImageIndex * 100}%)`,
                transition: 'transform 0.3s ease-in-out',
              }}
            >
              {photos.map((photo, index) => (
                <img 
                  key={photo.id || index}
                  src={photo.url} 
                  alt={`${translatedTitle} - ${index + 1}`}
                  className="w-full h-full object-cover flex-shrink-0"
                  style={{ width: '240px', height: '155.55px' }}
                />
              ))}
            </div>
            
            {/* Navigation arrows - only show if multiple photos */}
            {hasMultiplePhotos && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevious}
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm z-10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 hover:bg-white shadow-sm z-10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                
                {/* Image indicators */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                  {photos.map((_, index) => (
                    <button
                      key={index}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(index);
                      }}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-white w-2' : 'bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full bg-gradient-card flex items-center justify-center rounded-t-2xl">
            <MapPin className="w-10 h-10 text-muted-foreground" />
          </div>
        )}

        {/* Floating Heart Icon (top-right) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm z-10"
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
        </Button>

        {/* Optional X Close Button (top-left) */}
        {onClearSelection && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onClearSelection();
            }}
            className="absolute top-2 left-2 h-8 w-8 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-sm z-10"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </Button>
        )}
      </div>

      {/* Bottom Section: Title and Actions - Always visible, flex-shrink-0 ensures it's always shown */}
      <div 
        className={`p-3 flex-shrink-0 bg-white`} 
        style={{ 
          minHeight: '116px',
          direction: isRTL ? 'rtl' : 'ltr',
          textAlign: isRTL ? 'right' : 'left',
        }}
      >
        {/* Title */}
        <h3 
          className="font-semibold text-base text-foreground mb-1 truncate cursor-pointer hover:text-primary transition-colors"
          onClick={onOpenDetails}
        >
          {translatedTitle}
        </h3>

        {/* Optional Subtitle */}
        {translatedSubtitle && (
          <p 
            className="text-muted-foreground text-xs mb-2 line-clamp-1 cursor-pointer"
            onClick={onOpenDetails}
          >
            {translatedSubtitle}
          </p>
        )}

        {/* Action Buttons Row - Compact, RTL-aware order */}
        <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
          {isRTL ? (
            // Hebrew: Navigate first, then Details
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigate}
                className="flex-1 gap-1.5 text-xs h-8 min-w-0 px-2"
              >
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t('spots.get_directions') || 'Navigate'}</span>
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onOpenDetails}
                className="flex-1 gap-1.5 text-xs h-8 min-w-0 px-2"
              >
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t('spots.view_details')}</span>
              </Button>
            </>
          ) : (
            // English: Details first, then Navigate
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onOpenDetails}
                className="flex-1 gap-1.5 text-xs h-8 min-w-0 px-2"
              >
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t('spots.view_details')}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigate}
                className="flex-1 gap-1.5 text-xs h-8 min-w-0 px-2"
              >
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate">{t('spots.get_directions') || 'Navigate'}</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
};

export default SpotActionCard;

