// Counts a view of a place (page or pop-up) and the contact clicks inside it
// (elements with data-track / data-place). See src/lib/track.ts.
'use client';

import { useEffect } from 'react';
import { trackPlace, installClickTracking } from '../lib/track';

export function PlaceTracker({ placeId }: { placeId: number }) {
  useEffect(() => {
    trackPlace(placeId, 'view');
  }, [placeId]);
  useEffect(() => installClickTracking(), []);
  return null;
}
