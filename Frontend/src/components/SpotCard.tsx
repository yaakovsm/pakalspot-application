import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Spot } from '../types/spot';
import { Star, ThumbsUp, ThumbsDown, MapPin, Eye } from 'lucide-react';
import { useSpots } from '../hooks/useSpots';
import { useTranslation } from 'react-i18next';

interface SpotCardProps {
  spot: Spot;
  onViewDetails?: (spot: Spot) => void;
  className?: string;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, onViewDetails, className }) => {
  const { selectSpot, favoriteSpot, unfavoriteSpot, likeSpot } = useSpots();
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

  const handleLike = async (e: React.MouseEvent, isLike: boolean) => {
    e.stopPropagation();
    try {
      await likeSpot(spot.id, isLike);
    } catch (error) {
      console.error('Failed to like spot:', error);
    }
  };

  const handleCardClick = () => {
    selectSpot(spot);
    onViewDetails?.(spot);
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
      className={`cursor-pointer transition-smooth hover:shadow-medium hover:scale-105 group ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-0">
        {/* Image */}
        <div className="relative">
          {spot.photos && spot.photos.length > 0 && spot.photos[0] ? (
            <img 
              src={spot.photos[0].url} 
              alt={spot.title}
              className="w-full h-48 object-cover rounded-t-lg"
            />
          ) : (
            <div className="w-full h-48 bg-gradient-card rounded-t-lg flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Favorite Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleFavoriteToggle}
            className="absolute top-3 right-3 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          >
            <Star className={`w-5 h-5 ${spot.isFavorited ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
          </Button>
          
          {/* Type Badge */}
          <Badge 
            className={`absolute top-3 left-3 ${getTypeColor(spot.type)} text-white`}
          >
            {t(`spot_types.${spot.type}`)}
          </Badge>
          
          {/* Distance */}
          {spot.distance && (
            <div className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-foreground">
              {spot.distance < 1 ? `${Math.round(spot.distance * 1000)}m` : `${spot.distance.toFixed(1)}km`}
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
              {spot.title}
            </h3>
          </div>
          
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
            {spot.description}
          </p>
          
          {/* Meta Info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{t('spots.by')} {spot.createdBy?.username || t('spots.unknown')}</span>
              <span>•</span>
              <span>{new Date(spot.createdAt).toLocaleDateString()}</span>
            </div>
            
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="w-3 h-3" />
              <span>{spot.popularity || 0}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleLike(e, true)}
                className={`text-xs ${spot.userLike?.isLike ? 'text-green-600 bg-green-50' : 'text-muted-foreground'}`}
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                {spot.likeCount || 0}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => handleLike(e, false)}
                className={`text-xs ${spot.userLike && !spot.userLike.isLike ? 'text-red-600 bg-red-50' : 'text-muted-foreground'}`}
              >
                <ThumbsDown className="w-4 h-4 mr-1" />
                {spot.dislikeCount || 0}
              </Button>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onViewDetails?.(spot);
              }}
            >
              {t('spots.view_details')}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpotCard;