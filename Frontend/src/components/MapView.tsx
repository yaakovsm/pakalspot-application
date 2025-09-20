import React, { useEffect, useRef, useState } from 'react';

// Declare Google Maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

import { useSpots } from '../hooks/useSpots';
import { Spot } from '../types/spot';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import googleMapsLoader from '../utils/googleMapsLoader';

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
}

const MapView: React.FC<MapViewProps> = ({ className }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const infoWindow = useRef<google.maps.InfoWindow | null>(null);
  const markersRef = useRef<(google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[]>([]);
  
  const { spots, selectedSpot, selectSpot, userLocation, favoriteSpot, unfavoriteSpot, likeSpot } = useSpots();
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Load Google Maps API with proper configuration
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
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
        infoWindow.current = new google.maps.InfoWindow();
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
      // Create a custom element for the spot marker
      const spotElement = document.createElement('div');
      spotElement.style.width = '24px';
      spotElement.style.height = '24px';
      spotElement.style.borderRadius = '50%';
      spotElement.style.backgroundColor = '#2d7c3e';
      spotElement.style.border = '2px solid #ffffff';
      spotElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      spotElement.style.cursor = 'pointer';
      spotElement.title = spot.title;

      // Use AdvancedMarkerElement if available, otherwise fall back to regular Marker
      let marker;
      if (google.maps.marker?.AdvancedMarkerElement) {
        marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: spot.lat, lng: spot.lon },
          map: map.current,
          title: spot.title,
          content: spotElement
        });
      } else {
        // Fallback to regular Marker
        marker = new google.maps.Marker({
          position: { lat: spot.lat, lng: spot.lon },
          map: map.current,
          title: spot.title,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#2d7c3e',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
          }
        });
      }

      marker.addListener('click', () => {
        selectSpot(spot);
        showSpotInfoWindow(spot, marker);
      });

      markersRef.current.push(marker);
    });
  }, [spots, selectSpot]);

  // Handle selected spot
  useEffect(() => {
    if (!map.current || !selectedSpot) return;

    map.current.panTo({ lat: selectedSpot.lat, lng: selectedSpot.lon });
    map.current.setZoom(15);
  }, [selectedSpot]);

  const showSpotInfoWindow = (spot: Spot, marker: google.maps.marker.AdvancedMarkerElement | google.maps.Marker) => {
    if (infoWindow.current) {
      infoWindow.current.close();
    }

    const infoContent = document.createElement('div');
    infoContent.innerHTML = `
      <div class="spot-info p-0 max-w-sm">
        <div class="relative">
          ${spot.photos?.[0] ? `
            <img src="${spot.photos[0].url}" alt="${spot.title}" class="w-full h-32 object-cover rounded-t-lg">
          ` : `
            <div class="w-full h-32 bg-gradient-card rounded-t-lg flex items-center justify-center">
              <svg class="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
          `}
        </div>
        <div class="p-4">
          <h3 class="font-semibold text-foreground mb-2">${spot.title}</h3>
          <p class="text-muted-foreground text-sm mb-3 line-clamp-2">${spot.description}</p>
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-sm text-muted-foreground">
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                </svg>
                ${spot.likeCount}
              </span>
              <span class="flex items-center gap-1">
                <svg class="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                </svg>
                ${spot.isFavorited ? 'Favorited' : 'Favorite'}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    infoWindow.current = new google.maps.InfoWindow({
      content: infoContent,
      maxWidth: 320
    });

    // Handle both AdvancedMarkerElement and regular Marker
    if ('anchor' in marker) {
      // AdvancedMarkerElement
      infoWindow.current.open({
        anchor: marker,
        map: map.current
      });
    } else {
      // Regular Marker
      infoWindow.current.open(map.current, marker);
    }
  };

  const handleFavoriteSpot = async (spotId: string, isFavorited: boolean) => {
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
                <Star className={`w-5 h-5 ${selectedSpot.isFavorited ? 'fill-accent text-accent' : 'text-muted-foreground'}`} />
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
                {selectedSpot.type}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MapView;
