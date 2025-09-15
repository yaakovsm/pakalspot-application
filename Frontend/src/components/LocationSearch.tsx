import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { MapPin, Search, X } from 'lucide-react';
import { spotsAPI } from '../api/api';
import { LocationSearchResult, GeocodeResult } from '../types/spot';
import { useToast } from '../hooks/use-toast';

interface LocationSearchProps {
  onLocationSelect: (location: GeocodeResult) => void;
  initialValue?: string;
  placeholder?: string;
  className?: string;
}

const LocationSearch: React.FC<LocationSearchProps> = ({
  onLocationSelect,
  initialValue = '',
  placeholder = 'Search for a location...',
  className = ''
}) => {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null);
  
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      await searchLocations(query.trim());
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Handle clicks outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchLocations = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      console.log('Searching for locations:', searchQuery);
      const response = await spotsAPI.searchLocations(searchQuery, 10);
      console.log('Search response:', response.data);
      setResults(response.data.results);
      setShowResults(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Error searching locations:', error);
      
      // Fallback: Try direct Nominatim API if backend is not available
      try {
        console.log('Trying fallback search with Nominatim...');
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery + ', Israel')}&format=json&limit=10&countrycodes=il&addressdetails=1`
        );
        
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const formattedResults = fallbackData
            .filter((result: any) => {
              const lat = parseFloat(result.lat);
              const lng = parseFloat(result.lon);
              return lng >= 34.25 && lng <= 35.9 && lat >= 29.5 && lat <= 33.4;
            })
            .map((result: any) => ({
              name: result.display_name,
              lat: parseFloat(result.lat),
              lng: parseFloat(result.lon),
              type: result.type || 'location',
              importance: result.importance || 0,
              address: result.address ? Object.values(result.address).join(', ') : ''
            }));
          
          setResults(formattedResults);
          setShowResults(true);
          setSelectedIndex(-1);
          console.log('Fallback search successful:', formattedResults);
        } else {
          throw new Error('Fallback search failed');
        }
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError);
        toast({
          title: "Search error",
          description: "Failed to search locations. Please check your connection and try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocationSelect = async (location: LocationSearchResult) => {
    try {
      console.log('Selecting location:', location);
      // Use the data we already have from search results
      // Determine region based on coordinates (simplified approach)
      const region = determineRegionFromCoordinates(location.lat, location.lng);
      
      const geocodeResult: GeocodeResult = {
        name: location.name,
        lat: location.lat,
        lng: location.lng,
        region: region,
        address: location.address
      };
      
      console.log('Geocode result:', geocodeResult);
      setSelectedLocation(geocodeResult);
      setQuery(geocodeResult.name);
      setShowResults(false);
      onLocationSelect(geocodeResult);
      
      toast({
        title: "Location selected",
        description: `Selected ${geocodeResult.name} in ${region}`,
      });
    } catch (error) {
      console.error('Error selecting location:', error);
      toast({
        title: "Error",
        description: "Failed to select location. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Helper function to determine region from coordinates
  const determineRegionFromCoordinates = (lat: number, lng: number): string => {
    // Israeli region boundaries (approximate)
    if (lng >= 35.6 && lng <= 35.9 && lat >= 32.8 && lat <= 33.4) return 'golan';
    if (lng >= 35.0 && lng <= 35.6 && lat >= 32.5 && lat <= 33.4) return 'galilee';
    if (lng >= 34.5 && lng <= 35.0 && lat >= 32.0 && lat <= 32.5) return 'sharon';
    if (lng >= 34.5 && lng <= 35.0 && lat >= 31.0 && lat <= 32.0) return 'shfela';
    if (lng >= 35.0 && lng <= 35.5 && lat >= 31.5 && lat <= 32.5) return 'shomron';
    if (lng >= 35.0 && lng <= 35.5 && lat >= 31.5 && lat <= 32.0) return 'jerusalem';
    if (lng >= 35.0 && lng <= 35.5 && lat >= 29.5 && lat <= 31.0) return 'arava';
    if (lng >= 34.0 && lng <= 35.0 && lat >= 29.5 && lat <= 31.0) return 'negev';
    
    // Default fallback
    return 'jerusalem';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleLocationSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const clearSelection = () => {
    setQuery('');
    setSelectedLocation(null);
    setResults([]);
    setShowResults(false);
    setSelectedIndex(-1);
    onLocationSelect({
      name: '',
      lat: 0,
      lng: 0,
      region: '',
      address: ''
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {selectedLocation && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSelection}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <Card 
          ref={resultsRef}
          className="absolute top-full left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto shadow-lg"
        >
          <div className="p-2">
            {results.map((result, index) => (
              <div
                key={`${result.lat}-${result.lng}`}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  index === selectedIndex
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleLocationSelect(result)}
              >
                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{result.name}</p>
                  {result.address && (
                    <p className="text-xs text-muted-foreground truncate">
                      {result.address}
                    </p>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex-shrink-0">
                  {result.type}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1">
          <Card className="p-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm text-muted-foreground">Searching...</span>
            </div>
          </Card>
        </div>
      )}

      {/* No results */}
      {showResults && !isLoading && results.length === 0 && query.trim().length >= 2 && !selectedLocation && (
        <Card className="absolute top-full left-0 right-0 z-50 mt-1 p-4 text-center">
          <p className="text-sm text-muted-foreground">No locations found</p>
          <p className="text-xs text-muted-foreground mt-1">Try searching for cities, towns, or landmarks in Israel</p>
        </Card>
      )}

      {/* Help text */}
      {!showResults && query.trim().length === 0 && !selectedLocation && (
        <div className="mt-2 text-xs text-muted-foreground">
          <p>💡 Start typing to search for locations in Israel</p>
          <p>Examples: "Jerusalem", "Tel Aviv", "Haifa", "Eilat"</p>
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
