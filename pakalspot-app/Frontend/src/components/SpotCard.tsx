import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Spot, normalizeSpotType, type SpotType } from '../types/spot';
import { Heart, Info } from 'lucide-react';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/use-toast';
import { useAuthModal } from './AuthModalProvider';
import { getTranslatedSpotContent } from '../utils/spotTranslations';

interface SpotCardProps {
  spot: Spot;
  onViewDetails?: (spot: Spot) => void;
  onInfoClick?: (spot: Spot) => void;
  onInfoHover?: (spot: Spot | null) => void;
  className?: string;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, onViewDetails: _onViewDetails, onInfoClick, onInfoHover, className }) => {
  const { selectSpot } = useSpots();
  const { isAuthenticated } = useAuth();
  const { isFavorited, favoriteSpot, unfavoriteSpot } = useFavorites();
  const { openAuthModal } = useAuthModal();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();

  const currentLanguage = i18n.language || 'he';
  const isRTL = currentLanguage === 'he';

  const translatedTitle = getTranslatedSpotContent(spot, t, 'title');
  const translatedSubtitle = getTranslatedSpotContent(spot, t, 'subtitle');

  const isSpotFavorited = isFavorited(spot.id);

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      openAuthModal('login', {
        title: t('auth.sign_in_required'),
        description: t('auth.favorites_sign_in_description'),
      });
      return;
    }

    if (isSpotFavorited) {
      unfavoriteSpot(spot.id);
      toast({
        title: t('spots.removed_from_favorites'),
        description: t('spots.removed_from_favorites_desc'),
      });
    } else {
      favoriteSpot(spot.id);
      toast({
        title: t('spots.added_to_favorites'),
        description: t('spots.added_to_favorites_desc'),
      });
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

  const spotTypeNorm = normalizeSpotType(String(spot.spot_type));

  const getTypeColor = (type: SpotType) => {
    const typeColors: Record<SpotType, string> = {
      viewpoint: 'bg-blue-500',
      lake: 'bg-blue-600',
      forest: 'bg-green-500',
      waterfall: 'bg-blue-400',
      spring: 'bg-cyan-600',
      desert: 'bg-amber-700',
      river: 'bg-sky-600',
      beach: 'bg-cyan-500',
      park: 'bg-green-400',
    };
    return typeColors[type] ?? 'bg-gray-500';
  };

  return (
    <Card
      className={`cursor-pointer transition-smooth hover:shadow-medium group ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 ps-3 pe-3">
            <div className={`flex items-center gap-2 mb-1 ${isRTL ? 'justify-end' : 'justify-start'}`}>
              <h3 className={`font-semibold text-base text-foreground group-hover:text-primary transition-colors ${isRTL ? 'text-right' : 'text-left'}`}>
                {translatedTitle}
              </h3>
            </div>

            <p className={`text-muted-foreground text-sm mb-2 line-clamp-1 ${isRTL ? 'justify-end' : 'justify-start'}`}>
              {translatedSubtitle}
            </p>

            {spot.distance && (
              <div className={`flex items-center gap-2 text-xs text-muted-foreground mb-2 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                <span>
                  {spot.distance < 1
                    ? t('spots.distance_m_away', { distance: Math.round(spot.distance * 1000) })
                    : t('spots.distance_km_away', { distance: spot.distance.toFixed(1) })}
                </span>
              </div>
            )}

            <div className={`flex items-center flex-nowrap gap-2 text-xs text-muted-foreground ${isRTL ? 'justify-end' : 'justify-start'}`}>
              {isRTL ? (
                <>
                  <span className="whitespace-nowrap">{t('spots.created_by')} {spot.createdBy?.username || t('spots.unknown')}</span>
                  <Badge
                    className={`text-xs flex-shrink-0 ${getTypeColor(spotTypeNorm)} text-white`}
                  >
                    {t(`spots.spot_types.${spotTypeNorm}`)}
                  </Badge>
                </>
              ) : (
                <>
                  <Badge
                    className={`text-xs flex-shrink-0 ${getTypeColor(spotTypeNorm)} text-white`}
                  >
                    {t(`spots.spot_types.${spotTypeNorm}`)}
                  </Badge>
                  <span className="whitespace-nowrap">{t('spots.created_by')} {spot.createdBy?.username || t('spots.unknown')}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleFavoriteToggle}
              className="h-8 w-8 rounded-full border border-muted-foreground/20 hover:border-primary hover:bg-primary/10"
            >
              <Heart className={`w-4 h-4 ${isSpotFavorited ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
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
