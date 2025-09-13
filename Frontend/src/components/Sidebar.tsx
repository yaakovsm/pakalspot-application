import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { useSpots } from '../hooks/useSpots';
import { SpotType, IsraeliRegion } from '../types/spot';
import { Search, Filter, MapPin, Plus } from 'lucide-react';
import SpotCard from './SpotCard';

interface SidebarProps {
  onAddSpot?: () => void;
  className?: string;
}

const spotTypes: { value: SpotType; label: string }[] = [
  { value: 'waterfall', label: 'Waterfall' },
  { value: 'spring', label: 'Spring' },
  { value: 'viewpoint', label: 'Viewpoint' },
  { value: 'beach', label: 'Beach' },
  { value: 'lake', label: 'Lake' },
  { value: 'river', label: 'River' },
  { value: 'cave', label: 'Cave' },
  { value: 'park', label: 'Park' },
  { value: 'forest', label: 'Forest' },
  { value: 'historical', label: 'Historical Site' },
  { value: 'archaeological', label: 'Archaeological Site' },
  { value: 'religious', label: 'Religious Site' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'cafe', label: 'Cafe' },
  { value: 'camping', label: 'Camping' },
  { value: 'other', label: 'Other' },
];

const israeliRegions: { value: IsraeliRegion; label: string }[] = [
  { value: 'negev', label: 'Negev' },
  { value: 'galilee', label: 'Galilee' },
  { value: 'golan', label: 'Golan Heights' },
  { value: 'shfela', label: 'Shfela' },
  { value: 'sharon', label: 'Sharon' },
  { value: 'shomron', label: 'Shomron' },
  { value: 'jerusalem', label: 'Jerusalem' },
  { value: 'arava', label: 'Arava' },
];

const distanceOptions = [
  { value: 5, label: '5km' },
  { value: 10, label: '10km' },
  { value: 20, label: '20km' },
  { value: 50, label: '50km' },
  { value: 100, label: 'All Israel' },
];

const Sidebar: React.FC<SidebarProps> = ({ onAddSpot, className }) => {
  const { spots, filters, updateFilters, isLoading, selectSpot } = useSpots();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [maxDistance, setMaxDistance] = useState([filters.maxDistance || 100]);
  const [selectedRegion, setSelectedRegion] = useState<IsraeliRegion | 'all'>('all');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredSpots = spots.filter(spot =>
    spot.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spot.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    spot.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTypeToggle = (type: SpotType) => {
    const currentTypes = filters.types;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter(t => t !== type)
      : [...currentTypes, type];
    
    updateFilters({ types: newTypes });
  };

  const handleSortChange = (sortBy: any) => {
    updateFilters({ sortBy });
  };

  const handleDistanceChange = (value: number[]) => {
    setMaxDistance(value);
    updateFilters({ maxDistance: value[0] });
  };

  const handleRegionChange = (region: IsraeliRegion | 'all') => {
    setSelectedRegion(region);
    updateFilters({ region: region === 'all' ? undefined : region });
  };

  return (
    <div className={`flex flex-col h-full bg-sidebar/80 backdrop-blur-md border-r border-sidebar-border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-sidebar-foreground">PakalSpot</h2>
          <Button variant="hero" size="sm" onClick={onAddSpot} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Spot
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search spots..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sidebar-foreground">Filters</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide' : 'Show'}
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Sort */}
            <div>
              <label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                Sort by
              </label>
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Distance</SelectItem>
                  <SelectItem value="popularity">Popularity</SelectItem>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Distance */}
            <div>
              <label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                Distance from your location
              </label>
              <Select value={maxDistance[0].toString()} onValueChange={(value) => handleDistanceChange([parseInt(value)])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {distanceOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Region */}
            <div>
              <label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                Region
              </label>
              <Select value={selectedRegion} onValueChange={handleRegionChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {israeliRegions.map(region => (
                    <SelectItem key={region.value} value={region.value}>
                      {region.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Distance Slider (backup) */}
            <div className="hidden">
              <label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                Max Distance: {maxDistance[0]}km
              </label>
              <Slider
                value={maxDistance}
                onValueChange={handleDistanceChange}
                max={100}
                min={1}
                step={1}
                className="w-full"
              />
            </div>

            {/* Types */}
            <div>
              <label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                Types
              </label>
              <div className="flex flex-wrap gap-2">
                {spotTypes.map(type => (
                  <Badge
                    key={type.value}
                    variant={filters.types.includes(type.value) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => handleTypeToggle(type.value)}
                  >
                    {type.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spots List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sidebar-foreground">
            {filteredSpots.length} spot{filteredSpots.length !== 1 ? 's' : ''}
          </h3>
          
          {isLoading && (
            <div className="flex gap-2 items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          {isLoading && (
            <>
              <div className="h-40 rounded-lg skeleton" />
              <div className="h-40 rounded-lg skeleton" />
              <div className="h-40 rounded-lg skeleton" />
            </>
          )}
          {!isLoading && filteredSpots.map(spot => (
            <div key={spot.id} onClick={() => selectSpot(spot)}>
              <SpotCard 
                spot={spot} 
                className="cursor-pointer hover:shadow-medium transition-smooth"
              />
            </div>
          ))}
          
          {filteredSpots.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No spots found matching your search.' : 'No spots available.'}
              </p>
              <Button variant="outline" onClick={onAddSpot} className="mt-3">
                Add the first spot
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;