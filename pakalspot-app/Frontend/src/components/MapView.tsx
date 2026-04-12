import React, { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';

// Declare Google Maps types
declare global {
  interface Window {
    google: typeof google;
  }
}

import { useSpots } from '../hooks/useSpots';
import { useAuth } from '../hooks/useAuth';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from 'react-i18next';
import { Spot } from '../types/spot';
import googleMapsLoader from '../utils/googleMapsLoader';
import { VITE_GOOGLE_MAPS_API_KEY } from '../config/env';
import { useAuthModal } from './AuthModalProvider';
import SpotActionCard from './SpotActionCard';

// Israel map configuration
const ISRAEL_CENTER: google.maps.LatLngLiteral = { lat: 31.3, lng: 34.8 };
const ISRAEL_ZOOM = 10;
/** Zoom levels to step back when closing a spot (keeps map center). */
const ZOOM_OUT_DELTA = 2;
const MIN_ZOOM_AFTER_DESELECT = ISRAEL_ZOOM;
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
  isSpotDetailsOpen?: boolean;
  onOpenDetails?: () => void;
  visibleSpots?: Spot[];
  fitToVisibleSpots?: boolean;
}

const MapView: React.FC<MapViewProps> = ({
  className,
  hoveredSpot,
  isSpotDetailsOpen = false,
  onOpenDetails,
  visibleSpots,
  fitToVisibleSpots = true,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<(google.maps.marker.AdvancedMarkerElement | google.maps.Marker)[]>([]);
  const hoverMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const overlayRef = useRef<google.maps.OverlayView | null>(null);
  const overlayRootRef = useRef<Root | null>(null);
  const prevSelectedSpotIdRef = useRef<string | null>(null);

  const { spots, selectedSpot, selectSpot, userLocation } = useSpots();
  const spotsToRender = visibleSpots ?? spots;
  const { isFavorited, favoriteSpot, unfavoriteSpot } = useFavorites();
  const { isAuthenticated } = useAuth();
  const { t, i18n } = useTranslation();
  const { openAuthModal } = useAuthModal();
  const [userLocationMarker, setUserLocationMarker] = useState<google.maps.marker.AdvancedMarkerElement | google.maps.Marker | null>(null);
  const mapLanguage = (i18n.resolvedLanguage || i18n.language || 'he').toLowerCase().startsWith('en') ? 'en' : 'he';

  const clearMapArtifacts = () => {
    markersRef.current.forEach(marker => {
      if ('setMap' in marker) {
        marker.setMap(null);
      } else {
        (marker as any).map = null;
      }
    });
    markersRef.current = [];

    if (hoverMarkerRef.current) {
      if ('setMap' in hoverMarkerRef.current) {
        hoverMarkerRef.current.setMap(null);
      } else {
        (hoverMarkerRef.current as any).map = null;
      }
      hoverMarkerRef.current = null;
    }

    if (userLocationMarker) {
      if ('setMap' in userLocationMarker) {
        userLocationMarker.setMap(null);
      } else {
        (userLocationMarker as any).map = null;
      }
      setUserLocationMarker(null);
    }

    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }
    if (overlayRootRef.current) {
      overlayRootRef.current.unmount();
      overlayRootRef.current = null;
    }

    map.current = null;
  };

  // Initialize map (re-initialize when app language changes)
  useEffect(() => {
    if (!mapContainer.current) return;

    const initMap = async () => {
      try {
        clearMapArtifacts();

        // Load Google Maps API with proper configuration
        const apiKey = VITE_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.error('Google Maps API key is not configured. Please set VITE_GOOGLE_MAPS_API_KEY in your environment variables.');
          return;
        }

        await googleMapsLoader.load({
          apiKey,
          language: mapLanguage,
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
          disableDefaultUI: true,
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
      clearMapArtifacts();
    };
  }, [mapLanguage]);

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
  }, [userLocation, mapLanguage]);

  // Add spot markers with selection state
  useEffect(() => {
    if (!map.current || !spotsToRender.length) return;

    markersRef.current.forEach(marker => {
      if ('setMap' in marker) {
        marker.setMap(null);
      } else {
        (marker as any).map = null;
      }
    });
    markersRef.current = [];

    spotsToRender.forEach(spot => {
      // Check if this spot is selected to apply different styling
      const isSelected = selectedSpot && selectedSpot.id === spot.id;
      
      // Use regular Marker with transparent logo
      // Selected markers are larger (52x52) and have higher zIndex
      // Anchor point is at bottom center so marker "sits" on the location
      const iconSize = isSelected ? 52 : 32;
      const marker = new google.maps.Marker({
        position: { lat: spot.lat, lng: spot.lon },
        map: map.current,
        title: spot.title,
        zIndex: isSelected ? 999 : 1,
        icon: {
          url: '/PakalSpot_Transperent_logo.png',
          scaledSize: new google.maps.Size(iconSize, iconSize),
          anchor: new google.maps.Point(iconSize / 2, iconSize)
        }
      });

      marker.addListener('click', () => {
        selectSpot(spot);
      });

      markersRef.current.push(marker);
    });
  }, [spotsToRender, selectSpot, selectedSpot, mapLanguage]);

  // Handle selected spot: pan and zoom to selected spot
  useEffect(() => {
    if (!map.current) return;

    if (selectedSpot) {
      map.current.panTo({ lat: selectedSpot.lat, lng: selectedSpot.lon });
      map.current.setZoom(15);
      prevSelectedSpotIdRef.current = selectedSpot.id;
    } else {
      const closedASpot = prevSelectedSpotIdRef.current != null;
      if (closedASpot) {
        prevSelectedSpotIdRef.current = null;
        const z = map.current.getZoom() ?? 15;
        map.current.setZoom(Math.max(MIN_ZOOM_AFTER_DESELECT, z - ZOOM_OUT_DELTA));
      } else if (fitToVisibleSpots && spotsToRender.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        spotsToRender.forEach(spot => {
          bounds.extend({ lat: spot.lat, lng: spot.lon });
        });
        map.current.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      }
    }
  }, [selectedSpot, spotsToRender, fitToVisibleSpots, mapLanguage]);

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
  }, [hoveredSpot, mapLanguage]);

  // Handle favorite toggle
  const handleFavoriteSpot = (spotId: string) => {
    if (!isAuthenticated) {
      openAuthModal('login', {
        title: t('auth.sign_in_required'),
        description: t('auth.favorites_sign_in_description'),
      });
      return;
    }

    if (isFavorited(spotId)) {
      unfavoriteSpot(spotId);
    } else {
      favoriteSpot(spotId);
    }
  };

  // Handle clear selection (deselect spot)
  const handleClearSelection = () => {
    selectSpot(null);
  };

  // Overlay rendering: Show SpotActionCard anchored to selected marker
  // Visibility: selectedSpot exists AND details panel is NOT open
  useEffect(() => {
    if (!map.current || !selectedSpot) {
      // Clean up overlay if no spot is selected
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      if (overlayRootRef.current) {
        overlayRootRef.current.unmount();
        overlayRootRef.current = null;
      }
      return;
    }

    // Hide overlay when details panel is open
    if (isSpotDetailsOpen) {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      if (overlayRootRef.current) {
        overlayRootRef.current.unmount();
        overlayRootRef.current = null;
      }
      return;
    }

    // Create overlay class that extends google.maps.OverlayView
    class SpotActionCardOverlay extends google.maps.OverlayView {
      private container: HTMLDivElement;
      private position: google.maps.LatLng;
      private root: Root | null = null;

      constructor(position: google.maps.LatLng) {
        super();
        this.position = position;
        this.container = document.createElement('div');
        this.container.style.position = 'absolute';
        this.container.style.pointerEvents = 'auto';
        this.container.style.zIndex = '1000';
      }

      onAdd(): void {
        const panes = this.getPanes();
        if (panes && panes.overlayMouseTarget) {
          panes.overlayMouseTarget.appendChild(this.container);
        }
        // Create React root after container is added to DOM
        if (!this.root) {
          this.root = createRoot(this.container);
        }
      }

      draw(): void {
        const projection = this.getProjection();
        if (!projection) return;

        const point = projection.fromLatLngToDivPixel(this.position);
        if (point) {
          // Position container: center horizontally, offset below marker
          this.container.style.left = `${point.x}px`;
          this.container.style.top = `${point.y}px`;
        }
      }

      onRemove(): void {
        if (this.root) {
          this.root.unmount();
          this.root = null;
        }
        if (this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
      }

      getContainer(): HTMLDivElement {
        return this.container;
      }

      getRoot(): Root | null {
        return this.root;
      }
    }

    // Remove existing overlay
    if (overlayRef.current) {
      overlayRef.current.setMap(null);
      overlayRef.current = null;
    }
    if (overlayRootRef.current) {
      overlayRootRef.current.unmount();
      overlayRootRef.current = null;
    }

    // Create new overlay
    const position = new google.maps.LatLng(selectedSpot.lat, selectedSpot.lon);
    const overlay = new SpotActionCardOverlay(position);
    overlay.setMap(map.current);

    // Wait for overlay to be added to DOM, then render
    setTimeout(() => {
      const root = overlay.getRoot();
      if (root) {
        root.render(
          <SpotActionCard
            spot={selectedSpot}
            isFavorite={isFavorited(selectedSpot.id)}
            onOpenDetails={() => {
              if (onOpenDetails) {
                onOpenDetails();
              }
            }}
            onToggleFavorite={() => handleFavoriteSpot(selectedSpot.id)}
            onClearSelection={handleClearSelection}
          />
        );
        overlayRootRef.current = root;
      }
    }, 0);

    overlayRef.current = overlay;

    // Cleanup on unmount
    return () => {
      if (overlayRef.current) {
        overlayRef.current.setMap(null);
        overlayRef.current = null;
      }
      if (overlayRootRef.current) {
        overlayRootRef.current.unmount();
        overlayRootRef.current = null;
      }
    };
  }, [selectedSpot, isSpotDetailsOpen, map, onOpenDetails, isFavorited, favoriteSpot, unfavoriteSpot, selectSpot, isAuthenticated, mapLanguage]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mapContainer} className="w-full h-full rounded-lg overflow-hidden shadow-medium" />
    </div>
  );
};

export default MapView;
