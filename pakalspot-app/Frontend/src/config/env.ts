export const GOOGLE_MAPS_API_KEY =
  (globalThis as any)?.window?.__ENV?.GOOGLE_MAPS_API_KEY ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) ||
  '';
