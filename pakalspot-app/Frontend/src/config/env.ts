export const VITE_GOOGLE_MAPS_API_KEY =
  (globalThis as any)?.window?.__ENV?.VITE_GOOGLE_MAPS_API_KEY ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) ||
  '';

export const VITE_GOOGLE_CLIENT_ID =
  (globalThis as any)?.window?.__ENV?.VITE_GOOGLE_CLIENT_ID ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) ||
  '';
