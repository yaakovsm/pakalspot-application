import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Header from '../components/Header';
import AuthDialog from '../components/AuthDialog';
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
import { ArrowLeft, MapPin, Heart, ThumbsUp, ThumbsDown, User, Share2, Trash2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { ADMIN_EMAIL } from '../utils/authUser';
import { getApiErrorDetail } from '../utils/apiError';

const SpotDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { selectedSpot, selectSpot, likeSpot, fetchSpots } = useSpots();
  const { isAuthenticated, user } = useAuth();
  const { isFavorited, favoriteSpot, unfavoriteSpot } = useFavorites();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(true);

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

  const handleFavoriteToggle = () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
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

  const handleLike = async (isLike: boolean) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    if (!selectedSpot) return;

    try {
      await likeSpot(selectedSpot.id, isLike);
      toast({
        title: isLike ? t('spots.spot_liked') : t('spots.feedback_recorded'),
        description: isLike ? t('spots.like_recorded') : t('spots.dislike_recorded'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('spots.feedback_failed'),
        variant: 'destructive',
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

  const getTypeColor = (type: string) => {
    const typeColors: { [key: string]: string } = {
      waterfall: 'bg-blue-500',
      spring: 'bg-cyan-500',
      viewpoint: 'bg-green-600',
      beach: 'bg-blue-400',
      lake: 'bg-blue-600',
      river: 'bg-blue-500',
      cave: 'bg-gray-600',
      park: 'bg-green-400',
      forest: 'bg-green-500',
      historical: 'bg-amber-600',
      archaeological: 'bg-orange-600',
      religious: 'bg-purple-600',
      restaurant: 'bg-orange-500',
      cafe: 'bg-yellow-500',
      camping: 'bg-green-700',
      other: 'bg-gray-500',
    };
    return typeColors[type] || typeColors.other;
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {/* Back Button */}
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="mb-6 gap-2"
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
          {selectedSpot.photos && selectedSpot.photos.length > 0 && (
            <Card className="mb-6 overflow-hidden">
              <div className="relative">
                <img 
                  src={selectedSpot.photos[currentImageIndex].url}
                  alt={selectedSpot.title}
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
            </Card>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardContent className="p-6">
                  {/* Title and Actions */}
                  <div className="flex items-start justify-between gap-2 mb-4 min-w-0">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-3xl font-bold text-foreground mb-2 break-words">
                        {selectedSpot.title}
                      </h1>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className={`${getTypeColor(selectedSpot.spot_type)} text-white`}>
                          {t(`spot_types.${selectedSpot.spot_type}`)}
                        </Badge>
                      </div>
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
                  <p className="text-foreground text-lg leading-relaxed mb-6">
                    {selectedSpot.description}
                  </p>

                  {/* Actions */}
                  {canSocial && (
                    <div className="flex items-center gap-4">
                      <Button
                        variant={selectedSpot.userLike?.isLike ? "default" : "outline"}
                        onClick={() => handleLike(true)}
                        className="gap-2"
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {selectedSpot.likeCount || 0}
                      </Button>
                      
                      <Button
                        variant={selectedSpot.userLike && !selectedSpot.userLike.isLike ? "default" : "outline"}
                        onClick={() => handleLike(false)}
                        className="gap-2"
                      >
                        <ThumbsDown className="w-4 h-4" />
                        {selectedSpot.dislikeCount || 0}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Details */}
            <div className="space-y-6">
              {/* Location Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    {t('spots.location_details')}
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('spots.coordinates')}:</span>
                      <span className="ml-2 font-mono text-xs">
                        {selectedSpot.lat.toFixed(4)}, {selectedSpot.lon.toFixed(4)}
                      </span>
                    </div>
                    {selectedSpot.distance && (
                      <div>
                        <span className="text-muted-foreground">{t('spots.distance')}:</span>
                        <span className="ml-2 font-medium">
                          {selectedSpot.distance < 1 
                            ? `${Math.round(selectedSpot.distance * 1000)}m` 
                            : `${selectedSpot.distance.toFixed(1)}km`}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Creator Info */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    {t('spots.spot_info')}
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">{t('spots.added_by')}:</span>
                      <span className="ml-2 font-medium">{selectedSpot.createdBy?.username || t('spots.unknown')}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{t('spots.popularity')}:</span>
                      <span className="ml-2 font-medium">{selectedSpot.popularity || 0} {t('spots.views')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map Button */}
              <Button 
                variant="hero" 
                onClick={() => navigate('/')}
                className="w-full gap-2"
              >
                <MapPin className="w-4 h-4" />
                {t('spots.view_on_map')}
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title={t('auth.sign_in_required')}
        description={t('auth.favorites_sign_in_description')}
        actionText={t('auth.sign_in')}
        cancelText={t('common.cancel')}
      />

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