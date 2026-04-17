import React, { useState, useEffect } from 'react';
import { AlertTriangle, Filter, Trash2 } from 'lucide-react';
import { Waypoint, WaypointResult } from '../types';
import { cn } from '../lib/utils';

export const WaypointPopup = ({ 
  wp, 
  index, 
  waypoints, 
  settings, 
  plannerFlowRate, 
  setPlannerFlowRate, 
  startPressure, 
  setStartPressure, 
  updateWaypoint, 
  removeWaypoint,
  sortPumps,
  waypointResults
}: { 
  wp: Waypoint; 
  index: number; 
  waypoints: Waypoint[]; 
  settings: any; 
  plannerFlowRate: number; 
  setPlannerFlowRate: (val: number) => void; 
  startPressure: number; 
  setStartPressure: (val: number) => void; 
  updateWaypoint: (id: string, updates: Partial<Waypoint>) => void; 
  removeWaypoint: (id: string) => void;
  sortPumps: (pumps: any[]) => any[];
  waypointResults: WaypointResult[];
}) => {
  const [localFlowRate, setLocalFlowRate] = useState(plannerFlowRate.toString());
  const [localPressure, setLocalPressure] = useState(startPressure.toString());

  // Sync with props if they change externally (e.g. new route loaded)
  useEffect(() => {
    setLocalFlowRate(plannerFlowRate.toString());
  }, [plannerFlowRate]);

  useEffect(() => {
    setLocalPressure(startPressure.toString());
  }, [startPressure]);

  return (
    <div className="p-1 space-y-3" onClick={(e) => e.stopPropagation()}>
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
          Punkt {index + 1} {index === 0 ? '(Start)' : ''}
        </p>
        <p className="text-xs font-medium text-slate-600">
          {wp.lat.toFixed(4)}, {wp.lng.toFixed(4)}
        </p>
      </div>

      <div className="space-y-3">
        {/* Flow Rate and Start Pressure for the first point */}
        {index === 0 && (
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Durchfluss (l/min)</label>
              <input 
                type="number" 
                min="100" 
                max="10000"
                step="100"
                className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-600 outline-none"
                value={localFlowRate}
                onChange={(e) => setLocalFlowRate(e.target.value)}
                onBlur={() => {
                  const val = parseInt(localFlowRate);
                  if (!isNaN(val)) {
                    setPlannerFlowRate(val);
                  } else {
                    setLocalFlowRate(plannerFlowRate.toString());
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Startdruck (bar)</label>
              <input 
                type="number" 
                min="0" 
                max="16"
                step="0.1"
                className="w-full text-xs p-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:ring-2 focus:ring-blue-600 outline-none"
                value={localPressure}
                onChange={(e) => setLocalPressure(e.target.value)}
                onBlur={() => {
                  const val = parseFloat(localPressure);
                  if (!isNaN(val)) {
                    setStartPressure(val);
                  } else {
                    setLocalPressure(startPressure.toString());
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* Buffer Basin toggle for intermediate points */}
        {index > 0 && wp.pumpId && (
          <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
            <label className="text-[10px] font-bold text-slate-500 uppercase cursor-pointer" htmlFor={`basin-${wp.id}`}>
              Pufferbecken
            </label>
            <input 
              id={`basin-${wp.id}`}
              type="checkbox"
              className="w-4 h-4 text-blue-700 rounded focus:ring-blue-600"
              checked={wp.isBufferBasin || false}
              onChange={(e) => updateWaypoint(wp.id, { isBufferBasin: e.target.checked })}
            />
          </div>
        )}

        {/* Overload Warning */}
        {waypointResults[index]?.isOverloaded && (
          <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-start gap-2">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={14} />
            <div>
              <p className="text-[10px] font-bold text-amber-900 uppercase">Warnung: Überlastung</p>
              <p className="text-[9px] text-amber-700 leading-tight">Durchfluss überschreitet Qmax der Pumpe.</p>
            </div>
          </div>
        )}

        {/* Grain Size Warning */}
        {waypointResults[index]?.isGrainSizeWarning && (
          <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-start gap-2">
            <Filter className="text-amber-600 flex-shrink-0 mt-0.5" size={14} />
            <div>
              <p className="text-[10px] font-bold text-amber-900 uppercase">Warnung: Korndurchlass</p>
              <p className="text-[9px] text-amber-700 leading-tight">Kleinerer Durchlass als Startpumpe (Verstopfungsgefahr).</p>
            </div>
          </div>
        )}

        {/* Negative Pressure Warning */}
        {waypointResults[index]?.isNegativePressure && (
          <div className="bg-red-50 border border-red-200 p-2 rounded-lg flex items-start gap-2">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={14} />
            <div>
              <p className="text-[10px] font-bold text-red-900 uppercase">Warnung: Unterdruck</p>
              <p className="text-[9px] text-red-700 leading-tight">Druck fällt im nächsten Abschnitt unter 0 bar!</p>
            </div>
          </div>
        )}

        {/* High Operating Pressure Warning */}
        {waypointResults[index]?.isHighPressure && (
          <div className="bg-red-50 border border-red-200 p-2 rounded-lg flex items-start gap-2">
            <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={14} />
            <div>
              <p className="text-[10px] font-bold text-red-900 uppercase">Warnung: P-Max!</p>
              <p className="text-[9px] text-red-700 leading-tight">Zulässiger Betriebsdruck überschritten!</p>
            </div>
          </div>
        )}

        {/* High Static Pressure Warning */}
        {waypointResults[index]?.isHighStaticPressure && (
          <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-start gap-2">
            <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={14} />
            <div>
              <p className="text-[10px] font-bold text-amber-900 uppercase">Warnung: P-Stat!</p>
              <p className="text-[9px] text-amber-700 leading-tight">Druck bei Nullförderung zu hoch!</p>
            </div>
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
