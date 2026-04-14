import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Header from '../components/Header';
import { useAuthModal } from '../components/AuthModalProvider';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { spotsAPI } from '../api/api';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { ArrowLeft, ArrowRight, MapPin, Heart, Share2, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { ADMIN_EMAIL } from '../utils/authUser';
import { getApiErrorDetail } from '../utils/apiError';
import { resolvePhotoUrl } from '../utils/spotMedia';
import { normalizeSpotType, type SpotType } from '../types/spot';
import { getTranslatedSpotContent } from '../utils/spotTranslations';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from '../components/ui/carousel';

const SpotDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const { selectedSpot, selectSpot, fetchSpots } = useSpots();
  const { isAuthenticated, user } = useAuth();
  const { openAuthModal } = useAuthModal();
  const { isFavorited, favoriteSpot, unfavoriteSpot } = useFavorites();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mobileCarouselApi, setMobileCarouselApi] = useState<CarouselApi>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(true);
  const [navigationPopoverOpen, setNavigationPopoverOpen] = useState(false);

  const isAdmin = Boolean(
    user?.is_admin || user?.email?.trim().toLowerCase() === ADMIN_EMAIL
  );
  
  // Check if spot is favorited using global state
  const isSpotFavorited = selectedSpot ? isFavorited(selectedSpot.id) : false;

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const { data } = await spotsAPI.getSpot(id);
        if (!cancelled) {
          selectSpot(data);
        }
      } catch {
        if (!cancelled) {
          navigate('/');
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, navigate, selectSpot]);

  useEffect(() => {
    if (!mobileCarouselApi) return;

    const updateIndex = () => {
      setCurrentImageIndex(mobileCarouselApi.selectedScrollSnap());
    };

    updateIndex();
    mobileCarouselApi.on('select', updateIndex);
    mobileCarouselApi.on('reInit', updateIndex);

    return () => {
      mobileCarouselApi.off('select', updateIndex);
      mobileCarouselApi.off('reInit', updateIndex);
    };
  }, [mobileCarouselApi]);

  const approvalRaw =
    selectedSpot?.approval_status ??
    (selectedSpot as { approvalStatus?: string } | undefined)?.approvalStatus;
  const isPending = approvalRaw === 'pending';
  const isOwner = Boolean(
    user &&
      selectedSpot &&
      (user.id === selectedSpot.owner_id || user.id === selectedSpot.createdBy?.id)
  );
  const showPendingBanner = Boolean(isPending && (isOwner || isAdmin));
  const canSocial = !isPending;
  const isRTL = i18n.language === 'he';

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      openAuthModal('login', {
        title: t('auth.sign_in_required'),
        description: t('auth.favorites_sign_in_description'),
      });
      return;
    }

    if (!selectedSpot) return;

    if (isSpotFavorited) {
      unfavoriteSpot(selectedSpot.id);
      toast({
        title: t('spots.removed_from_favorites'),
        description: t('spots.removed_from_favorites_desc'),
      });
    } else {
      favoriteSpot(selectedSpot.id);
      toast({
        title: t('spots.added_to_favorites'),
        description: t('spots.added_to_favorites_desc'),
      });
    }
  };

  const handleDeleteSpot = async () => {
    if (!selectedSpot) return;
    setIsDeleting(true);
    try {
      await spotsAPI.deleteSpot(selectedSpot.id);
      toast({
        title: t('spots.spot_deleted'),
        description: t('spots.spot_deleted_desc'),
      });
      selectSpot(null);
      await fetchSpots();
      setDeleteDialogOpen(false);
      navigate('/');
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

  const handleApproveSpot = async () => {
    if (!selectedSpot) return;
    try {
      const { data } = await spotsAPI.approveSpot(selectedSpot.id);
      selectSpot(data);
      await fetchSpots();
      toast({
        title: t('spots.spot_approved_toast'),
        description: t('spots.spot_approved_toast_desc'),
      });
    } catch (err) {
      toast({
        title: t('common.error'),
        description: getApiErrorDetail(err, t('spots.spot_creation_failed')),
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedSpot?.title,
          text: selectedSpot?.description,
          url: window.location.href,
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: t('spots.link_copied'),
          description: t('spots.link_copied_desc'),
        });
      } catch (error) {
        toast({
          title: t('spots.share_failed'),
          description: t('spots.share_failed_desc'),
          variant: 'destructive',
        });
      }
    }
  };

  const openGoogleMaps = () => {
    if (!selectedSpot) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${selectedSpot.lat},${selectedSpot.lon}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setNavigationPopoverOpen(false);
  };

  const openWaze = () => {
    if (!selectedSpot) return;
    const url = `https://waze.com/ul?ll=${selectedSpot.lat},${selectedSpot.lon}&navigate=yes`;
    window.open(url, '_blank', 'noopener,noreferrer');
    setNavigationPopoverOpen(false);
  };

  if (detailLoading || !selectedSpot || selectedSpot.id !== id) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12 text-center text-muted-foreground">
          {t('common.loading')}
        </div>
      </div>
    );
  }

  const spotTypeNorm = normalizeSpotType(String(selectedSpot.spot_type));
  const translatedTitle = getTranslatedSpotContent(selectedSpot, t, 'title');
  const translatedDescription = getTranslatedSpotContent(selectedSpot, t, 'description');
  const translatedHowToGetThere = getTranslatedSpotContent(selectedSpot, t, 'how_to_get_there');
  const getTypeColor = (type: SpotType) => {
    const typeColors: Record<SpotType, string> = {
      waterfall: 'bg-blue-500',
      spring: 'bg-cyan-500',
      viewpoint: 'bg-green-600',
      lake: 'bg-blue-600',
      river: 'bg-blue-500',
      forest: 'bg-green-500',
      desert: 'bg-amber-700',
      beach: 'bg-cyan-500',
      park: 'bg-green-400',
    };
    return typeColors[type] ?? 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6 hidden gap-2 lg:inline-flex"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('spots.back_to_map')}
          </Button>

          {showPendingBanner && (
            <div
              className="mb-6 rounded-lg border border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
              role="status"
            >
              {t('spots.pending_approval_banner')}
            </div>
          )}

          {/* Image Gallery */}
          <Card className="mb-6 overflow-hidden">
            <div className="relative lg:hidden">
              {selectedSpot.photos && selectedSpot.photos.length > 0 ? (
                <Carousel className="w-full" opts={{ direction: 'ltr' }} setApi={setMobileCarouselApi}>
                  <CarouselContent>
                    {selectedSpot.photos.map((photo, index) => (
                      <CarouselItem key={photo.id || index}>
                        <img
                          src={resolvePhotoUrl(photo) || ''}
                          alt={`${translatedTitle} - ${index + 1}`}
                          className="w-full h-80 object-cover"
                        />
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                </Carousel>
              ) : (
                <div className="w-full h-80 bg-gradient-card" />
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

              <div className="absolute start-3 top-3 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/')}
                  className="h-10 w-10 rounded-full bg-background/85 text-foreground shadow-medium backdrop-blur-sm hover:bg-background"
                  aria-label={t('spots.back_to_map')}
                >
                  {isRTL ? <ArrowRight className="h-5 w-5" /> : <ArrowLeft className="h-5 w-5" />}
                </Button>
              </div>

              <div className="absolute end-3 top-3 z-10 flex items-center gap-2">
                {canSocial && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleFavoriteToggle}
                      className="h-10 w-10 rounded-full bg-background/85 shadow-medium backdrop-blur-sm hover:bg-background"
                      aria-label={t('spots.add_to_favorites')}
                    >
                      <Heart className={`h-5 w-5 ${isSpotFavorited ? 'fill-primary text-primary' : 'text-foreground'}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleShare}
                      className="h-10 w-10 rounded-full bg-background/85 shadow-medium backdrop-blur-sm hover:bg-background"
                      aria-label={t('spots.share')}
                    >
                      <Share2 className="h-5 w-5 text-foreground" />
                    </Button>
                  </>
                )}
              </div>

              {selectedSpot.photos && selectedSpot.photos.length > 1 && (
                <div className="absolute start-3 top-16 z-10 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">
                  {currentImageIndex + 1} / {selectedSpot.photos.length}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-4 pt-10">
                <Badge className={`${getTypeColor(spotTypeNorm)} mb-2 w-fit text-white`}>
                  {t(`spots.spot_types.${spotTypeNorm}`)}
                </Badge>
                <h1 className="text-2xl font-bold text-white drop-shadow-md line-clamp-2">
                  {translatedTitle}
                </h1>
              </div>
            </div>

            {selectedSpot.photos && selectedSpot.photos.length > 0 && (
              <div className="relative hidden lg:block">
                <img
                  src={resolvePhotoUrl(selectedSpot.photos[currentImageIndex]) || ''}
                  alt={translatedTitle}
                  className="w-full h-96 object-cover"
                />

                {selectedSpot.photos.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentImageIndex(
                        currentImageIndex > 0 ? currentImageIndex - 1 : selectedSpot.photos.length - 1
                      )}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                    >
                      ←
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCurrentImageIndex(
                        currentImageIndex < selectedSpot.photos.length - 1 ? currentImageIndex + 1 : 0
                      )}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-background/80 backdrop-blur-sm"
                    >
                      →
                    </Button>

                    {/* Image indicators */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                      {selectedSpot.photos.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-2 h-2 rounded-full ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  {/* Title and Actions (desktop only to avoid mobile empty gap) */}
                  <div className="hidden lg:flex items-start justify-between gap-2 mb-4 min-w-0">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-3xl font-bold text-foreground mb-2 break-words">
                        {translatedTitle}
                      </h1>
                    </div>

                    <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                      {isAuthenticated && isAdmin && isPending && (
                        <Button
                          variant="default"
                          size="sm"
                          className="h-9 px-3"
                          type="button"
                          onClick={handleApproveSpot}
                        >
                          {t('spots.approve_spot')}
                        </Button>
                      )}
                      {isAuthenticated && isAdmin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteDialogOpen(true)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          aria-label={t('spots.delete_spot')}
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      )}
                      {canSocial && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={handleFavoriteToggle}
                        >
                          <Heart className={`w-5 h-5 ${isSpotFavorited ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleShare}
                      >
                        <Share2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-foreground text-lg leading-relaxed">
                    {translatedDescription}
                  </p>

                </CardContent>
              </Card>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* How to Get There */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-3">
                    {t('spots.how_to_get_there')}
                  </h3>
                  {translatedHowToGetThere && (
                    <p className="text-foreground leading-relaxed mb-4">
                      {translatedHowToGetThere}
                    </p>
                  )}
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

              {/* Map Button */}
              <Button 
                variant="hero" 
                onClick={() => navigate('/map')}
                className="w-full gap-2"
              >
                <MapPin className="w-4 h-4" />
                {t('spots.view_on_map')}
              </Button>
            </div>
          </div>
        </div>
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

export default SpotDetails;