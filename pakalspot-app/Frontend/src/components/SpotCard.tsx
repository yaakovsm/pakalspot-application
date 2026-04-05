import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Spot } from '../types/spot';
import { Heart, Info, MapPin } from 'lucide-react';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from 'react-i18next';
import { useToast } from '../hooks/use-toast';
import { useAuthModal } from './AuthModalProvider';
import { getTranslatedSpotContent } from '../utils/spotTranslations';
import { resolveSpotCoverUrl } from '../utils/spotMedia';

interface SpotCardProps {
  spot: Spot;
  onViewDetails?: (spot: Spot) => void;
  onInfoClick?: (spot: Spot) => void;
  onInfoHover?: (spot: Spot | null) => void;
  className?: string;
}

const SpotCard: React.FC<SpotCardProps> = ({ spot, onInfoClick, onInfoHover, className }) => {
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
  const thumb = resolveSpotCoverUrl(spot);

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

  const getTypeColor = (type: string) => {
    const typeColors: { [key: string]: string } = {
      viewpoint: 'bg-blue-500',
      beach: 'bg-cyan-500',
      mountain: 'bg-green-600',
      lake: 'bg-blue-600',
      river: 'bg-sky-600',
      forest: 'bg-green-500',
      waterfall: 'bg-blue-400',
      spring: 'bg-teal-600',
      cave: 'bg-gray-600',
      park: 'bg-green-400',
      historical: 'bg-amber-600',
      archaeological: 'bg-amber-700',
      religious: 'bg-violet-600',
      restaurant: 'bg-orange-500',
      cafe: 'bg-yellow-500',
      camping: 'bg-emerald-700',
      bar: 'bg-purple-500',
      shop: 'bg-pink-500',
      other: 'bg-gray-500',
    };
    return typeColors[type] || typeColors.other;
  };

  return (
    <Card
      className={`cursor-pointer transition-smooth hover:shadow-medium group overflow-hidden ${className}`}
      onClick={handleCardClick}
    >
      <CardContent className="p-2">
        <div className="flex gap-2 items-start" dir="ltr">
          <div className="w-20 h-20 rounded-lg bg-muted shrink-0 overflow-hidden border border-border/40">
            {thumb ? (
              <img src={thumb} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="w-7 h-7 text-muted-foreground opacity-60" />
              </div>
            )}
          </div>

          <div
            className="flex flex-1 min-w-0 items-start justify-between gap-2"
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <div className={`flex-1 min-w-0 ${isRTL ? 'pr-0 pl-1' : 'pl-0 pr-1'}`}>
              <div className={`flex items-center gap-2 mb-0.5 ${isRTL ? 'justify-end' : 'justify-start'}`}>
                <h3
                  className={`font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {translatedTitle}
                </h3>
              </div>

              {translatedSubtitle ? (
                <p
                  className={`text-muted-foreground text-xs mb-1 line-clamp-1 ${isRTL ? 'text-right' : 'text-left'}`}
                >
                  {translatedSubtitle}
                </p>
              ) : null}

              {spot.distance != null ? (
                <div
                  className={`flex items-center gap-2 text-[11px] text-muted-foreground mb-1 ${isRTL ? 'justify-end' : 'justify-start'}`}
                >
                  <span>
                    {spot.distance < 1
                      ? `${Math.round(spot.distance * 1000)}m away`
                      : `${spot.distance.toFixed(1)}km away`}
                  </span>
                </div>
              ) : null}

              <div
                className={`flex items-center flex-wrap gap-1.5 text-[11px] text-muted-foreground ${isRTL ? 'justify-end' : 'justify-start'}`}
              >
                {isRTL ? (
                  <>
                    <span className="whitespace-nowrap truncate max-w-[8rem] sm:max-w-none">
                      {t('spots.created_by')} {spot.createdBy?.username || t('spots.unknown')}
                    </span>
                    <Badge className={`text-[10px] flex-shrink-0 px-1.5 py-0 ${getTypeColor(spot.spot_type)} text-white`}>
                      {t(`spot_types.${spot.spot_type}`)}
                    </Badge>
                  </>
                ) : (
                  <>
                    <Badge className={`text-[10px] flex-shrink-0 px-1.5 py-0 ${getTypeColor(spot.spot_type)} text-white`}>
                      {t(`spot_types.${spot.spot_type}`)}
                    </Badge>
                    <span className="whitespace-nowrap truncate max-w-[8rem] sm:max-w-none">
                      {t('spots.created_by')} {spot.createdBy?.username || t('spots.unknown')}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col items-center gap-1.5 shrink-0 pt-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleFavoriteToggle}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-muted-foreground/20 hover:border-primary hover:bg-primary/10"
              >
                <Heart
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSpotFavorited ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
                />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleInfoClick}
                onMouseEnter={handleInfoHover}
                onMouseLeave={handleInfoLeave}
                className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-muted-foreground/20 hover:border-primary hover:bg-primary/10"
              >
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SpotCard;
