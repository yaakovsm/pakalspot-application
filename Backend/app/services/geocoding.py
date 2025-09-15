import requests
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class GeocodingService:
    """Service for geocoding location names to coordinates and determining regions"""
    
    # Israeli region boundaries (approximate)
    REGION_BOUNDARIES = {
        'negev': {'lat_min': 29.5, 'lat_max': 31.0, 'lng_min': 34.0, 'lng_max': 35.0},
        'galilee': {'lat_min': 32.5, 'lat_max': 33.4, 'lng_min': 35.0, 'lng_max': 35.6},
        'golan': {'lat_min': 32.8, 'lat_max': 33.4, 'lng_min': 35.6, 'lng_max': 35.9},
        'shfela': {'lat_min': 31.0, 'lat_max': 32.0, 'lng_min': 34.5, 'lng_max': 35.0},
        'sharon': {'lat_min': 32.0, 'lat_max': 32.5, 'lng_min': 34.5, 'lng_max': 35.0},
        'shomron': {'lat_min': 31.5, 'lat_max': 32.5, 'lng_min': 35.0, 'lng_max': 35.5},
        'jerusalem': {'lat_min': 31.5, 'lat_max': 32.0, 'lng_min': 35.0, 'lng_max': 35.5},
        'arava': {'lat_min': 29.5, 'lat_max': 31.0, 'lng_min': 35.0, 'lng_max': 35.5},
    }
    
    def __init__(self):
        self.nominatim_base_url = "https://nominatim.openstreetmap.org"
    
    def search_locations(self, query: str, limit: int = 10) -> List[Dict]:
        """
        Search for locations using OpenStreetMap Nominatim API
        """
        try:
            params = {
                'q': f"{query}, Israel",
                'format': 'json',
                'limit': limit,
                'countrycodes': 'il',  # Restrict to Israel
                'addressdetails': 1,
                'extratags': 1
            }
            
            headers = {
                'User-Agent': 'PakalSpot/1.0 (contact@pakalspot.com)'
            }
            
            response = requests.get(
                f"{self.nominatim_base_url}/search",
                params=params,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            results = response.json()
            
            # Filter and format results
            formatted_results = []
            for result in results:
                if self._is_valid_israeli_location(result):
                    formatted_results.append({
                        'name': result.get('display_name', ''),
                        'lat': float(result.get('lat', 0)),
                        'lng': float(result.get('lon', 0)),
                        'type': result.get('type', ''),
                        'importance': result.get('importance', 0),
                        'address': self._format_address(result.get('address', {}))
                    })
            
            # Sort by importance
            formatted_results.sort(key=lambda x: x['importance'], reverse=True)
            return formatted_results
            
        except Exception as e:
            logger.error(f"Error searching locations: {e}")
            return []
    
    def geocode_location(self, location_name: str) -> Optional[Dict]:
        """
        Geocode a specific location name to get coordinates and region
        """
        results = self.search_locations(location_name, limit=1)
        if results:
            result = results[0]
            region = self._determine_region(result['lat'], result['lng'])
            return {
                'name': result['name'],
                'lat': result['lat'],
                'lng': result['lng'],
                'region': region,
                'address': result['address']
            }
        return None
    
    def _is_valid_israeli_location(self, result: Dict) -> bool:
        """Check if the location is within Israel boundaries"""
        try:
            lat = float(result.get('lat', 0))
            lng = float(result.get('lon', 0))
            
            # Israel approximate boundaries
            return (29.5 <= lat <= 33.4 and 34.25 <= lng <= 35.9)
        except (ValueError, TypeError):
            return False
    
    def _format_address(self, address: Dict) -> str:
        """Format address components into a readable string"""
        components = []
        
        # Add city/town
        if 'city' in address:
            components.append(address['city'])
        elif 'town' in address:
            components.append(address['town'])
        elif 'village' in address:
            components.append(address['village'])
        
        # Add region/state
        if 'state' in address:
            components.append(address['state'])
        
        return ', '.join(components)
    
    def _determine_region(self, lat: float, lng: float) -> str:
        """Determine Israeli region based on coordinates"""
        for region, bounds in self.REGION_BOUNDARIES.items():
            if (bounds['lat_min'] <= lat <= bounds['lat_max'] and 
                bounds['lng_min'] <= lng <= bounds['lng_max']):
                return region
        
        # Default fallback
        return 'jerusalem'
    
    def reverse_geocode(self, lat: float, lng: float) -> Optional[Dict]:
        """
        Reverse geocode coordinates to get location name
        """
        try:
            params = {
                'lat': lat,
                'lon': lng,
                'format': 'json',
                'addressdetails': 1,
                'zoom': 18
            }
            
            headers = {
                'User-Agent': 'PakalSpot/1.0 (contact@pakalspot.com)'
            }
            
            response = requests.get(
                f"{self.nominatim_base_url}/reverse",
                params=params,
                headers=headers,
                timeout=10
            )
            response.raise_for_status()
            
            result = response.json()
            
            if result and 'display_name' in result:
                region = self._determine_region(lat, lng)
                return {
                    'name': result.get('display_name', ''),
                    'lat': lat,
                    'lng': lng,
                    'region': region,
                    'address': self._format_address(result.get('address', {}))
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error reverse geocoding: {e}")
            return None

# Global instance
geocoding_service = GeocodingService()

