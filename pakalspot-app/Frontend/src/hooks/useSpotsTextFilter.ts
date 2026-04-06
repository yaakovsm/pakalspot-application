import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Spot } from '../types/spot';
import { normalizeSpotType } from '../types/spot';

/** Client-side text filter on the spots list (title, description, type, translated type label). */
export function useSpotsTextFilter(spots: Spot[] | undefined, searchQuery: string): Spot[] {
  const { t } = useTranslation();

  return useMemo(() => {
    if (!Array.isArray(spots)) return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return spots;
    return spots.filter((spot) => {
      const st = normalizeSpotType(String(spot.spot_type ?? ''));
      const typeLabel = t(`spots.spot_types.${st}`).toLowerCase();
      const title = spot.title.toLowerCase();
      const desc = spot.description.toLowerCase();
      return (
        title.includes(q) ||
        desc.includes(q) ||
        st.includes(q) ||
        typeLabel.includes(q)
      );
    });
  }, [spots, searchQuery, t]);
}
