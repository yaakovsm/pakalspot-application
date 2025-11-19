import { TFunction } from 'i18next';
import { Spot } from '../types/spot';

/**
 * Maps spot titles (Hebrew) to translation keys
 */
const spotTitleToKey: Record<string, string> = {
  'בריכת המשושים': 'hexagon_pool',
  'מצודת ביריה': 'biriya_fortress',
  'מפל ג\'ילבון': 'jilabun_waterfall',
  'הר תבור': 'mount_tabor',
  'סידנא עלי': 'sidna_ali',
};

/**
 * Maps location names to translation keys (fallback)
 */
const locationNameToKey: Record<string, string> = {
  'בריכת המשושים': 'hexagon_pool',
  'מצודת ביריה': 'biriya_fortress',
  'מפל ג\'ילבון': 'jilabun_waterfall',
  'הר תבור': 'mount_tabor',
  'סידנא עלי': 'sidna_ali',
};

/**
 * Get translation key for a spot based on its title or location_name
 */
export const getSpotTranslationKey = (spot: Spot): string | null => {
  // Try title first
  if (spot.title && spotTitleToKey[spot.title]) {
    return spotTitleToKey[spot.title];
  }
  
  // Fallback to location_name
  if (spot.location_name && locationNameToKey[spot.location_name]) {
    return locationNameToKey[spot.location_name];
  }
  
  return null;
};

/**
 * Get translated spot content
 * Returns the translated content if available, otherwise returns the original
 */
export const getTranslatedSpotContent = (
  spot: Spot,
  t: TFunction,
  field: 'title' | 'subtitle' | 'description' | 'how_to_get_there'
): string => {
  const translationKey = getSpotTranslationKey(spot);
  
  if (translationKey) {
    const translated = t(`spot_content.${translationKey}.${field}`, { returnObjects: false });
    // If translation exists and is not the key itself, return it
    if (translated && translated !== `spot_content.${translationKey}.${field}`) {
      return translated;
    }
  }
  
  // Fallback to original content
  switch (field) {
    case 'title':
      return spot.title;
    case 'subtitle':
      return spot.subtitle || '';
    case 'description':
      return spot.description;
    case 'how_to_get_there':
      return spot.how_to_get_there || '';
    default:
      return '';
  }
};

