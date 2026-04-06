import { useEffect } from 'react';
import { useSpots } from './useSpots';

/**
 * Geolocation + initial spots fetch (shared by Home and MapPage).
 */
export function useSpotDiscoveryBootstrap() {
  const { fetchSpots, setUserLocation } = useSpots();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.warn('Could not get user location:', error);
          setUserLocation({ lat: 31.5, lng: 34.8 });
          if (error.code === 1) {
            console.info(
              'Location access denied. You can use the location control in the menu to try again.'
            );
          } else if (error.code === 2) {
            console.info('Location unavailable. Using default location.');
          } else if (error.code === 3) {
            console.info('Location request timed out. Using default location.');
          }
        }
      );
    } else {
      setUserLocation({ lat: 31.5, lng: 34.8 });
    }

    fetchSpots();
  }, [fetchSpots, setUserLocation]);
}
