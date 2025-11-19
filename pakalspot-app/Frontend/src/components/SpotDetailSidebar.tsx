import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Spot } from '../types/spot';
import { X, Heart, MapPin, Share2 } from 'lucide-react';
import { useSpots } from '../hooks/useSpots';
import { useTranslation } from 'react-i18next';

interface SpotDetailSidebarProps {
  spot: Spot | null;
  onClose: () => void;
  isClosing?: boolean;
  isOpening?: boolean;
  className?: string;
}

const SpotDetailSidebar: React.FC<SpotDetailSidebarProps> = ({ spot, onClose, isClosing = false, isOpening = false, className }) => {
  const { favoriteSpot, unfavoriteSpot } = useSpots();
  const { t } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(isOpening);

  useEffect(() => {
    if (isOpening) {
      // Start with closed state, then animate to open
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 50); // Small delay to ensure the initial state is rendered
      return () => clearTimeout(timer);
    }
  }, [isOpening]);

  if (!spot) return null;

  const handleFavoriteToggle = async () => {
    try {
      if (spot.isFavorited) {
        await unfavoriteSpot(spot.id);
      } else {
        await favoriteSpot(spot.id);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: spot.title,
          text: spot.description,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
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
      other: 'bg-gray-500',
    };
    return typeColors[type] || typeColors.other;
  };

  return (
    <div 
      className={`fixed inset-y-0 left-0 w-96 bg-background border-r border-border shadow-strong z-50 overflow-y-auto transition-all duration-300 ${
        isClosing 
          ? 'opacity-0 scale-95 translate-x-[-10px]' 
          : isAnimating
          ? 'opacity-0 scale-95 translate-x-[-10px]'
          : 'opacity-100 scale-100 translate-x-0'
      } ${className}`}
      style={{
        transformOrigin: 'left center',
        transitionTimingFunction: isClosing ? 'cubic-bezier(0.4, 0, 1, 1)' : 'cubic-bezier(0, 0, 0.2, 1)'
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-foreground">Spot Details</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Spot Image */}
        <div className="relative mb-6">
          {spot.photos && spot.photos.length > 0 && spot.photos[0] ? (
            <img 
              src={spot.photos[0].url} 
              alt={spot.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-card rounded-lg flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Type Badge */}
          <Badge 
            className={`absolute top-3 left-3 ${getTypeColor(spot.spot_type)} text-white`}
          >
            {t(`spot_types.${spot.spot_type}`)}
          </Badge>
          
          {/* Distance */}
          {spot.distance && (
            <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-foreground">
              {spot.distance < 1 ? `${Math.round(spot.distance * 1000)}m away` : `${spot.distance.toFixed(1)}km away`}
            </div>
          )}
        </div>

        {/* Title and Actions */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {spot.title}
          </h1>
          
          <div className="flex items-center gap-2 mb-4">
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavoriteToggle}
              className="h-8 w-8 rounded-full border border-muted-foreground/20 hover:border-primary hover:bg-primary/10"
            >
              <Heart className={`w-4 h-4 ${spot.isFavorited ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="h-8 w-8 rounded-full border border-muted-foreground/20 hover:border-primary hover:bg-primary/10"
            >
              <Share2 className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Description */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-foreground leading-relaxed">
              {spot.description}
            </p>
          </CardContent>
        </Card>

        {/* How to Get There */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-3">
              {t('spots.how_to_get_there')}
            </h3>
            
            {spot.how_to_get_there && (
              <p className="text-foreground leading-relaxed mb-4">
                {spot.how_to_get_there}
              </p>
            )}

            {/* Get Directions Button */}
            <Button 
              variant="default" 
              onClick={() => {
                const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lon}`;
                window.open(url, '_blank');
              }}
              className="w-full gap-2"
            >
              <MapPin className="w-4 h-4" />
              {t('spots.get_directions')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SpotDetailSidebar;
