import React from 'react';
import { 
  MapPin, 
  Trash2, 
  AlertTriangle, 
  Spline
} from 'lucide-react';
import { Waypoint, Pump, HoseSize } from '../types';
import { cn } from '../lib/utils';
import { sortPumps } from '../constants/pumpData';

const PumpIcon = ({ size = 20, className = "" }: { size?: number, className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 512 512" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="32" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M 250 80 C 350 80, 420 150, 420 250 C 420 350, 350 420, 250 420 C 150 420, 80 350, 80 250 C 80 150, 150 80, 250 80 M 250 80 L 450 80 L 450 180 L 390 180" />
    <circle cx="250" cy="250" r="100" strokeWidth="24"/>
    <rect x="450" y="70" width="40" height="120" rx="8" fill="currentColor" stroke="none"/>
    <path d="M 160 420 L 340 420 L 380 480 L 120 480 Z" fill="currentColor" stroke="none"/>
    <circle cx="250" cy="250" r="25" fill="currentColor" stroke="none"/>
  </svg>
);

interface WaypointItemProps {
  wp: Waypoint;
  index: number;
  waypoints: Waypoint[];
  settings: {
    pumps: Pump[];
    hoses: HoseSize[];
    autoBufferBasin: boolean;
    defaultHoseId: string;
    defaultHoseCount: number;
    defaultPumpId: string;
  };
  updateWaypoint: (id: string, updates: Partial<Waypoint>) => void;
  removeWaypoint: (id: string) => void;
  waypointResults: any[];
}

export const WaypointItem = ({ 
  wp, 
  index, 
  waypoints, 
  settings, 
  updateWaypoint, 
  removeWaypoint,
  waypointResults
}: WaypointItemProps) => {
  const result = waypointResults?.[index];
  const isLast = index === waypoints.length - 1;

  return (
    <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-200 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm",
            index === 0 ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"
          )}>
            {index === 0 ? <MapPin size={14} /> : index + 1}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800">
              {index === 0 ? 'Wasserentnahme' : isLast ? 'Wasserabgabe' : `Wegpunkt ${index + 1}`}
            </h4>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
            </p>
          </div>
        </div>
        
        {result && (
          <div className="text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Druck</p>
            <p className={cn(
              "text-sm font-black",
              result.inletPressure < 0 ? "text-red-500" : "text-blue-600"
            )}>
              {result.inletPressure.toFixed(1)} bar
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {/* Warnings */}
        {result && (result.isNegativePressure || result.isHighPressure || result.isHighStaticPressure) && (
          <div className="flex flex-col gap-1.5">
            {result.isNegativePressure && (
              <div className="flex items-center gap-2 bg-red-50 p-2 rounded-xl border border-red-100">
                <AlertTriangle className="text-red-500" size={14} />
                <div>
                  <p className="text-[10px] font-bold text-red-900 uppercase">Warnung: Unterdruck!</p>
                  <p className="text-[9px] text-red-700 leading-tight">Druck fällt unter 0 bar!</p>
                </div>
              </div>
            )}
            {result.isHighPressure && (
              <div className="flex items-center gap-2 bg-red-50 p-2 rounded-xl border border-red-100">
                <AlertTriangle className="text-red-500" size={14} />
                <div>
                  <p className="text-[10px] font-bold text-red-900 uppercase">Warnung: Überdruck!</p>
                  <p className="text-[9px] text-red-700 leading-tight">Max. Betriebsdruck überschritten!</p>
                </div>
              </div>
            )}
            {result.isHighStaticPressure && (
              <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-xl border border-amber-100">
                <AlertTriangle className="text-amber-500" size={14} />
                <div>
                  <p className="text-[10px] font-bold text-amber-900 uppercase">Warnung: P-Stat!</p>
                  <p className="text-[9px] text-amber-700 leading-tight">Druck bei Nullförderung zu hoch!</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pump selection */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">
            {index === 0 ? 'Start-Pumpe' : 'Verstärker-Pumpe (optional)'}
          </label>
          <div className="flex gap-2">
            <select 
              className="flex-1 text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-600 outline-none"
              value={wp.pumpId ?? (index === 0 ? (settings.pumps[0]?.id ?? '') : '')}
              onChange={(e) => {
                const newPumpId = e.target.value;
                const updates: Partial<Waypoint> = { pumpId: newPumpId, curveId: undefined };
                if (index > 0) {
                  if (newPumpId && settings.autoBufferBasin) {
                    updates.isBufferBasin = true;
                  } else if (!newPumpId) {
                    updates.isBufferBasin = false;
                  }
                }
                updateWaypoint(wp.id, updates);
              }}
            >
              <option value="">Keine Pumpe</option>
              {sortPumps(settings.pumps.filter(p => p.enabled || p.id === wp.pumpId)).map(p => (
                <option key={p.id} value={p.id}>{p.manufacturer} {p.model}</option>
              ))}
            </select>
            {(wp.pumpId || (index === 0 && wp.pumpId === undefined)) && (
              <input 
                type="number" 
                min="1" 
                max="4"
                className="w-12 text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 outline-none"
                value={wp.pumpCount === 0 ? '' : (wp.pumpCount ?? 1)}
                onChange={(e) => {
                  const val = e.target.value;
                  updateWaypoint(wp.id, { pumpCount: val === '' ? 0 : parseInt(val) || 0 });
                }}
                title="Anzahl parallele Pumpen"
              />
            )}
          </div>
          {(() => {
            const selectedPumpId = wp.pumpId ?? (index === 0 ? settings.pumps[0].id : '');
            const selectedPump = settings.pumps.find(p => p.id === selectedPumpId);
            if (selectedPump) {
              const curves = selectedPump.curves || [];
              const currentCurveId = wp.curveId || curves.find(c => c.active)?.id || curves[0]?.id;
              
              return (
                <div className="space-y-1.5 mt-1.5">
                  {curves.length > 1 && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-500 uppercase px-1">Drehzahl / Kennlinie</label>
                      <select 
                        className="w-full text-[10px] p-1 border border-slate-200 rounded-md bg-white focus:ring-1 focus:ring-blue-600 outline-none"
                        value={currentCurveId}
                        onChange={(e) => updateWaypoint(wp.id, { curveId: e.target.value })}
                      >
                        {curves.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}
        </div>

        {/* Hose selection */}
        {index < waypoints.length - 1 && (
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Schlauchleitung</label>
            <div className="flex gap-2">
              <select 
                className="flex-1 text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-600 outline-none"
                value={index === 0 ? (wp.hoseId ?? '') : (wp.hoseOverridden ? (wp.hoseId ?? '') : 'inherit')}
                onChange={(e) => {
                  if (e.target.value === 'inherit') {
                    const prevWp = waypoints[index - 1];
                    updateWaypoint(wp.id, { 
                      hoseId: prevWp.hoseId, 
                      hoseCount: prevWp.hoseCount,
                      hoseOverridden: false 
                    });
                  } else {
                    updateWaypoint(wp.id, { hoseId: e.target.value, hoseOverridden: true });
                  }
                }}
              >
                {index > 0 && <option value="inherit">Automatisch</option>}
                {settings.hoses.filter(h => h.enabled || h.id === wp.hoseId).map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
              <input 
                type="number" 
                min="1" 
                max="4"
                disabled={!wp.hoseOverridden && index > 0}
                className={cn(
                  "w-12 text-xs p-1.5 border border-slate-200 rounded-lg outline-none",
                  (!wp.hoseOverridden && index > 0) ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-slate-50"
                )}
                value={wp.hoseCount === 0 ? '' : (wp.hoseCount ?? 1)}
                onChange={(e) => {
                  const val = e.target.value;
                  updateWaypoint(wp.id, { hoseCount: val === '' ? 0 : parseInt(val) || 0, hoseOverridden: true });
                }}
                title={(!wp.hoseOverridden && index > 0) ? "Anzahl wird automatisch übernommen" : "Anzahl parallele Schläuche"}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-1">
        <button 
          onClick={() => removeWaypoint(wp.id)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-red-50 text-red-600 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-100"
        >
          <Trash2 size={12} />
          Löschen
        </button>
      </div>
    </div>
  );
};
