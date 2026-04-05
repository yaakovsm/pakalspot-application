import React, { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Spot } from '../types/spot';
import { spotsAPI } from '../api/api';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { X, Heart, MapPin, Share2, Trash2 } from 'lucide-react';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { getTranslatedSpotContent } from '../utils/spotTranslations';
import { ADMIN_EMAIL } from '../utils/authUser';
import { getApiErrorDetail } from '../utils/apiError';
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from './ui/carousel';
import { resolvePhotoUrl } from '../utils/spotMedia';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useAuthModal } from './AuthModalProvider';

interface SpotDetailSidebarProps {
  spot: Spot | null;
  onClose: () => void;
  isClosing?: boolean;
  isOpening?: boolean;
  className?: string;
}

const SpotDetailSidebar: React.FC<SpotDetailSidebarProps> = ({ spot, onClose, isClosing = false, isOpening = false, className }) => {
  const { selectedSpot, selectSpot, fetchSpots } = useSpots();
  const { isAuthenticated, user } = useAuth();
  const { isFavorited, favoriteSpot, unfavoriteSpot } = useFavorites();
  const { openAuthModal } = useAuthModal();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const [isAnimating, setIsAnimating] = useState(isOpening);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [navigationPopoverOpen, setNavigationPopoverOpen] = useState(false);

  const isAdmin = Boolean(
    user?.is_admin || user?.email?.trim().toLowerCase() === ADMIN_EMAIL
  );
  
  // Use selectedSpot from store if available, otherwise use prop (for reactivity)
  const currentSpot = selectedSpot || spot;
  
  // Get translated content
  const translatedTitle = currentSpot ? getTranslatedSpotContent(currentSpot, t, 'title') : '';
  const translatedDescription = currentSpot ? getTranslatedSpotContent(currentSpot, t, 'description') : '';
  const translatedHowToGetThere = currentSpot ? getTranslatedSpotContent(currentSpot, t, 'how_to_get_there') : '';
  
  // Check if spot is favorited using global state
  const isSpotFavorited = currentSpot ? isFavorited(currentSpot.id) : false;

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

  if (!currentSpot) return null;

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      openAuthModal('login', {
        title: t('auth.sign_in_required'),
        description: t('auth.favorites_sign_in_description'),
      });
      return;
    }

    if (!currentSpot) return;

    if (isSpotFavorited) {
      unfavoriteSpot(currentSpot.id);
      toast({
        title: t('spots.removed_from_favorites'),
        description: t('spots.removed_from_favorites_desc'),
      });
    } else {
      favoriteSpot(currentSpot.id);
      toast({
        title: t('spots.added_to_favorites'),
        description: t('spots.added_to_favorites_desc'),
      });
    }
  };

  const handleDeleteSpot = async () => {
    if (!currentSpot) return;
    setIsDeleting(true);
    try {
      await spotsAPI.deleteSpot(currentSpot.id);
      toast({
        title: t('spots.spot_deleted'),
        description: t('spots.spot_deleted_desc'),
      });
      selectSpot(null);
      await fetchSpots();
      setDeleteDialogOpen(false);
      onClose();
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getApiErrorDetail(err, t('spots.delete_spot_failed')),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentSpot.title,
          text: currentSpot.description,
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

  const openGoogleMaps = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${currentSpot.lat},${currentSpot.lon}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setNavigationPopoverOpen(false);
  };

  const openWaze = () => {
    const url = `https://waze.com/ul?ll=${currentSpot.lat},${currentSpot.lon}&navigate=yes`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setNavigationPopoverOpen(false);
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

        {/* Spot Image Carousel */}
        <div className="relative mb-6">
          {currentSpot.photos && currentSpot.photos.length > 0 ? (
            <Carousel className="w-full" opts={{ direction: 'ltr' }}>
              <CarouselContent>
                {currentSpot.photos.map((photo, index) => (
                  <CarouselItem key={photo.id || index}>
                    <div className="relative">
                      <img 
                        src={resolvePhotoUrl(photo) || ''} 
                        alt={`${currentSpot.title} - ${index + 1}`}
                        className="w-full h-80 object-cover rounded-lg"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {currentSpot.photos.length > 1 && (
                <>
                  <CarouselPrevious className="left-2" />
                  <CarouselNext className="right-2" />
                </>
              )}
            </Carousel>
          ) : (
            <div className="w-full h-80 bg-gradient-card rounded-lg flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Type Badge */}
          <Badge 
            className={`absolute top-3 left-3 z-10 ${getTypeColor(currentSpot.spot_type)} text-white`}
          >
            {t(`spot_types.${currentSpot.spot_type}`)}
          </Badge>
          
          {/* Distance */}
          {currentSpot.distance && (
            <div className="absolute bottom-3 left-3 z-10 bg-background/80 backdrop-blur-sm rounded-md px-2 py-1 text-xs text-foreground">
              {currentSpot.distance < 1 ? `${Math.round(currentSpot.distance * 1000)}m away` : `${currentSpot.distance.toFixed(1)}km away`}
            </div>
          )}
        </div>

        {/* Title and Actions */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-2 mb-4 min-w-0">
            <h1 className="text-2xl font-bold text-foreground flex-1 min-w-0 truncate pr-2">
              {translatedTitle}
            </h1>
            <div className="flex gap-2 flex-shrink-0 items-center">
              {isAuthenticated && isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="h-8 w-8 rounded-full border border-muted-foreground/20 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label={t('spots.delete_spot')}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
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
                onClick={handleShare}
                className="h-8 w-8 rounded-full border border-muted-foreground/20 hover:border-primary hover:bg-primary/10"
              >
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </div>

        {/* Description */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <p className="text-foreground leading-relaxed">
              {translatedDescription}
            </p>
          </CardContent>
        </Card>

        {/* How to Get There */}
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-semibold text-foreground mb-3">
              {t('spots.how_to_get_there')}
            </h3>
            
            {translatedHowToGetThere && (
              <p className="text-foreground leading-relaxed mb-4">
                {translatedHowToGetThere}
              </p>
            )}

            {/* Get Directions Button */}
            <Popover open={navigationPopoverOpen} onOpenChange={setNavigationPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="default" className="w-full gap-2">
                  <MapPin className="w-4 h-4" />
                  {t('spots.get_directions')}
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[230px] p-2 rounded-xl border-border/70 shadow-strong"
                align={i18n.language === 'he' ? 'start' : 'center'}
              >
                <p className="text-xs text-muted-foreground font-medium px-2 pt-1 pb-2">
                  {t('spots.choose_navigation_app')}
                </p>
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    onClick={openGoogleMaps}
                    className="w-full h-11 justify-start rounded-lg border border-transparent text-foreground hover:text-foreground hover:border-primary/20 hover:bg-accent/60"
                  >
                    <img src="/maps_icon.png" alt={t('spots.google_maps')} className="w-5 h-5 rounded-sm object-contain" />
                    <span className="font-medium">{t('spots.google_maps')}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={openWaze}
                    className="w-full h-11 justify-start rounded-lg border border-transparent text-foreground hover:text-foreground hover:border-primary/20 hover:bg-accent/60"
                  >
                    <img src="/waze_icon.png" alt={t('spots.waze')} className="w-5 h-5 rounded-sm object-contain" />
                    <span className="font-medium">{t('spots.waze')}</span>
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>
      
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('spots.delete_spot_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('spots.delete_spot_confirm_description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common.cancel')}</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteSpot()}
              disabled={isDeleting}
            >
              {isDeleting ? t('spots.deleting') : t('spots.delete_spot')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SpotDetailSidebar;
