import { useEffect, useState } from 'react';

export type Viewport = 'mobile' | 'tablet' | 'desktop';

const MOBILE_MAX = 767;
const TABLET_MAX = 1023;

function readViewport(): Viewport {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width <= MOBILE_MAX) return 'mobile';
  if (width <= TABLET_MAX) return 'tablet';
  return 'desktop';
}

export function useViewport(): Viewport {
  const [viewport, setViewport] = useState<Viewport>(readViewport);

  useEffect(() => {
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_MAX}px)`);
    const tabletQuery = window.matchMedia(
      `(min-width: ${MOBILE_MAX + 1}px) and (max-width: ${TABLET_MAX}px)`,
    );

    const onChange = () => setViewport(readViewport());

    mobileQuery.addEventListener('change', onChange);
    tabletQuery.addEventListener('change', onChange);
    return () => {
      mobileQuery.removeEventListener('change', onChange);
      tabletQuery.removeEventListener('change', onChange);
    };
  }, []);

  return viewport;
}
