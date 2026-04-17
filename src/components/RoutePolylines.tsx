import React from 'react';
import { Polyline } from 'react-leaflet';
import { ElevationData, Waypoint } from '../types';

export const RoutePolylines = ({ elevationData, waypoints, isDataStale }: { elevationData: ElevationData[], waypoints: Waypoint[], isDataStale: boolean }) => {
  if (elevationData.length > 1 && !isDataStale) {
    const segments: { positions: [number, number][], color: string }[] = [];
    let currentPositions: [number, number][] = [[elevationData[0].lat, elevationData[0].lng]];
    let currentColor = elevationData[1].pressure < 0 ? '#ef4444' : '#4f46e5';

    for (let i = 1; i < elevationData.length; i++) {
      const segmentColor = elevationData[i].pressure < 0 ? '#ef4444' : '#4f46e5';
      if (segmentColor !== currentColor) {
        segments.push({ positions: currentPositions, color: currentColor });
        currentPositions = [[elevationData[i-1].lat, elevationData[i-1].lng], [elevationData[i].lat, elevationData[i].lng]];
        currentColor = segmentColor;
      } else {
        currentPositions.push([elevationData[i].lat, elevationData[i].lng]);
      }
    }
    if (currentPositions.length > 1) {
      segments.push({ positions: currentPositions, color: currentColor });
    }

    return (
      <>
        {segments.map((seg, idx) => (
          <Polyline 
            key={`colored-seg-${idx}`}
            positions={seg.positions}
            color={seg.color}
            weight={6}
            opacity={0.8}
            lineCap="round"
            lineJoin="round"
            interactive={false}
          />
        ))}
      </>
    );
  }

  // Fallback to simple Luftlinie (shown when stale or no data)
  return (
    <>
      {waypoints.length > 1 && waypoints.map((wp, index) => {
        if (index === waypoints.length - 1) return null;
        const nextWp = waypoints[index + 1];
        return (
          <Polyline 
            key={`fallback-seg-${wp.id}-${nextWp.id}`}
            positions={[[wp.lat, wp.lng], [nextWp.lat, nextWp.lng]]} 
            color={isDataStale ? "#94a3b8" : "#4f46e5"} 
            weight={6} 
            opacity={0.6}
            lineCap="round"
            lineJoin="round"
            interactive={false}
          />
        );
      })}
    </>
  );
};
