import React, { useEffect, useRef, useState } from 'react';

// Declare Google Maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Spot } from '../types/spot';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Heart, ThumbsUp, ThumbsDown } from 'lucide-react';
import googleMapsLoader from '../utils/googleMapsLoader';
import { VITE_GOOGLE_MAPS_API_KEY } from '../config/env';
import AuthDialog from './AuthDialog';

// Israel map configuration
const ISRAEL_CENTER: google.maps.LatLngLiteral = { lat: 31.3, lng: 34.8 };
const ISRAEL_ZOOM = 10;
const ISRAEL_BOUNDS: google.maps.LatLngBoundsLiteral = {
  north: 33.4,
  south: 29.5,
  east: 35.9,
  west: 34.25
};

// Google Maps is loaded directly in index.html with Hebrew language and Israel region

interface MapViewProps {
  className?: string;
  hoveredSpot?: Spot | null;
}

const MapView: React.FC<MapViewProps> = ({ className, hoveredSpot }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  // Removed infoWindow - no longer needed
  const markersRef = useRef<(google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[]>([]);
  const hoverMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const selectedMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  
  const { spots, selectedSpot, selectSpot, userLocation, favoriteSpot, unfavoriteSpot, likeSpot } = useSpots();
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Load Google Maps API with proper configuration
        const apiKey = VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.');
          return;
        }

        await googleMapsLoader.load({
          apiKey,
          language: 'he',
          region: 'IL',
          libraries: ['places']
        });

        if (!mapContainer.current) return;

        // Ensure Google Maps is fully loaded before creating the map
        if (!window.google?.maps?.MapTypeId) {
          throw new Error('Google Maps API is not fully loaded');
        }

        map.current = new google.maps.Map(mapContainer.current, {
          center: ISRAEL_CENTER,
          zoom: ISRAEL_ZOOM,
          restriction: {
            latLngBounds: ISRAEL_BOUNDS,
            strictBounds: false
          },
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          mapTypeId: google.maps.MapTypeId.TERRAIN
        });

        // Initialize info window
        // Removed infoWindow initialization - no longer needed
      } catch (error) {
        console.error('Failed to initialize Google Maps:', error);
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current = null;
      }
    };
  }, []);

  // Handle user location changes from store
  useEffect(() => {
    if (!map.current || !userLocation) return;

    // Remove existing user location marker
    if (userLocationMarker) {
      if ('setMap' in userLocationMarker) {
        userLocationMarker.setMap(null);
      } else {
        // For AdvancedMarkerElement, we need to set map to null differently
        (userLocationMarker as any).map = null;
      }
    }
    
    // Create a custom element for the user location marker
    const userLocationElement = document.createElement('div');
    userLocationElement.style.width = '16px';
    userLocationElement.style.height = '16px';
    userLocationElement.style.borderRadius = '50%';
    userLocationElement.style.backgroundColor = '#4285F4';
    userLocationElement.style.border = '2px solid #ffffff';
    userLocationElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
    
    // Use AdvancedMarkerElement if available, otherwise fall back to regular Marker
    let marker;
    if (google.maps.marker?.AdvancedMarkerElement) {
      marker = new google.maps.marker.AdvancedMarkerElement({
        position: userLocation,
        map: map.current,
        title: 'Your Location',
        content: userLocationElement
      });
    } else {
      // Fallback to regular Marker
      marker = new google.maps.Marker({
        position: userLocation,
        map: map.current,
        title: 'Your Location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2
        }
      });
    }
    
    setUserLocationMarker(marker as any); // Type assertion for compatibility

    // Center map on user location if it's the first time
    if (map.current.getZoom() === ISRAEL_ZOOM) {
      map.current.setCenter(userLocation);
      map.current.setZoom(12);
    }
  }, [userLocation]);

  // Add spot markers
useEffect(() => {
  if (!map.current || !spots.length) return;

  markersRef.current.forEach(marker => {
    if ('setMap' in marker) {
      marker.setMap(null);
    } else {
      (marker as any).map = null;
    }
  });
  markersRef.current = [];

  spots.forEach(spot => {
    // Use regular Marker with transparent logo for all cases
    const marker = new google.maps.Marker({
      position: { lat: spot.lat, lng: spot.lon },
      map: map.current,
      title: spot.title,
      icon: {
        url: '/PakalSpot_Transperent_logo.png',
        scaledSize: new google.maps.Size(32, 32),
        anchor: new google.maps.Point(16, 16)
      }
    });

    marker.addListener('click', () => {
      selectSpot(spot);
      // Removed showSpotInfoWindow to eliminate map overlay card
    });

    markersRef.current.push(marker);
  });

  // Fit bounds to show all spots if no spot is currently selected
  if (!selectedSpot && spots.length > 0) {
    const bounds = new google.maps.LatLngBounds();
    spots.forEach(spot => {
      bounds.extend({ lat: spot.lat, lng: spot.lon });
    });
    // Add padding around the bounds
    map.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
  }
}, [spots, selectSpot, selectedSpot]);

// Handle selected spot
useEffect(() => {
  if (!map.current) return;

  // Remove existing selected marker
  if (selectedMarkerRef.current) {
    if ('setMap' in selectedMarkerRef.current) {
      selectedMarkerRef.current.setMap(null);
    } else {
      (selectedMarkerRef.current as any).map = null;
    }
    selectedMarkerRef.current = null;
  }

  if (selectedSpot) {
    // Pan to selected spot and zoom in
    map.current.panTo({ lat: selectedSpot.lat, lng: selectedSpot.lon });
    map.current.setZoom(15);

    // Create a special marker for the selected spot using the transparent logo
    const selectedElement = document.createElement('div');
    selectedElement.style.width = '40px';
    selectedElement.style.height = '40px';
    selectedElement.style.backgroundImage = 'url(/PakalSpot_Transperent_logo.png)';
    selectedElement.style.backgroundSize = 'contain';
    selectedElement.style.backgroundRepeat = 'no-repeat';
    selectedElement.style.backgroundPosition = 'center';
    selectedElement.style.cursor = 'pointer';
    selectedElement.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))';
    selectedElement.style.border = '3px solid #ffffff';
    selectedElement.style.borderRadius = '50%';

    let selectedMarker;
    if (google.maps.marker?.AdvancedMarkerElement) {
      selectedMarker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: selectedSpot.lat, lng: selectedSpot.lon },
        map: map.current,
        content: selectedElement
      });
    } else {
      // Fallback to regular Marker with logo
      selectedMarker = new google.maps.Marker({
        position: { lat: selectedSpot.lat, lng: selectedSpot.lon },
        map: map.current,
        icon: {
          url: '/PakalSpot_Transperent_logo.png',
          scaledSize: new google.maps.Size(40, 40),
          anchor: new google.maps.Point(20, 20)
        }
      });
    }

    selectedMarkerRef.current = selectedMarker;
  } else {
    // When no spot is selected, fit bounds to show all spots
    if (spots.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      spots.forEach(spot => {
        bounds.extend({ lat: spot.lat, lng: spot.lon });
      });
      // Add padding around the bounds
      map.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
    }
  }
}, [selectedSpot, spots]);

  // Handle selected spot
  useEffect(() => {
    if (!map.current) return;

    // Remove existing selected marker
    if (selectedMarkerRef.current) {
      if ('setMap' in selectedMarkerRef.current) {
        selectedMarkerRef.current.setMap(null);
      } else {
        (selectedMarkerRef.current as any).map = null;
      }
      selectedMarkerRef.current = null;
    }

    if (selectedSpot) {
      // Pan to selected spot
      map.current.panTo({ lat: selectedSpot.lat, lng: selectedSpot.lon });
      map.current.setZoom(15);

      // Create a special marker for the selected spot using the transparent logo
      const selectedElement = document.createElement('div');
      selectedElement.style.width = '40px';
      selectedElement.style.height = '40px';
      selectedElement.style.backgroundImage = 'url(/PakalSpot_Transperent_logo.png)';
      selectedElement.style.backgroundSize = 'contain';
      selectedElement.style.backgroundRepeat = 'no-repeat';
      selectedElement.style.backgroundPosition = 'center';
      selectedElement.style.cursor = 'pointer';
      selectedElement.style.filter = 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))';
      selectedElement.style.border = '3px solid #ffffff';
      selectedElement.style.borderRadius = '50%';

      let selectedMarker;
      if (google.maps.marker?.AdvancedMarkerElement) {
        selectedMarker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: selectedSpot.lat, lng: selectedSpot.lon },
          map: map.current,
          content: selectedElement
        });
      } else {
        // Fallback to regular Marker with logo
        selectedMarker = new google.maps.Marker({
          position: { lat: selectedSpot.lat, lng: selectedSpot.lon },
          map: map.current,
          icon: {
            url: '/PakalSpot_Transperent_logo.png',
            scaledSize: new google.maps.Size(40, 40),
            anchor: new google.maps.Point(20, 20)
          }
        });
      }

      selectedMarkerRef.current = selectedMarker;
    }
  }, [selectedSpot]);

  // Handle hovered spot
  useEffect(() => {
    if (!map.current) return;

    // Remove existing hover marker
    if (hoverMarkerRef.current) {
      if ('setMap' in hoverMarkerRef.current) {
        hoverMarkerRef.current.setMap(null);
      } else {
        (hoverMarkerRef.current as any).map = null;
      }
      hoverMarkerRef.current = null;
    }

    // Add new hover marker if hoveredSpot exists
    if (hoveredSpot) {
      // Create a grey circular marker for hover effect
      const hoverElement = document.createElement('div');
      hoverElement.style.width = '16px';
      hoverElement.style.height = '16px';
      hoverElement.style.borderRadius = '50%';
      hoverElement.style.backgroundColor = '#6b7280'; // grey-500
      hoverElement.style.border = '2px solid #ffffff';
      hoverElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      hoverElement.style.cursor = 'pointer';

      let hoverMarker;
      if (google.maps.marker?.AdvancedMarkerElement) {
        hoverMarker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: hoveredSpot.lat, lng: hoveredSpot.lon },
          map: map.current,
          content: hoverElement
        });
      } else {
        // Fallback to regular Marker
        hoverMarker = new google.maps.Marker({
          position: { lat: hoveredSpot.lat, lng: hoveredSpot.lon },
          map: map.current,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#6b7280',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
      }

      hoverMarkerRef.current = hoverMarker;
    }
  }, [hoveredSpot]);

  // Removed showSpotInfoWindow function - no longer needed

  const handleFavoriteSpot = async (spotId: string, isFavorited: boolean) => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }

    try {
      if (isFavorited) await unfavoriteSpot(spotId);
      else await favoriteSpot(spotId);
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleLikeSpot = async (spotId: string, isLike: boolean) => {
    try {
      await likeSpot(spotId, isLike);
    } catch (error) {
      console.error('Failed to like spot:', error);
    }
  };

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden shadow-medium" />
      
      {selectedSpot && (
        <Card className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-80 shadow-strong backdrop-blur-md bg-card/90">
          <CardContent className="p-4">
            {selectedSpot.photos?.[0] && (
              <img 
                src={selectedSpot.photos[0].url} 
                alt={selectedSpot.title}
                className="w-full h-32 object-cover rounded-lg mb-3"
              />
            )}
            
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-lg text-foreground">{selectedSpot.title}</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleFavoriteSpot(selectedSpot.id, selectedSpot.isFavorited)}
                className="flex-shrink-0"
              >
                <Heart className={`w-5 h-5 ${selectedSpot.isFavorited ? 'fill-primary text-primary' : 'text-muted-foreground'}`} />
              </Button>
            </div>
            
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
              {selectedSpot.description}
            </p>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLikeSpot(selectedSpot.id, true)}
                  className={`${selectedSpot.userLike?.isLike ? 'text-green-600' : 'text-muted-foreground'}`}
                >
                  <ThumbsUp className="w-4 h-4 mr-1" />
                  {selectedSpot.likeCount}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleLikeSpot(selectedSpot.id, false)}
                  className={`${selectedSpot.userLike && !selectedSpot.userLike.isLike ? 'text-red-600' : 'text-muted-foreground'}`}
                >
                  <ThumbsDown className="w-4 h-4 mr-1" />
                  {selectedSpot.dislikeCount}
                </Button>
              </div>
              
              <span className="text-xs text-muted-foreground capitalize">
                {selectedSpot.spot_type}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
        title={t('auth.sign_in_required')}
        description={t('auth.favorites_sign_in_description')}
        actionText={t('auth.sign_in')}
        cancelText={t('common.cancel')}
      />
    </div>
  );
};

export default MapView;
