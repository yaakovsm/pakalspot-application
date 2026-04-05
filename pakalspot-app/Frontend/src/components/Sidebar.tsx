import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { useSpots } from '../hooks/useSpots';
import { SpotType } from '../types/spot';
import { Search, Filter, MapPin, Plus } from 'lucide-react';
import SpotCard from './SpotCard';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  onAddSpot?: () => void;
  onInfoClick?: () => void;
  onInfoHover?: (spot: Spot | null) => void;
  className?: string;
}

const spotTypes: SpotType[] = [
  'waterfall', 'spring', 'viewpoint', 'beach', 'lake', 'river', 'cave', 'park', 
  'forest', 'historical', 'archaeological', 'religious', 'restaurant', 'cafe', 
  'camping', 'other'
];

const distanceOptions = [
  { value: 5, label: '5km' },
  { value: 10, label: '10km' },
  { value: 20, label: '20km' },
  { value: 50, label: '50km' },
  { value: 100, label: 'all_israel' },
];

const Sidebar: React.FC<SidebarProps> = ({ onAddSpot, onInfoClick, onInfoHover, className }) => {
  const { spots, filters, updateFilters, isLoading, selectSpot } = useSpots();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [maxDistance, setMaxDistance] = useState([filters.maxDistance || 100]);

  const handleViewDetails = (spot: any) => {
    selectSpot(spot);
    navigate(`/spot/${spot.id}`);
  };

  const handleInfoClick = (spot: any) => {
    selectSpot(spot);
    onInfoClick?.();
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Defensive check: ensure spots is an array before filtering
  const filteredSpots = Array.isArray(spots)
    ? spots.filter((spot) => {
        const q = searchQuery.toLowerCase();
        const st = String(spot.spot_type ?? '').toLowerCase();
        return (
          spot.title.toLowerCase().includes(q) ||
          spot.description.toLowerCase().includes(q) ||
          st.includes(q)
        );
      })
    : [];

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

  return (
    <div className={`flex flex-col h-full bg-sidebar/80 backdrop-blur-md border-r border-sidebar-border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-sidebar-foreground">{t('app.name')}</h2>
          <Button variant="hero" size="sm" onClick={onAddSpot} className="gap-2">
            <Plus className="w-4 h-4" />
            {t('spots.add_spot')}
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder={t('spots.search_placeholder')}
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sidebar-foreground">{t('spots.filters')}</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? t('spots.hide_filters') : t('spots.show_filters')}
          </Button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            {/* Sort */}
            <div>
              <label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                {t('spots.sort_by')}
              </label>
              <Select value={filters.sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">{t('spots.distance')}</SelectItem>
                  <SelectItem value="popularity">{t('spots.popularity')}</SelectItem>
                  <SelectItem value="newest">{t('spots.newest')}</SelectItem>
                  <SelectItem value="oldest">{t('spots.oldest')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Distance */}
            <div>
              <label className="text-sm font-medium text-sidebar-foreground mb-2 block">
                {t('spots.distance_from_location')}
              </label>
              <Select value={maxDistance[0].toString()} onValueChange={(value) => handleDistanceChange([parseInt(value)])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {distanceOptions.map(option => (
                    <SelectItem key={option.value} value={option.value.toString()}>
                      {t(`distance_options.${option.label}`)}
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
                {t('spots.types')}
              </label>
              <div className="flex flex-wrap gap-2">
                {spotTypes.map(type => (
                  <Badge
                    key={type}
                    variant={filters.types.includes(type) ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => handleTypeToggle(type)}
                  >
                    {t(`spot_types.${type}`)}
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
            {t('spots.spots_count_plural', { count: filteredSpots.length })}
          </h3>
          
          {isLoading && (
            <div className="flex gap-2 items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary" />
            </div>
          )}
        </div>

        <div className="space-y-2">
          {isLoading && (
            <>
              <div className="h-24 rounded-lg skeleton" />
              <div className="h-24 rounded-lg skeleton" />
              <div className="h-24 rounded-lg skeleton" />
            </>
          )}
          {!isLoading && filteredSpots.map(spot => (
            <div key={spot.id}>
              <SpotCard 
                spot={spot} 
                onViewDetails={handleViewDetails}
                onInfoClick={handleInfoClick}
                onInfoHover={onInfoHover}
                className="cursor-pointer hover:shadow-medium transition-smooth"
              />
            </div>
          ))}
          
          {filteredSpots.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? t('spots.no_spots_found') : t('spots.no_spots')}
              </p>
              <Button variant="outline" onClick={onAddSpot} className="mt-3">
                {t('spots.add_first_spot')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;