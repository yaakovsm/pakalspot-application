import { useState, useEffect } from 'react';

/**
 * Subscribes to a CSS media query. Matches Tailwind `lg` when query is `(min-width: 1024px)`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Tailwind `lg` breakpoint — use for app shell layout (sidebar + map vs mobile explore). */
export const MIN_WIDTH_LG = '(min-width: 1024px)';
