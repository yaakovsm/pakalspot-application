import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSpots } from '../../hooks/useSpots';
import { useSpotsTextFilter } from '../../hooks/useSpotsTextFilter';
import { SPOT_FILTER_TYPES } from '../../constants/spotFilterTypes';
import type { Spot, SpotType } from '../../types/spot';
import {
  groupSpotsByDistrict,
  districtsWithSpots,
  type DistrictId,
} from '../../data/israelDistricts';
import SpotCard from '../SpotCard';
import { Button } from '../ui/button';
import MobileMoreMenu from './MobileMoreMenu';

const MobileExploreFeed: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { spots, filters, updateFilters, isLoading, selectSpot } = useSpots();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDistrictId, setExpandedDistrictId] = useState<DistrictId | null>(null);
  const filteredSpots = useSpotsTextFilter(spots, searchQuery);
  const grouped = groupSpotsByDistrict(filteredSpots);
  const districtSections = districtsWithSpots(grouped);

  const handleTypeToggle = (type: SpotType) => {
    const currentTypes = filters.types;
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((x) => x !== type)
      : [...currentTypes, type];
    updateFilters({ types: newTypes });
  };

  const handleViewDetails = (spot: Spot) => {
    selectSpot(spot);
    navigate(`/spot/${spot.id}`);
  };

  const toggleDistrictExpand = (id: DistrictId) => {
    setExpandedDistrictId((current) => (current === id ? null : id));
  };

  const districtTitle = (id: DistrictId) =>
    t('mobile.district_section_title', { area: t(`districts.${id}`) });

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-background">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md pt-3 pb-2 px-4 border-b border-border/60 space-y-3">
        <div className="flex !flex-row items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('mobile.search_spots')}
              className="w-full rounded-full border border-border bg-card py-2.5 ps-10 pe-4 text-sm text-start shadow-soft placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              autoComplete="off"
            />
          </div>
          <MobileMoreMenu />
        </div>

        <div
          className="flex !flex-row gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {SPOT_FILTER_TYPES.map((type) => {
            const active = filters.types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeToggle(type)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground border-primary shadow-soft'
                    : 'bg-card text-muted-foreground border-border'
                }`}
              >
                {t(`spots.spot_types.${type}`)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-8">
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!isLoading && districtSections.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">{t('mobile.no_spots_match')}</p>
        )}

        {!isLoading &&
          districtSections.map(({ id, spots: sectionSpots }) => {
            const isExpanded = expandedDistrictId === id;
            return (
              <section key={id} className="space-y-3">
                <div className="flex items-start justify-between gap-2 pe-1">
                  <h2 className="text-base font-bold text-foreground leading-tight flex-1 min-w-0">
                    {districtTitle(id)}
                  </h2>
                  <Button
                    type="button"
                    variant="hero"
                    size="icon"
                    className="h-9 w-9 shrink-0 rounded-full shadow-soft"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? t('mobile.collapse_district') : t('mobile.expand_district')}
                    onClick={() => toggleDistrictExpand(id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-primary-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-primary-foreground" />
                    )}
                  </Button>
                </div>
                {isExpanded ? (
                  <div className="grid grid-cols-2 gap-3 pb-2">
                    {sectionSpots.map((spot: Spot) => (
                      <div key={spot.id} className="min-w-0">
                        <SpotCard
                          spot={spot}
                          variant="carousel"
                          className="w-full max-w-none min-w-0"
                          onViewDetails={handleViewDetails}
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    className="flex !flex-row gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {sectionSpots.map((spot: Spot) => (
                      <div key={spot.id} className="snap-start">
                        <SpotCard
                          spot={spot}
                          variant="carousel"
                          onViewDetails={handleViewDetails}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
      </div>
    </div>
  );
};

export default MobileExploreFeed;
