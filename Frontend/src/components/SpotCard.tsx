import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Spot } from '../types/spot';
import { Heart, Info, MapPin, Eye } from 'lucide-react';
import { useSpots } from '../hooks/useSpots';
import { useTranslation } from 'react-i18next';

interface SpotCardProps {
  spot: Spot;
  onViewDetails?: (spot: Spot) => void;
  onInfoClick?: (spot: Spot) => void;
  onInfoHover?: (spot: Spot | null) => void;
  className?: string;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, onViewDetails, onInfoClick, onInfoHover, className }) => {
  const { selectSpot, favoriteSpot, unfavoriteSpot } = useSpots();
  const { t } = useTranslation();

  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInfoClick?.(spot);
  };

  const handleInfoHover = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInfoHover?.(spot);
  };

  const handleInfoLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInfoHover?.(null);
  };

  const handleCardClick = () => {
    selectSpot(spot);
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
    <Card 
      className={`cursor-pointer transition-smooth hover:shadow-medium group ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          {/* Left side - Spot info */}
          <div className="flex-1 pr-4">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors mb-1">
              {spot.title}
            </h3>
            
            <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
              {spot.description}
            </p>
            
            {/* Distance and type */}
            <div className="flex items-center gap-2 mb-2">
              {spot.distance && (
                <span className="text-xs text-muted-foreground">
                  {spot.distance < 1 ? `${Math.round(spot.distance * 1000)}m away` : `${spot.distance.toFixed(1)}km away`}
                </span>
              )}
              <Badge 
                className={`text-xs ${getTypeColor(spot.spot_type)} text-white`}
              >
                {t(`spot_types.${spot.spot_type}`)}
              </Badge>
            </div>
            
            {/* Meta info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t('spots.by')} {spot.createdBy?.username || t('spots.unknown')}</span>
              <span>•</span>
              <span>{new Date(spot.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          
          {/* Right side - Action buttons */}
          <div className="flex flex-col items-center gap-2">
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
              onClick={handleInfoClick}
              onMouseEnter={handleInfoHover}
              onMouseLeave={handleInfoLeave}
              className="h-8 w-8 rounded-full border border-muted-foreground/20 hover:border-primary hover:bg-primary/10"
            >
              <Info className="w-4 h-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpotCard;