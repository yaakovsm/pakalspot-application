import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import Header from '../components/Header';
import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { ArrowLeft, MapPin, Star, ThumbsUp, ThumbsDown, Calendar, User, Share2 } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const SpotDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { selectedSpot, selectSpot, favoriteSpot, unfavoriteSpot, likeSpot } = useSpots();
  const { isAuthenticated } = useAuth();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (!id) {
      navigate('/');
      return;
    }

    // If we don't have the spot in selectedSpot, we would fetch it
    // For now, we'll redirect to home if no spot is selected
    if (!selectedSpot || selectedSpot.id !== id) {
      navigate('/');
    }
  }, [id, selectedSpot, navigate]);

  const handleFavoriteToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedSpot) return;

    try {
      if (selectedSpot.isFavorited) {
        await unfavoriteSpot(selectedSpot.id);
        toast({
          title: "Removed from favorites",
          description: "This spot has been removed from your favorites.",
        });
      } else {
        await favoriteSpot(selectedSpot.id);
        toast({
          title: "Added to favorites",
          description: "This spot has been saved to your favorites.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorites. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (isLike: boolean) => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!selectedSpot) return;

    try {
      await likeSpot(selectedSpot.id, isLike);
      toast({
        title: isLike ? "Spot liked!" : "Feedback recorded",
        description: `Your ${isLike ? 'like' : 'dislike'} has been recorded.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record your feedback. Please try again.",
        variant: "destructive",
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
          title: "Link copied",
          description: "The spot link has been copied to your clipboard.",
        });
      } catch (error) {
        toast({
          title: "Share failed",
          description: "Could not share the spot link.",
          variant: "destructive",
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

  const getRegionLabel = (region: string) => {
    const regionLabels: { [key: string]: string } = {
      negev: 'Negev',
      galilee: 'Galilee',
      golan: 'Golan Heights',
      shfela: 'Shfela',
      sharon: 'Sharon',
      shomron: 'Shomron',
      jerusalem: 'Jerusalem Area',
      arava: 'Arava',
    };
    return regionLabels[region] || region;
  };

  if (!selectedSpot) {
    return null;
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
            Back to Map
          </Button>

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
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h1 className="text-3xl font-bold text-foreground mb-2">
                        {selectedSpot.title}
                      </h1>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className={`${getTypeColor(selectedSpot.type)} text-white`}>
                          {selectedSpot.type}
                        </Badge>
                        <Badge variant="outline">
                          {getRegionLabel(selectedSpot.region)}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleFavoriteToggle}
                      >
                        <Star className={`w-5 h-5 ${selectedSpot.isFavorited ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
                      </Button>
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
                    Location Details
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Region:</span>
                      <span className="ml-2 font-medium">{getRegionLabel(selectedSpot.region)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Coordinates:</span>
                      <span className="ml-2 font-mono text-xs">
                        {selectedSpot.lat.toFixed(4)}, {selectedSpot.lon.toFixed(4)}
                      </span>
                    </div>
                    {selectedSpot.distance && (
                      <div>
                        <span className="text-muted-foreground">Distance:</span>
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
                    Spot Info
                  </h3>
                  
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Added by:</span>
                      <span className="ml-2 font-medium">{selectedSpot.createdBy?.username || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Added on:</span>
                      <span className="ml-2">{new Date(selectedSpot.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Popularity:</span>
                      <span className="ml-2 font-medium">{selectedSpot.popularity || 0} views</span>
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
                View on Map
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpotDetails;