import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, List, Map } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import MapView from '../components/MapView';
import SpotCard from '../components/SpotCard';
import { Button } from '../components/ui/button';
import { useSpots } from '../hooks/useSpots';
import { useSpotDiscoveryBootstrap } from '../hooks/useSpotDiscoveryBootstrap';
import {
  groupSpotsByDistrict,
  isDistrictId,
  type DistrictId,
} from '../data/israelDistricts';
import type { Spot } from '../types/spot';

type ViewMode = 'split' | 'list' | 'map';
const SPLIT_SHEET_RATIO = 0.56;
const LIST_SHEET_RATIO = 0.82;
const MIN_SHEET_RATIO = 0.45;
const MAX_SHEET_RATIO = 0.88;

const MobileDistrictExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { districtId: rawDistrictId } = useParams();
  const { spots, selectSpot } = useSpots();
  useSpotDiscoveryBootstrap();

  const districtId: DistrictId | null =
    rawDistrictId && isDistrictId(rawDistrictId) ? rawDistrictId : null;

  const districtSpots = useMemo(() => {
    if (!districtId) return [] as Spot[];
    const grouped = groupSpotsByDistrict(spots);
    return grouped[districtId] ?? [];
  }, [spots, districtId]);

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [sheetRatio, setSheetRatio] = useState<number>(SPLIT_SHEET_RATIO);
  const [isDraggingSheet, setIsDraggingSheet] = useState(false);
  const dragStateRef = useRef<{ startY: number; startRatio: number } | null>(null);

  useEffect(() => {
    if (!isDraggingSheet || viewMode === 'map') return;

    const clamp = (v: number) => Math.min(MAX_SHEET_RATIO, Math.max(MIN_SHEET_RATIO, v));

    const onPointerMove = (evt: PointerEvent) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dy = evt.clientY - state.startY;
      const next = clamp(state.startRatio - dy / window.innerHeight);
      setSheetRatio(next);
    };

    const onPointerUp = () => {
      setIsDraggingSheet(false);
      dragStateRef.current = null;
      setSheetRatio((current) => {
        const snapped = current > 0.7 ? LIST_SHEET_RATIO : SPLIT_SHEET_RATIO;
        setViewMode(snapped === LIST_SHEET_RATIO ? 'list' : 'split');
        return snapped;
      });
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [isDraggingSheet, viewMode]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const handleViewDetails = (spot: Spot) => {
    selectSpot(spot);
    navigate(`/spot/${spot.id}`);
  };

  const handleSheetDragStart = (evt: React.PointerEvent<HTMLButtonElement>) => {
    if (viewMode === 'map') return;
    dragStateRef.current = { startY: evt.clientY, startRatio: sheetRatio };
    setIsDraggingSheet(true);
  };

  if (!districtId) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center p-6">
        <div className="space-y-3 text-center">
          <p className="text-sm text-muted-foreground">{t('mobile.invalid_district')}</p>
          <Button variant="outline" onClick={() => navigate('/')}>
            {t('mobile.back_to_explore')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="px-3 py-2 flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full h-9 w-9"
            onClick={handleBack}
            aria-label={t('mobile.back_to_explore')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold truncate">
              {t('mobile.district_section_title', { area: t(`districts.${districtId}`) })}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t('spots.spots_count_plural', { count: districtSpots.length })}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col">
        <div
          className="min-h-0 shrink-0"
          style={{
            height: viewMode === 'map' ? '100%' : `${(1 - sheetRatio) * 100}%`,
          }}
        >
          <MapView
            className="w-full h-full rounded-none"
            visibleSpots={districtSpots}
            fitToVisibleSpots
          />
        </div>

        {viewMode !== 'map' && (
          <section
            className="min-h-0 bg-background border-t border-border rounded-t-3xl overflow-hidden"
            style={{ height: `${sheetRatio * 100}%` }}
          >
            <div className="sticky top-0 z-10 bg-background px-4 pt-2 pb-2 border-b border-border/50">
              <div className="flex justify-center mb-2">
                <button
                  type="button"
                  onPointerDown={handleSheetDragStart}
                  className="h-1.5 w-14 rounded-full bg-muted hover:bg-muted-foreground/40 transition-colors touch-none cursor-grab active:cursor-grabbing"
                  aria-label={t('mobile.drag_list_handle')}
                />
              </div>
              <h2 className="text-sm font-semibold">{t('mobile.places_in_area')}</h2>
            </div>

            <div className="h-full overflow-y-auto px-3 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-3 space-y-3">
              {districtSpots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('mobile.no_spots_in_district')}
                </p>
              ) : (
                districtSpots.map((spot) => (
                  <SpotCard
                    key={spot.id}
                    spot={spot}
                    variant="carousel"
                    className="w-full max-w-none"
                    onViewDetails={handleViewDetails}
                  />
                ))
              )}
            </div>
          </section>
        )}
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          if (viewMode === 'map') {
            setViewMode(sheetRatio > 0.7 ? 'list' : 'split');
            return;
          }
          setViewMode('map');
        }}
        className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5.2rem+env(safe-area-inset-bottom,0px))] z-30 rounded-full px-4 py-2 bg-black/85 text-white hover:bg-black shadow-strong"
        aria-label={viewMode === 'map' ? t('mobile.show_list') : t('mobile.show_map')}
      >
        {viewMode === 'map' ? <List className="h-4 w-4 text-white" /> : <Map className="h-4 w-4 text-white" />}
        {viewMode === 'map' ? t('mobile.show_list') : t('mobile.show_map')}
      </Button>
    </div>
  );
};

export default MobileDistrictExplorePage;
