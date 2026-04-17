import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { Waypoint } from '../types';

export const MapController = ({ currentView, waypoints, isPrint = false }: { currentView: string; waypoints: Waypoint[]; isPrint?: boolean }) => {
  const map = useMap();
  
  useEffect(() => {
    (window as any).leafletMap = map;
  }, [map]);

  const lastViewRef = useRef<string | null>(null);
  const lastWaypointsCountRef = useRef(waypoints.length);

  useEffect(() => {
    const isPlanner = currentView === 'planner';
    const isAnalysis = currentView === 'analysis' || isPrint;
    
    if ((isPlanner || isAnalysis) && waypoints.length > 0) {
      // Always trigger on view switch or when waypoints change significantly
      const isViewSwitch = lastViewRef.current !== currentView;
      const waypointsChanged = lastWaypointsCountRef.current !== waypoints.length;

      if (isViewSwitch || isPrint) {
        // Use a longer timeout for print to ensure the hidden container is fully rendered
        const timeout = isPrint ? 800 : (isAnalysis ? 300 : 100);
        
        setTimeout(() => {
          map.invalidateSize();
          try {
            const bounds = L.latLngBounds(waypoints.map(wp => [wp.lat, wp.lng]));
            if (bounds.isValid()) {
              // Call invalidateSize again just before fitting to be absolutely sure
              map.invalidateSize();
              map.fitBounds(bounds, { 
                padding: isPrint ? [80, 80] : [50, 50], 
                maxZoom: isPrint ? 15 : 18,
                animate: false 
              });
            }
          } catch (e) {
            console.error("MapController: Error fitting bounds", e);
          }
        }, timeout);
      } else if (waypointsChanged) {
        // Just invalidate size if waypoints changed, but don't re-center/zoom
        map.invalidateSize();
      }
    }
    lastViewRef.current = currentView;
    lastWaypointsCountRef.current = waypoints.length;
  }, [currentView, map, waypoints, isPrint]);

  return null;
};
