import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useSpots } from '../hooks/useSpots';
import { Spot } from '../types/spot';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Star, ThumbsUp, ThumbsDown } from 'lucide-react';

// Israel map configuration
const ISRAEL_CENTER: [number, number] = [34.8, 31.5]; // [lng, lat]
const ISRAEL_ZOOM = 7;
const ISRAEL_BOUNDS: [[number, number], [number, number]] = [
  [34.25, 29.5], // Southwest corner [lng, lat]
  [35.9, 33.4]   // Northeast corner [lng, lat]
];

const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

interface MapViewProps {
  className?: string;
}

const MapView: React.FC<MapViewProps> = ({ className }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const popup = useRef<maplibregl.Popup | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  
  const { spots, selectedSpot, selectSpot, setUserLocation, favoriteSpot, unfavoriteSpot, likeSpot } = useSpots();
  const [userLocationMarker, setUserLocationMarker] = useState<maplibregl.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: [MAP_TILE_URL],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 22
          }
        ]
      },
      center: ISRAEL_CENTER,
      zoom: ISRAEL_ZOOM,
      maxBounds: ISRAEL_BOUNDS, // Restrict map to Israel
    });

    // Add navigation controls
    map.current.addControl(
      new maplibregl.NavigationControl({
        visualizePitch: true,
      }),
      'top-right'
    );

    // Add geolocate control
    const geolocate = new maplibregl.GeolocateControl({
      positionOptions: {
        enableHighAccuracy: true
      },
      trackUserLocation: true
    });

    map.current.addControl(geolocate, 'top-right');

    // Handle user location
    geolocate.on('geolocate', (e: any) => {
      const { longitude, latitude } = e.coords;
      setUserLocation({ lat: latitude, lng: longitude });
    });

    return () => {
      map.current?.remove();
    };
  }, [setUserLocation]);

  // Add spot markers
  useEffect(() => {
    if (!map.current || !spots.length) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    spots.forEach(spot => {
      const el = document.createElement('div');
      el.className = 'spot-marker';
      el.innerHTML = `
        <div class="w-10 h-10 bg-primary rounded-full shadow-medium flex items-center justify-center cursor-pointer hover:scale-110 transition-smooth border-2 border-white">
          <svg class="w-5 h-5 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      `;

      const marker = new maplibregl.Marker(el)
        .setLngLat([spot.longitude, spot.latitude])
        .addTo(map.current!);

      // Handle marker click
      el.addEventListener('click', () => {
        selectSpot(spot);
        showSpotPopup(spot, marker);
      });

      markersRef.current.push(marker);
    });
  }, [spots, selectSpot]);

  // Handle selected spot
  useEffect(() => {
    if (!map.current || !selectedSpot) return;

    // Fly to selected spot
    map.current.flyTo({
      center: [selectedSpot.longitude, selectedSpot.latitude],
      zoom: 15,
      duration: 1000,
    });
  }, [selectedSpot]);

  const showSpotPopup = (spot: Spot, marker: maplibregl.Marker) => {
    if (popup.current) {
      popup.current.remove();
    }

    const popupContent = document.createElement('div');
    popupContent.innerHTML = `
      <div class="spot-popup p-0 max-w-sm">
        <div class="relative">
          ${spot.photos[0] ? `
            <img src="${spot.photos[0].url}" alt="${spot.title}" class="w-full h-32 object-cover rounded-t-lg">
          ` : `
            <div class="w-full h-32 bg-gradient-card rounded-t-lg flex items-center justify-center">
              <svg class="w-8 h-8 text-muted-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5 2.5-2.5 2.5-2.5 2.5z"/>
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

    popup.current = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: '320px',
    })
      .setLngLat([spot.longitude, spot.latitude])
      .setDOMContent(popupContent)
      .addTo(map.current!);
  };

  const handleFavoriteSpot = async (spotId: string, isFavorited: boolean) => {
    try {
      if (isFavorited) {
        await unfavoriteSpot(spotId);
      } else {
        await favoriteSpot(spotId);
      }
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
      
      {/* Selected Spot Card */}
      {selectedSpot && (
        <Card className="absolute bottom-4 left-4 right-4 md:left-4 md:right-auto md:w-80 shadow-strong backdrop-blur-md bg-card/90">
          <CardContent className="p-4">
            {selectedSpot.photos[0] && (
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