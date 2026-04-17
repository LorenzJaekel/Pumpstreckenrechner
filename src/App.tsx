import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { toPng } from 'html-to-image';
import { 
  Trash2, 
  Navigation, 
  TrendingUp, 
  TrendingDown, 
  Loader2,
  Info,
  BarChart3,
  LayoutDashboard,
  Map as MapIcon,
  MapPin,
  Navigation2,
  ArrowDownRight,
  ArrowLeftRight,
  Maximize2,
  Settings,
  Globe,
  Layers,
  Moon,
  Sun,
  Check,
  Plus,
  List,
  X,
  Save,
  Edit2,
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
  AreaChart,
  Ruler,
  MousePointer2,
  Move,
  Crosshair,
  RefreshCw,
  Gauge,
  Zap,
  Filter,
  Droplets,
  FileUp,
  FileText,
  Download,
  Share2,
  Square,
  CheckSquare,
  Spline,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

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

import { 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Label,
  Legend,
  BarChart,
  Bar,
  Cell
} from 'recharts';
import { cn } from './lib/utils';
import { CharacteristicCurve, ElevationData, HoseSize, Pump, RouteSummary, SavedRoute, Waypoint, WaypointResult } from './types';
import { exportToPDF } from './lib/pdfExport';
import { MapController } from './components/MapController';
import { RoutePolylines } from './components/RoutePolylines';
import { WaypointPopup } from './components/WaypointPopup';
import { AnalysisReport } from './components/AnalysisReport';
import { WaypointItem } from './components/WaypointItem';
import { DEFAULT_PUMPS, DEFAULT_HOSES, sortPumps, sortHoses } from './constants/pumpData';
import { MANUAL_CONTENT } from './constants/manual';
import LZString from 'lz-string';

// Fix Leaflet marker icons
const markerIcon2x = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom icons for waypoints
const createWaypointIcon = (index: number, hasPump: boolean, hasHoseOverride: boolean = false) => {
  const iconMarkup = renderToStaticMarkup(
    <div className="relative flex flex-col items-center">
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white",
        hasPump || hasHoseOverride
          ? "bg-blue-600" 
          : "bg-slate-400"
      )}>
        {hasPump ? (
          <PumpIcon size={16} className="text-white" />
        ) : hasHoseOverride ? (
          <Spline size={16} className="text-white" />
        ) : (
          <span className="text-[10px] font-bold text-white">{index + 1}</span>
        )}
      </div>
      <div className={cn(
        "w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] -mt-1",
        hasPump || hasHoseOverride
          ? "border-t-blue-600" 
          : "border-t-slate-400"
      )} />
    </div>
  );

  return L.divIcon({
    html: iconMarkup,
    className: 'custom-waypoint-icon',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -40],
  });
};

// Components
const PumpDetails = ({ 
  pump, 
  onUpdate, 
  onDelete,
  expandedManufacturer,
  setExpandedManufacturer,
  setSelectedModelByManufacturer
}: { 
  pump: Pump, 
  onUpdate: (updatedPump: Pump) => void,
  onDelete: () => void,
  expandedManufacturer: string | null,
  setExpandedManufacturer: (val: string | null) => void,
  setSelectedModelByManufacturer: (updater: (prev: { [key: string]: string }) => { [key: string]: string }) => void
}) => {
  const [localManufacturer, setLocalManufacturer] = useState(pump.manufacturer);
  const [localModel, setLocalModel] = useState(pump.model);

  useEffect(() => {
    setLocalManufacturer(pump.manufacturer);
    setLocalModel(pump.model);
  }, [pump.id, pump.manufacturer, pump.model]);

  const handleManufacturerBlur = () => {
    if (localManufacturer === pump.manufacturer) return;
    const oldVal = pump.manufacturer;
    const newVal = localManufacturer;
    
    onUpdate({ ...pump, manufacturer: newVal });

    if (expandedManufacturer === oldVal) {
      setExpandedManufacturer(newVal);
    }

    setSelectedModelByManufacturer(prev => {
      const next = { ...prev };
      if (next[oldVal] === pump.id) {
        delete next[oldVal];
        next[newVal] = pump.id;
      }
      return next;
    });
  };

  const handleModelBlur = () => {
    if (localModel === pump.model) return;
    onUpdate({ ...pump, model: localModel });
  };

  return (
    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 rounded-full" />
          <h5 className="text-sm font-bold text-slate-800">Spezifikationen: {pump.model}</h5>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Hersteller</label>
            <input 
              type="text" 
              value={localManufacturer}
              readOnly={pump.isDefault}
              onChange={(e) => setLocalManufacturer(e.target.value)}
              onBlur={handleManufacturerBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-red-500 outline-none",
                pump.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Modell</label>
            <input 
              type="text" 
              value={localModel}
              readOnly={pump.isDefault}
              onChange={(e) => setLocalModel(e.target.value)}
              onBlur={handleModelBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-red-500 outline-none",
                pump.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Typ</label>
            <select 
              value={pump.type ?? 'Tauchpumpe'}
              disabled={pump.isDefault}
              onChange={(e) => {
                const newType = e.target.value;
                onUpdate({ 
                  ...pump, 
                  type: newType,
                  driveType: newType === 'Tauchpumpe' ? 'Elektro' : 'Diesel'
                });
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-red-500 outline-none",
                pump.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            >
              <option value="Tauchpumpe">Tauchpumpe</option>
              <option value="Trocken aufgestellt">Trocken aufgestellt</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Antrieb</label>
            <select 
              value={pump.driveType ?? 'Elektro'}
              disabled={pump.isDefault}
              onChange={(e) => {
                onUpdate({ ...pump, driveType: e.target.value as 'Elektro' | 'Diesel' | 'Benzin' });
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-red-500 outline-none",
                pump.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            >
              <option value="Elektro">Elektro</option>
              <option value="Diesel">Diesel</option>
              <option value="Benzin">Benzin</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Leistung (kW)</label>
            <input 
              type="number" 
              step="0.1"
              value={pump.power ?? 0}
              readOnly={pump.isDefault}
              onChange={(e) => {
                onUpdate({ ...pump, power: parseFloat(e.target.value) || 0 });
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-red-500 outline-none",
                pump.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Korndurchlass (mm)</label>
            <input 
              type="number" 
              value={pump.grainSize === 0 ? '' : (pump.grainSize ?? '')}
              readOnly={pump.isDefault}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate({ ...pump, grainSize: val === '' ? 0 : parseInt(val) || 0 });
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-red-500 outline-none",
                pump.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Gehäusedruck (bar)</label>
            <input 
              type="number" 
              step="0.1"
              value={pump.maxCasingPressure ?? 0}
              readOnly={pump.isDefault}
              onChange={(e) => {
                onUpdate({ ...pump, maxCasingPressure: parseFloat(e.target.value) || 0 });
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-red-500 outline-none",
                pump.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            />
          </div>
        </div>
        {!pump.isDefault && (
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kennlinien (Polynom & Max Flow)</h4>
              <button 
                onClick={() => {
                  const activeCurve = pump.curves?.find(c => c.active) || pump.curves?.[0];
                  const newCurve: CharacteristicCurve = {
                    id: `c-${Date.now()}`,
                    name: 'Neue Drehzahl',
                    a2: activeCurve?.a2 || 0,
                    a1: activeCurve?.a1 || 0,
                    a0: activeCurve?.a0 || 0,
                    maxFlow: activeCurve?.maxFlow || 1000,
                    active: false
                  };
                  onUpdate({ ...pump, curves: [...(pump.curves || []), newCurve] });
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100"
              >
                <Plus size={12} />
                Kennlinie hinzufügen
              </button>
            </div>

            <div className="space-y-3">
              {(pump.curves || []).map((curve) => (
                <div key={curve.id} className={cn(
                  "p-4 rounded-2xl border",
                  curve.active ? "bg-blue-50/50 border-blue-200 shadow-sm" : "bg-white border-slate-100"
                )}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <input 
                        type="radio"
                        checked={curve.active ?? false}
                        onChange={() => {
                          onUpdate({
                            ...pump,
                            curves: pump.curves.map(c => ({ ...c, active: c.id === curve.id }))
                          });
                        }}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <input 
                        type="text"
                        value={curve.name ?? ''}
                        onChange={(e) => {
                          onUpdate({
                            ...pump,
                            curves: pump.curves.map(c => c.id === curve.id ? { ...c, name: e.target.value } : c)
                          });
                        }}
                        placeholder="Name / Drehzahl"
                        className="bg-transparent border-none p-0 text-xs font-bold text-slate-800 focus:ring-0 w-32"
                      />
                    </div>
                    <button 
                      onClick={() => {
                        if (pump.curves.length <= 1) return;
                        onUpdate({
                          ...pump,
                          curves: pump.curves.filter(c => c.id !== curve.id).map((c, idx) => idx === 0 && !pump.curves.find(oldC => oldC.id !== curve.id && oldC.active) ? { ...c, active: true } : c)
                        });
                      }}
                      className="text-slate-300 hover:text-red-500"
                      disabled={pump.curves.length <= 1}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">A2</label>
                      <input 
                        type="number" 
                        step="any"
                        value={curve.a2 ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdate({
                            ...pump,
                            curves: pump.curves.map(c => c.id === curve.id ? { ...c, a2: val } : c)
                          });
                        }}
                        className="w-full bg-white p-1.5 rounded-lg text-[10px] font-bold mt-0.5 border border-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">A1</label>
                      <input 
                        type="number" 
                        step="any"
                        value={curve.a1 ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdate({
                            ...pump,
                            curves: pump.curves.map(c => c.id === curve.id ? { ...c, a1: val } : c)
                          });
                        }}
                        className="w-full bg-white p-1.5 rounded-lg text-[10px] font-bold mt-0.5 border border-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">A0</label>
                      <input 
                        type="number" 
                        step="any"
                        value={curve.a0 ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          onUpdate({
                            ...pump,
                            curves: pump.curves.map(c => c.id === curve.id ? { ...c, a0: val } : c)
                          });
                        }}
                        className="w-full bg-white p-1.5 rounded-lg text-[10px] font-bold mt-0.5 border border-slate-100"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase">Max Flow</label>
                      <input 
                        type="number" 
                        value={curve.maxFlow ?? 0}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 0;
                          onUpdate({
                            ...pump,
                            curves: pump.curves.map(c => c.id === curve.id ? { ...c, maxFlow: val } : c)
                          });
                        }}
                        className="w-full bg-white p-1.5 rounded-lg text-[10px] font-bold mt-0.5 border border-slate-100"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {!pump.isDefault && (
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button 
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-xl flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest"
            >
              <Trash2 size={14} />
              Pumpe löschen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const HoseDetails = ({ 
  hose, 
  onUpdate, 
  onDelete 
}: { 
  hose: HoseSize, 
  onUpdate: (updatedHose: HoseSize) => void,
  onDelete: () => void
}) => {
  const [localName, setLocalName] = useState(hose.name);

  useEffect(() => {
    setLocalName(hose.name);
  }, [hose.id, hose.name]);

  const handleNameBlur = () => {
    if (localName === hose.name) return;
    onUpdate({ ...hose, name: localName });
  };

  return (
    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-cyan-500 rounded-full" />
          <h5 className="text-sm font-bold text-slate-800">Spezifikationen: {hose.name}</h5>
        </div>
        <div className="flex items-center gap-4">
          {!hose.isDefault && (
            <button 
              onClick={onDelete}
              className="text-red-500 hover:text-red-700"
              title="Schlauch löschen"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-[10px] font-bold text-slate-400 uppercase">Bezeichnung</label>
          <input 
            type="text" 
            value={localName}
            readOnly={hose.isDefault}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
            className={cn(
              "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none",
              hose.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
            )}
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Durchmesser (mm)</label>
            <input 
              type="number" 
              value={hose.diameter === 0 ? '' : (hose.diameter ?? '')}
              readOnly={hose.isDefault}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate({ ...hose, diameter: val === '' ? 0 : parseInt(val) || 0 });
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none",
                hose.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Rauheitsbeiwert (C)</label>
            <input 
              type="number" 
              value={hose.roughness === 0 ? '' : (hose.roughness ?? '')}
              readOnly={hose.isDefault}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate({ ...hose, roughness: val === '' ? 0 : parseInt(val) || 0 });
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none",
                hose.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase">Max. Druck (bar)</label>
            <input 
              type="number" 
              step="0.1"
              value={hose.maxPressure === 0 ? '' : (hose.maxPressure ?? '')}
              readOnly={hose.isDefault}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate({ ...hose, maxPressure: val === '' ? 0 : parseFloat(val) || 0 });
              }}
              className={cn(
                "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none",
                hose.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const MapEvents = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  const map = useMap();
  const popupOpenRef = useRef(false);

  useEffect(() => {
    const onPopupOpen = () => {
      popupOpenRef.current = true;
    };
    const onPopupClose = () => {
      // Use a small timeout to ensure the click event has finished processing
      // if the popup was closed by a map click.
      setTimeout(() => {
        popupOpenRef.current = false;
      }, 100);
    };

    map.on('popupopen', onPopupOpen);
    map.on('popupclose', onPopupClose);

    return () => {
      map.off('popupopen', onPopupOpen);
      map.off('popupclose', onPopupClose);
    };
  }, [map]);
  
  useMapEvents({
    click(e) {
      if (popupOpenRef.current) {
        // If a popup was open, we assume this click was intended to close it
        // or happened while it was open. We don't add a waypoint.
        return;
      }
      
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const CurrentLocationMarker = ({ isTracking }: { isTracking: boolean }) => {
  const [position, setPosition] = useState<[number, number] | null>(null);
  
  useEffect(() => {
    // Always watch position if possible, but only show if tracking OR if we have a signal
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.error(err);
        if (!isTracking) setPosition(null);
      },
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [isTracking]);

  if (!position) return null;

  return (
    <Marker 
      position={position} 
      zIndexOffset={1000}
      icon={L.divIcon({
        className: 'gps-location-marker',
        html: `<div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg shadow-blue-500/50 relative">
                <div class="absolute inset-0 bg-blue-400 rounded-full opacity-40"></div>
              </div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      })}
    />
  );
};



























// Error Boundary Component
class ErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    (this as any).state = { hasError: false };
  }

  static getDerivedStateFromError(_: any) {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if ((this as any).state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto">
              <AlertTriangle size={40} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Hoppla!</h1>
              <p className="text-slate-500 mt-2">Da ist etwas schiefgelaufen. Bitte lade die Seite neu.</p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-blue-700 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-800"
            >
              Seite neu laden
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>(() => {
    const saved = localStorage.getItem('pumpen_rechner_waypoints');
    return saved ? JSON.parse(saved) : [];
  });

  // Persist waypoints
  useEffect(() => {
    localStorage.setItem('pumpen_rechner_waypoints', JSON.stringify(waypoints));
  }, [waypoints]);
  const [routePoints, setRoutePoints] = useState<[number, number][]>([]);
  const [elevationData, setElevationData] = useState<ElevationData[]>([]);
  const [summary, setSummary] = useState<RouteSummary | null>(null);
  const [waypointResults, setWaypointResults] = useState<WaypointResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isElevationStale, setIsElevationStale] = useState(false);
  const [isElevationMocked, setIsElevationMocked] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [currentView, setCurrentView] = useState<'planner' | 'analysis' | 'strecken' | 'settings'>('planner');
  const [settingsTab, setSettingsTab] = useState<'general' | 'pumps' | 'hoses'>('general');
  const [rawElevationData, setRawElevationData] = useState<{distance: number, elevation: number, lat: number, lng: number}[]>([]);
  const [elevationCache, setElevationCache] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('pumpen_rechner_elevation_cache');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Persist elevation cache
  useEffect(() => {
    localStorage.setItem('pumpen_rechner_elevation_cache', JSON.stringify(elevationCache));
  }, [elevationCache]);
  const [editingPumpId, setEditingPumpId] = useState<string | null>(null);
  const [editingHoseId, setEditingHoseId] = useState<string | null>(null);
  const [selectedHoseId, setSelectedHoseId] = useState<string | null>(DEFAULT_HOSES[0].id);
  const [selectedModelByManufacturer, setSelectedModelByManufacturer] = useState<{ [key: string]: string }>({});
  const [expandedManufacturer, setExpandedManufacturer] = useState<string | null>(null);
  const [pumpToDeleteId, setPumpToDeleteId] = useState<string | null>(null);
  const [hoseToDeleteId, setHoseToDeleteId] = useState<string | null>(null);
  const [isDeletingAllWaypoints, setIsDeletingAllWaypoints] = useState(false);
  const [routeToDeleteId, setRouteToDeleteId] = useState<string | null>(null);
  const [currentRouteId, setCurrentRouteId] = useState<string | null>(null);
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [isDeletingAllRoutes, setIsDeletingAllRoutes] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [activeManualTab, setActiveManualTab] = useState(0);
  const [showIntro, setShowIntro] = useState(false);
  const [showExportSelector, setShowExportSelector] = useState<'routes' | 'pumps' | null>(null);
  const [selectedExportIds, setSelectedExportIds] = useState<string[]>([]);
  const [importType, setImportType] = useState<'routes' | 'pumps' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for first time visit
  useEffect(() => {
    const hasVisited = localStorage.getItem('pump_planner_visited');
    if (!hasVisited) {
      setShowIntro(true);
      localStorage.setItem('pump_planner_visited', 'true');
    }
  }, []);
  const [isTracking, setIsTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const isLoadingRoute = useRef(false);
  const printRef = useRef<HTMLDivElement>(null);
  const analysisRef = useRef<HTMLDivElement>(null);
  const [exportRoute, setExportRoute] = useState<SavedRoute | null>(null);

  // Settings state
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('pumpen_rechner_settings');
    let parsedSettings: any = null;
    if (saved) {
      try {
        parsedSettings = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing saved settings', e);
      }
    }

    const defaultSettings = {
      mapStyle: 'topo',
      showCoordinates: true,
      darkMode: false,
      flowRate: 4000, // l/min
      startPressure: 0, // bar
      defaultHoseId: 'hose-f-150',
      defaultHoseCount: 1,
      defaultPumpId: 'hannibal-nrs150-315',
      pumps: DEFAULT_PUMPS,
      hoses: DEFAULT_HOSES,
      autoBufferBasin: true,
      isOfflineMode: false,
      elevationSource: 'hoehendaten',
      useMaxFlowModel: false
    };

    if (!parsedSettings) return defaultSettings;

    // Merge logic for pumps:
    // 1. Use data from DEFAULT_PUMPS for all default pumps, but preserve the user's enabled status
    // 2. Keep any user-added pumps (those not in DEFAULT_PUMPS)
    const mergedPumps = [
      ...DEFAULT_PUMPS.map(dp => {
        const savedPump = parsedSettings.pumps?.find((sp: Pump) => sp.id === dp.id);
        return savedPump ? { ...dp, enabled: savedPump.enabled } : dp;
      }),
      ...(parsedSettings.pumps?.filter((sp: Pump) => !DEFAULT_PUMPS.some(dp => dp.id === sp.id)) || [])
    ];

    // Merge logic for hoses:
    // 1. Use data from DEFAULT_HOSES for all default hoses, but preserve the user's enabled status
    // 2. Keep any user-added hoses (those not in DEFAULT_HOSES)
    const mergedHoses = [
      ...DEFAULT_HOSES.map(dh => {
        const savedHose = parsedSettings.hoses?.find((sh: HoseSize) => sh.id === dh.id);
        return savedHose ? { ...dh, enabled: savedHose.enabled } : dh;
      }),
      ...(parsedSettings.hoses?.filter((sh: HoseSize) => !DEFAULT_HOSES.some(dh => dh.id === sh.id)) || [])
    ];

    return {
      ...defaultSettings,
      ...parsedSettings,
      pumps: mergedPumps,
      hoses: mergedHoses
    };
  });

  const [isOfflineMode, setIsOfflineMode] = useState(settings.isOfflineMode);

  // Automatic Online/Offline Detection
  useEffect(() => {
    const updateOnlineStatus = () => {
      const isCurrentlyOffline = !navigator.onLine;
      setIsOfflineMode(isCurrentlyOffline);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Initial check
    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const [plannerFlowRate, setPlannerFlowRate] = useState(() => {
    const saved = localStorage.getItem('pumpen_rechner_planner_flow');
    return saved ? parseInt(saved) : settings.flowRate;
  });
  const [startPressure, setStartPressure] = useState(() => {
    const saved = localStorage.getItem('pumpen_rechner_planner_pressure');
    return (saved !== null && saved !== undefined) ? parseFloat(saved) : settings.startPressure;
  });

  // Persist planner values
  useEffect(() => {
    localStorage.setItem('pumpen_rechner_planner_flow', plannerFlowRate.toString());
  }, [plannerFlowRate]);

  useEffect(() => {
    localStorage.setItem('pumpen_rechner_planner_pressure', startPressure.toString());
  }, [startPressure]);

  // Expose settings update for components
  useEffect(() => {
    (window as any).updateGlobalSettings = setSettings;
  }, []);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('pumpen_rechner_settings', JSON.stringify({ ...settings, isOfflineMode }));
  }, [settings, isOfflineMode]);

  const groupedPumps = useMemo(() => {
    const groups: { [key: string]: Pump[] } = {};
    settings.pumps.forEach(p => {
      if (!groups[p.manufacturer]) groups[p.manufacturer] = [];
      groups[p.manufacturer].push(p);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [settings.pumps]);

  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>(() => {
    try {
      const saved = localStorage.getItem('pumpen_rechner_routes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading saved routes:', e);
      return [];
    }
  });
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Persist routes
  useEffect(() => {
    localStorage.setItem('pumpen_rechner_routes', JSON.stringify(savedRoutes));
  }, [savedRoutes]);

  const saveRoute = useCallback((options?: { forceUpdate?: boolean, isNew?: boolean }) => {
    const forceUpdate = options?.forceUpdate ?? false;
    const isNew = options?.isNew ?? false;

    if (waypoints.length < 2) {
      alert('Bitte erstelle zuerst eine Route mit mindestens zwei Wegpunkten.');
      return;
    }
    
    if (!summary) {
      alert('Bitte führe zuerst eine Analyse durch (Klick auf "Analyse"), um die Strecke mit Auswertung zu speichern.');
      return;
    }

    if (currentRouteId && !forceUpdate && !isNew) {
      setShowUpdateConfirm(true);
      return;
    }
    
    let routeName: string | null = null;
    let existingRoute = (currentRouteId && !isNew) ? savedRoutes.find(r => r.id === currentRouteId) : null;

    if (forceUpdate && existingRoute) {
      routeName = existingRoute.name;
    } else {
      routeName = prompt('Name der Strecke:', existingRoute ? existingRoute.name : `Strecke ${savedRoutes.length + 1}`);
      if (routeName === null) return; // Cancelled
    }

    const newRouteId = (forceUpdate && currentRouteId && !isNew) ? currentRouteId : `route-${Date.now()}`;
    const newRoute: SavedRoute = {
      id: newRouteId,
      name: routeName || (existingRoute ? existingRoute.name : `Strecke ${savedRoutes.length + 1}`),
      date: new Date().toLocaleString('de-DE'),
      waypoints: [...waypoints],
      flowRate: plannerFlowRate,
      distance: elevationData.length > 0 ? elevationData[elevationData.length - 1].distance : 0,
      startPressure: startPressure,
      summary: { ...summary },
      waypointResults: [...waypointResults],
      elevationData: [...elevationData],
      rawElevationData: [...rawElevationData],
      useMaxFlowModel: settings.useMaxFlowModel
    };

    if (forceUpdate && currentRouteId && !isNew) {
      setSavedRoutes(prev => prev.map(r => r.id === currentRouteId ? newRoute : r));
    } else {
      setSavedRoutes(prev => [newRoute, ...prev]);
      setCurrentRouteId(newRoute.id);
    }
    
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  }, [waypoints, summary, plannerFlowRate, startPressure, savedRoutes, waypointResults, elevationData, rawElevationData, settings.useMaxFlowModel, currentRouteId]);

  const deleteRoute = useCallback((id: string) => {
    setSavedRoutes(prev => prev.filter(r => r.id !== id));
  }, []);

  const handleExportRoutes = useCallback(() => {
    if (savedRoutes.length === 0) {
      alert('Keine Strecken zum Exportieren vorhanden.');
      return;
    }
    setSelectedExportIds([]);
    setShowExportSelector('routes');
  }, []);

  const performExportRoutes = useCallback(() => {
    const routesToExport = savedRoutes.filter(r => selectedExportIds.includes(r.id));
    if (routesToExport.length === 0) {
      alert('Bitte wähle mindestens eine Strecke aus.');
      return;
    }
    const data = JSON.stringify(routesToExport, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pumpen_rechner_strecken_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportSelector(null);
  }, [savedRoutes, selectedExportIds]);

  const handleExportPumps = useCallback(() => {
    if (settings.pumps.length === 0) {
      alert('Keine Pumpen zum Exportieren vorhanden.');
      return;
    }
    setSelectedExportIds([]);
    setShowExportSelector('pumps');
  }, []);

  const performExportPumps = useCallback(() => {
    const pumpsToExport = settings.pumps.filter(p => selectedExportIds.includes(p.id));
    if (pumpsToExport.length === 0) {
      alert('Bitte wähle mindestens eine Pumpe aus.');
      return;
    }
    const data = JSON.stringify(pumpsToExport, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pumpen_rechner_bestand_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowExportSelector(null);
  }, [settings.pumps, selectedExportIds]);

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !importType) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const importedData = JSON.parse(content);

        if (importType === 'routes') {
          if (!Array.isArray(importedData)) throw new Error('Ungültiges Format für Strecken.');
          if (confirm(`${importedData.length} Strecken gefunden. Möchtest du diese zu deiner Bibliothek hinzufügen?`)) {
            // Check for duplicate IDs or just append with new IDs if needed
            // For simplicity, we just append and rely on user to manage
            setSavedRoutes(prev => [...importedData.map(r => ({ ...r, id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}` })), ...prev]);
            alert('Strecken erfolgreich importiert.');
          }
        } else if (importType === 'pumps') {
          if (!Array.isArray(importedData)) throw new Error('Ungültiges Format für Pumpen.');
          if (confirm(`${importedData.length} Pumpen gefunden. Möchtest du diese zu deinem Bestand hinzufügen?`)) {
            setSettings(s => {
              const newPumps = [...s.pumps];
              importedData.forEach((ip: Pump) => {
                // If ID exists, skip or replace? Usually better to generate new ID for custom pumps
                if (!newPumps.some(p => p.id === ip.id)) {
                  newPumps.push({ ...ip, id: `ip-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, isDefault: false });
                }
              });
              return { ...s, pumps: sortPumps(newPumps) };
            });
            alert('Pumpen-Bestand erfolgreich importiert.');
          }
        }
      } catch (err) {
        alert('Fehler beim Importieren: ' + (err instanceof Error ? err.message : 'Ungültige Datei'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
    setImportType(null);
  };

  const processGPX = (content: string) => {
    isLoadingRoute.current = true;
    const parser = new DOMParser();
    const gpx = parser.parseFromString(content, 'text/xml');
    let pts = gpx.querySelectorAll('trkpt');
    if (pts.length === 0) pts = gpx.querySelectorAll('rtept');
    if (pts.length === 0) pts = gpx.querySelectorAll('wpt');
    
    if (pts.length === 0) {
      alert('Keine Wegpunkte in der GPX-Datei gefunden.');
      isLoadingRoute.current = false;
      return;
    }

    const rawData: {distance: number, elevation: number, lat: number, lng: number}[] = [];
    let totalDist = 0;

    const newWaypoints: Waypoint[] = Array.from(pts).map((pt, index) => {
      const lat = parseFloat(pt.getAttribute('lat') || '0');
      const lng = parseFloat(pt.getAttribute('lon') || '0');
      const eleNode = pt.querySelector('ele');
      const ele = eleNode ? parseFloat(eleNode.textContent || '0') : 0;
      
      if (index > 0) {
        const prevPt = pts[index - 1];
        const prevLat = parseFloat(prevPt.getAttribute('lat') || '0');
        const prevLng = parseFloat(prevPt.getAttribute('lon') || '0');
        totalDist += L.latLng(prevLat, prevLng).distanceTo(L.latLng(lat, lng));
      }

      rawData.push({
        distance: totalDist,
        elevation: ele,
        lat,
        lng
      });

      return {
        id: `wp-${Date.now()}-${index}`,
        lat,
        lng,
        elevation: ele,
        pumpId: index === 0 ? settings.defaultPumpId : undefined,
        pumpCount: 1,
        hoseId: settings.defaultHoseId,
        hoseCount: settings.defaultHoseCount,
        hoseOverridden: false,
        isBufferBasin: false
      };
    });

    const MAX_WAYPOINTS = 100;
    if (newWaypoints.length > MAX_WAYPOINTS) {
      const step = Math.floor(newWaypoints.length / MAX_WAYPOINTS);
      const sampled: Waypoint[] = [];
      for (let i = 0; i < newWaypoints.length; i += step) {
        sampled.push(newWaypoints[i]);
      }
      if (sampled[sampled.length - 1].id !== newWaypoints[newWaypoints.length - 1].id) {
        sampled.push(newWaypoints[newWaypoints.length - 1]);
      }
      setWaypoints(sampled);
    } else {
      setWaypoints(newWaypoints);
    }

    setRawElevationData(rawData);
    setIsElevationStale(false);
    setCurrentView('planner');
    
    setTimeout(() => {
      isLoadingRoute.current = false;
    }, 500);
  };

  const handleGPXUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      processGPX(content);
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const toggleTracking = useCallback(() => {
    if (isTracking) {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
      setIsTracking(false);
    } else {
      if (!navigator.geolocation) {
        alert("GPS wird von diesem Browser nicht unterstützt.");
        return;
      }

      if (waypoints.length > 0 && !confirm("Möchten Sie eine neue GPS-Aufzeichnung starten? Die aktuelle Strecke wird beibehalten und neue Punkte werden angehängt.")) {
        // Just append
      }

      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, altitude } = position.coords;
          
          setWaypoints(prev => {
            const last = prev[prev.length - 1];
            if (last) {
              const dist = L.latLng(last.lat, last.lng).distanceTo(L.latLng(latitude, longitude));
              if (dist < 10) return prev;
            }

            // Fix: Handle null/zero altitude jumps from GPS
            // If altitude is null, undefined, or exactly 0 (while previous was significantly higher), 
            // use the last known elevation to avoid "sawtooth" jumps to sea level.
            let ele = (altitude !== null && altitude !== undefined) ? altitude : (last?.elevation || 0);
            
            // Additional check: if it's exactly 0 but the last point was > 5m, it's likely a sensor drop-out
            if (ele === 0 && last && last.elevation && last.elevation > 5) {
              ele = last.elevation;
            }

            const newWp: Waypoint = {
              id: `gps-${Date.now()}`,
              lat: latitude,
              lng: longitude,
              elevation: ele,
              pumpId: prev.length === 0 ? settings.defaultPumpId : undefined,
              pumpCount: 1,
              hoseId: settings.defaultHoseId,
              hoseCount: settings.defaultHoseCount,
              hoseOverridden: false,
              isBufferBasin: false
            };
            
            // Keep rawElevationData in sync
            setRawElevationData(prevRaw => {
              const lastRaw = prevRaw[prevRaw.length - 1];
              let totalDist = 0;
              if (lastRaw) {
                const d = L.latLng(lastRaw.lat, lastRaw.lng).distanceTo(L.latLng(latitude, longitude));
                totalDist = lastRaw.distance + d;
              }
              return [...prevRaw, { distance: totalDist, elevation: ele, lat: latitude, lng: longitude }];
            });

            return [...prev, newWp];
          });

          setIsElevationStale(false);
        },
        (error) => {
          console.error("GPS Error", error);
          // If offline, error might happen if no GPS signal, but usually it just waits
          if (error.code === error.PERMISSION_DENIED) {
            alert("GPS Zugriff verweigert.");
            setIsTracking(false);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
      setWatchId(id);
      setIsTracking(true);
    }
  }, [isTracking, watchId, waypoints, settings]);

  const centerOnGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      // Find the map instance and center it
      // This is tricky without a ref to the map, but MapController handles it for waypoints.
      // Let's just add a temporary waypoint or use a state.
      // Actually, MapController centers on waypoints. If we add a point, it centers.
      // Let's just use a one-time center.
      const map = (window as any).leafletMap;
      if (map) {
        map.setView([pos.coords.latitude, pos.coords.longitude], 16);
      }
    });
  };

  const downloadPDF = async (routeToExport: SavedRoute) => {
    if (isExporting) return;
    
    setIsExporting(true);
    setExportRoute(routeToExport);
    
    // Wait for the hidden container to render with the data
    setTimeout(async () => {
      try {
        if (printRef.current) {
          await exportToPDF({
            target: printRef.current,
            exportRoute: routeToExport,
            savedRoutes,
            waypoints: routeToExport.waypoints,
            settings
          });
        }
      } catch (error) {
        console.error('PDF Export failed:', error);
        alert('Export fehlgeschlagen. Bitte versuche es erneut.');
      } finally {
        setIsExporting(false);
        setExportRoute(null);
      }
    }, 1000);
  };

  const loadRoute = useCallback((route: SavedRoute, targetView: 'planner' | 'analysis' = 'planner') => {
    isLoadingRoute.current = true;
    setCurrentRouteId(route.id);
    setWaypoints(route.waypoints);
    setPlannerFlowRate(route.flowRate);
    setStartPressure(route.startPressure || 0);
    if (route.summary) setSummary(route.summary);
    if (route.waypointResults) setWaypointResults(route.waypointResults);
    if (route.elevationData) setElevationData(route.elevationData);
    if (route.rawElevationData) {
      setRawElevationData(route.rawElevationData);
      setIsElevationStale(false);
    }
    if (route.useMaxFlowModel !== undefined) {
      setSettings(s => ({ ...s, useMaxFlowModel: route.useMaxFlowModel }));
    }
    setCurrentView(targetView);
    // Reset the loading flag after a short delay to allow the useEffect to run
    setTimeout(() => {
      isLoadingRoute.current = false;
    }, 100);
  }, []);

  const handleShareRoute = useCallback((route: SavedRoute) => {
    try {
      // Create a compact version of the route for sharing
      const shareData = {
        name: route.name,
        waypoints: route.waypoints.map(w => ({
          lat: w.lat,
          lng: w.lng,
          ele: w.elevation,
          p: w.pumpId,
          pc: w.pumpCount,
          h: w.hoseId,
          hc: w.hoseCount,
          ho: w.hoseOverridden,
          bb: w.isBufferBasin
        })),
        flow: route.flowRate,
        pres: route.startPressure,
        maxF: route.useMaxFlowModel
      };

      const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(shareData));
      const url = new URL(window.location.href);
      url.searchParams.set('share', compressed);
      
      navigator.clipboard.writeText(url.toString());
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 3000);
    } catch (err) {
      console.error('Sharing failed', err);
      alert('Teilen fehlerhaft.');
    }
  }, []);

  // Handle shared route from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedCode = params.get('share');
    if (sharedCode) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedCode);
        if (decompressed) {
          const data = JSON.parse(decompressed);
          const sharedRoute: SavedRoute = {
            id: `shared-${Date.now()}`,
            name: data.name || 'Geteilte Strecke',
            date: new Date().toLocaleString('de-DE'),
            waypoints: (data.waypoints || []).map((w: any, idx: number) => ({
              id: `swp-${idx}-${Date.now()}`,
              lat: w.lat,
              lng: w.lng,
              elevation: w.ele,
              pumpId: w.p,
              pumpCount: w.pc,
              hoseId: w.h,
              hoseCount: w.hc,
              hoseOverridden: w.ho,
              isBufferBasin: w.bb
            })),
            flowRate: data.flow,
            startPressure: data.pres,
            useMaxFlowModel: data.maxF
          };

          if (confirm(`Eine geteilte Strecke "${sharedRoute.name}" wurde gefunden. Möchtest du diese laden?`)) {
            loadRoute(sharedRoute);
            // Clean up URL
            const url = new URL(window.location.href);
            url.searchParams.delete('share');
            window.history.replaceState({}, '', url.toString());
          }
        }
      } catch (err) {
        console.error('Decoding shared route failed', err);
      }
    }
  }, [loadRoute]);
  
  // Helper for unit conversion
  const formatDist = useCallback((m: number) => {
    return `${Math.round(m)} m`;
  }, []);

  const formatElev = useCallback((m: number) => {
    return `${Math.round(m)} m`;
  }, []);

  // Apply dark mode
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.darkMode]);

  // Add waypoint
  const addWaypoint = useCallback((lat: number, lng: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setWaypoints(prev => {
      // Use global defaults for every new point as requested by user
      const hoseId = settings.defaultHoseId || settings.hoses[0].id;
      const hoseCount = settings.defaultHoseCount || 1;
      const pumpId = prev.length === 0 ? (settings.defaultPumpId || settings.pumps[0].id) : undefined;
      return [...prev, { id, lat, lng, hoseId, hoseCount, hoseOverridden: false, pumpId }];
    });
  }, [settings.hoses, settings.pumps, settings.defaultHoseId, settings.defaultHoseCount, settings.defaultPumpId]);

  // Update waypoint
  const updateWaypoint = (id: string, updates: Partial<Waypoint>) => {
    setWaypoints(prev => {
      const index = prev.findIndex(w => w.id === id);
      if (index === -1) return prev;

      const newWaypoints = [...prev];
      const isHoseUpdate = 'hoseId' in updates || 'hoseCount' in updates;
      
      // Update the target waypoint
      newWaypoints[index] = { 
        ...newWaypoints[index], 
        ...updates,
        ...(isHoseUpdate && updates.hoseOverridden === undefined ? { hoseOverridden: true } : {})
      };

      // If hose was updated, propagate to subsequent non-overridden waypoints
      if (isHoseUpdate) {
        const updatedHoseId = newWaypoints[index].hoseId;
        const updatedHoseCount = newWaypoints[index].hoseCount;
        
        for (let i = index + 1; i < newWaypoints.length; i++) {
          if (newWaypoints[i].hoseOverridden) break; // Stop at the first manual override
          newWaypoints[i] = {
            ...newWaypoints[i],
            hoseId: updatedHoseId,
            hoseCount: updatedHoseCount
          };
        }
      }

      return newWaypoints;
    });
  };

  // Insert waypoint at specific location between index and index+1
  const insertWaypointAt = (index: number, lat: number, lng: number) => {
    const id = Math.random().toString(36).substr(2, 9);
    setWaypoints(prev => {
      // Use global defaults for inserted points as well
      const hoseId = settings.defaultHoseId || settings.hoses[0].id;
      const hoseCount = settings.defaultHoseCount || 1;
      const next = [...prev];
      next.splice(index + 1, 0, { id, lat, lng, hoseId, hoseCount, hoseOverridden: false });
      return next;
    });
  };

  // Remove waypoint
  const removeWaypoint = (id: string) => {
    setWaypoints(prev => prev.filter(w => w.id !== id));
  };

  // Reverse route direction
  const reverseRoute = () => {
    if (waypoints.length < 2) return;
    setWaypoints(prev => {
      const reversed = [...prev].reverse();
      // Swap pump at start/end if needed? 
      // Usually the first point has the pump.
      // Let's just reverse the array and the user can adjust pumps.
      // Or: if only the first point has a pump, move it to the new first point.
      const hasPumpAtStart = !!prev[0].pumpId;
      const hasPumpAtEnd = !!prev[prev.length - 1].pumpId;
      
      if (hasPumpAtStart && !hasPumpAtEnd) {
        const pumpId = reversed[reversed.length - 1].pumpId;
        const pumpCount = reversed[reversed.length - 1].pumpCount;
        reversed[reversed.length - 1].pumpId = undefined;
        reversed[0].pumpId = pumpId;
        reversed[0].pumpCount = pumpCount;
      }
      
      return reversed;
    });
    setIsElevationStale(true);
  };

  // Clear all waypoints
  const clearWaypoints = () => {
    setWaypoints([]);
    setPlannerFlowRate(settings.flowRate);
    setStartPressure(settings.startPressure);
    setSummary(null);
    setWaypointResults([]);
    setElevationData([]);
    setRawElevationData([]);
    setIsElevationStale(false);
    setCurrentRouteId(null);
  };

  // Mark elevation data as stale only when waypoint coordinates change
  useEffect(() => {
    if (isLoadingRoute.current || isTracking) return;
    if (waypoints.length >= 2) {
      setIsElevationStale(true);
    } else {
      setIsElevationStale(false);
    }
  }, [
    waypoints.map(w => `${w.lat},${w.lng}`).join('|'),
    isTracking,
    settings.elevationSource,
    isOfflineMode
  ]);

  // Calculate route and elevation (Luftlinie)
  // 1. Fetch Elevation Data (only when in analysis view and elevation data is stale)
  useEffect(() => {
    if (waypoints.length < 2 || !isElevationStale) {
      if (waypoints.length < 2) {
        setRoutePoints([]);
        setRawElevationData([]);
      }
      return;
    }

    const controller = new AbortController();

    const fetchElevation = async () => {
      setIsLoading(true);
      setSummary(null);
      try {
        const points: [number, number][] = waypoints.map(w => [w.lat, w.lng]);
        setRoutePoints(points);

        if (settings.elevationSource === 'hoehendaten') {
          const allProfilePoints: any[] = [];
          const newCacheEntries: Record<string, number> = {};
          
          // Prepare all segment requests
          const segmentRequests = [];
          for (let i = 0; i < waypoints.length - 1; i++) {
            const start = waypoints[i];
            const end = waypoints[i + 1];
            
            // Skip if points are identical to avoid API errors
            if (start.lat === end.lat && start.lng === end.lng) continue;

            const maxPoints = 50;
            segmentRequests.push({
              index: i,
              start,
              end,
              maxPoints
            });
          }

          // Fetch all segments in parallel
          const segmentResults = await Promise.all(
            segmentRequests.map(async (req) => {
              const res = await fetch('/api/proxy/hoehendaten', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  endpoint: '/v1/elevationprofile',
                  body: {
                    Type: "ElevationProfileRequest",
                    ID: `PumpenPlaner_Segment_${req.index}_${Date.now()}`,
                    Attributes: {
                      PointA: { 
                        Longitude: Number(req.start.lng.toFixed(6)), 
                        Latitude: Number(req.start.lat.toFixed(6)) 
                      },
                      PointB: { 
                        Longitude: Number(req.end.lng.toFixed(6)), 
                        Latitude: Number(req.end.lat.toFixed(6)) 
                      },
                      MaxTotalProfilePoints: req.maxPoints,
                      MinStepSize: 5.0
                    }
                  }
                }),
                signal: controller.signal
              });

              if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Hoehendaten API failed for segment ${req.index}: ${res.status}`);
              }
              
              return { index: req.index, data: await res.json() };
            })
          );

          // Process results in order to maintain cumulative distance
          let cumulativeDistance = 0;
          segmentResults.sort((a, b) => a.index - b.index).forEach((result, i) => {
            const data = result.data;
            if (data.IsError) {
              console.error(`Hoehendaten API Business Error for segment ${result.index}:`, data.Error);
              return; // Skip this segment but continue with others
            }
            
            if (data.Attributes && data.Attributes.Profile) {
              const segmentProfile = data.Attributes.Profile;
              segmentProfile.forEach((p: any, pIdx: number) => {
                // Skip the first point of subsequent segments to avoid duplicates
                if (i > 0 && pIdx === 0) return;
                
                allProfilePoints.push({
                  distance: cumulativeDistance + p.Distance,
                  elevation: p.Elevation,
                  lat: p.Latitude,
                  lng: p.Longitude
                });
                newCacheEntries[`${p.Latitude.toFixed(6)},${p.Longitude.toFixed(6)}`] = p.Elevation;
              });
              cumulativeDistance += segmentProfile[segmentProfile.length - 1].Distance;
            }
          });
          
          setRawElevationData(allProfilePoints);
          setElevationCache(prev => ({ ...prev, ...newCacheEntries }));
          setIsElevationStale(false);
          setIsLoading(false);
          return;
        }

        // Calculate cumulative distances for waypoints (fallback for other sources)
        const waypointDistances: number[] = [0];
        let totalRouteDist = 0;
        for (let i = 0; i < waypoints.length - 1; i++) {
          const d = L.latLng(waypoints[i].lat, waypoints[i].lng).distanceTo(L.latLng(waypoints[i+1].lat, waypoints[i+1].lng));
          totalRouteDist += d;
          waypointDistances.push(totalRouteDist);
        }

        // Generate sampling points (fixed 5m resolution for fallback)
        const resolution = 5;
        const targetDistancesSet = new Set<number>();
        waypointDistances.forEach(d => targetDistancesSet.add(Math.round(d * 100) / 100));
        for (let i = 0; i <= totalRouteDist; i += resolution) {
          targetDistancesSet.add(Math.round(i * 100) / 100);
        }
        targetDistancesSet.add(Math.round(totalRouteDist * 100) / 100);

        const sortedDistances = Array.from(targetDistancesSet).sort((a, b) => a - b);
        const finalSampled: [number, number][] = [];

        for (const targetDist of sortedDistances) {
          let segmentIndex = 0;
          while (segmentIndex < waypoints.length - 2 && targetDist > waypointDistances[segmentIndex + 1] + 0.001) {
            segmentIndex++;
          }
          const start = waypoints[segmentIndex];
          const end = waypoints[segmentIndex + 1];
          const segmentStartDist = waypointDistances[segmentIndex];
          const segmentEndDist = waypointDistances[segmentIndex + 1];
          const segmentLen = segmentEndDist - segmentStartDist;
          const ratio = segmentLen > 0 ? (targetDist - segmentStartDist) / segmentLen : 0;
          const lat = start.lat + (end.lat - start.lat) * Math.min(1, Math.max(0, ratio));
          const lng = start.lng + (end.lng - start.lng) * Math.min(1, Math.max(0, ratio));
          finalSampled.push([lat, lng]);
        }

        const allResults = new Array(finalSampled.length);
        const toFetchIndices: number[] = [];
        const newCacheEntries: Record<string, number> = {};

        finalSampled.forEach((p, i) => {
          const key = `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
          if (elevationCache[key] !== undefined) {
            allResults[i] = { latitude: p[0], longitude: p[1], elevation: elevationCache[key] };
          } else {
            toFetchIndices.push(i);
          }
        });

        if (toFetchIndices.length === 0) {
          const rawData = allResults.map((res: any, i: number) => ({
            distance: sortedDistances[i],
            elevation: res.elevation,
            lat: res.latitude,
            lng: res.longitude
          }));
          setRawElevationData(rawData);
          setIsElevationStale(false);
          setIsLoading(false);
          return;
        }

        const pointsToFetch = toFetchIndices.map(idx => finalSampled[idx]);

        if (isOfflineMode || settings.elevationSource === 'gpx_only') {
          const rawData = sortedDistances.map((d, i) => {
            const existing = rawElevationData.find(red => Math.abs(red.distance - d) < 1);
            return {
              distance: d,
              elevation: existing ? existing.elevation : 0,
              lat: finalSampled[i][0],
              lng: finalSampled[i][1]
            };
          });
          setRawElevationData(rawData);
          setIsElevationMocked(true);
          setIsElevationStale(false);
          setIsLoading(false);
          return;
        }

        const elevationPayloads = [];
        const chunkSize = 100;
        for (let i = 0; i < pointsToFetch.length; i += chunkSize) {
          elevationPayloads.push({
            locations: pointsToFetch.slice(i, i + chunkSize).map(p => ({ latitude: p[0], longitude: p[1] }))
          });
        }

        try {
          if (settings.elevationSource === 'auto' || settings.elevationSource === 'open-meteo') {
            const chunkSize = 100;
            const chunks = [];
            for (let i = 0; i < pointsToFetch.length; i += chunkSize) {
              chunks.push({
                points: pointsToFetch.slice(i, i + chunkSize),
                indices: toFetchIndices.slice(i, i + chunkSize)
              });
            }

            await Promise.all(chunks.map(async (chunk) => {
              const lats = chunk.points.map(p => p[0]).join(',');
              const lngs = chunk.points.map(p => p[1]).join(',');
              const res = await fetch(`https://elevation-api.open-meteo.com/v1/elevation?latitude=${lats}&longitude=${lngs}`, {
                signal: controller.signal
              });
              if (!res.ok) throw new Error('Open-Meteo API failed');
              const data = await res.json();
              if (data.elevation) {
                data.elevation.forEach((elev: number, idx: number) => {
                  const globalIdx = chunk.indices[idx];
                  const p = chunk.points[idx];
                  allResults[globalIdx] = {
                    latitude: p[0],
                    longitude: p[1],
                    elevation: elev
                  };
                  newCacheEntries[`${p[0].toFixed(6)},${p[1].toFixed(6)}`] = elev;
                });
              }
            }));
          } else {
            // Open-Elevation
            const apiUrl = 'https://api.open-elevation.com/api/v1/lookup';
            await Promise.all(elevationPayloads.map(async (payload, payloadIdx) => {
              const elevRes = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
              });
              if (!elevRes.ok) throw new Error('Elevation API failed');
              const data = await elevRes.json();
              if (data.results) {
                data.results.forEach((res: any, idx: number) => {
                  const globalIdx = toFetchIndices[payloadIdx * chunkSize + idx];
                  const p = pointsToFetch[payloadIdx * chunkSize + idx];
                  if (globalIdx !== undefined && p !== undefined) {
                    allResults[globalIdx] = {
                      latitude: p[0],
                      longitude: p[1],
                      elevation: res.elevation
                    };
                    newCacheEntries[`${p[0].toFixed(6)},${p[1].toFixed(6)}`] = res.elevation;
                  }
                });
              }
            }));
          }
          setIsElevationMocked(false);
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') return;
          
          // Fallback logic
          try {
            const fallbackUrl = 'https://api.open-elevation.com/api/v1/lookup';
            let currentFetchIdx = 0;
            for (const payload of elevationPayloads) {
              const elevRes = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
              });
              if (!elevRes.ok) throw new Error('Fallback Elevation API failed');
              const data = await elevRes.json();
              if (data.results) {
                data.results.forEach((res: any, idx: number) => {
                  const globalIdx = toFetchIndices[currentFetchIdx + idx];
                  const p = pointsToFetch[currentFetchIdx + idx];
                  allResults[globalIdx] = {
                    latitude: p[0],
                    longitude: p[1],
                    elevation: res.elevation
                  };
                  newCacheEntries[`${p[0].toFixed(6)},${p[1].toFixed(6)}`] = res.elevation;
                });
                currentFetchIdx += data.results.length;
              }
            }
            setIsElevationMocked(false);
          } catch (fallbackErr) {
            if (fallbackErr instanceof Error && fallbackErr.name === 'AbortError') return;
            
            console.warn('All elevation APIs failed, using flat terrain fallback');
            toFetchIndices.forEach(globalIdx => {
              const p = finalSampled[globalIdx];
              allResults[globalIdx] = {
                latitude: p[0],
                longitude: p[1],
                elevation: 0
              };
              // Don't cache 0 as it might be a temporary failure
            });
            setIsElevationMocked(true);
          }
        }

        // Update cache with new entries
        if (Object.keys(newCacheEntries).length > 0) {
          setElevationCache(prev => ({ ...prev, ...newCacheEntries }));
        }

        if (allResults.length > 0) {
          const rawData = allResults.map((res: any, i: number) => {
            return {
              distance: sortedDistances[i],
              elevation: res.elevation,
              lat: res.latitude,
              lng: res.longitude
            };
          });
          setRawElevationData(rawData);
          setIsElevationStale(false);
        }
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          console.error('Elevation fetch failed', e);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      fetchElevation();
    }, 500);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [isElevationStale, isOfflineMode, settings.elevationSource]);

  // 2. Calculate Pressure and Summary (runs locally, very fast)
  useEffect(() => {
    if (rawElevationData.length < 2 || waypoints.length < 2 || isElevationStale) {
      setElevationData([]);
      setSummary(null);
      return;
    }

    const calculatePumpGain = (pump: Pump, count: number, flowRate: number, curveId?: string) => {
      const effectiveCount = Math.max(1, count || 1);
      const q_lmin = flowRate / effectiveCount;
      const activeCurve = (curveId ? pump.curves?.find(c => c.id === curveId) : null) || 
                          pump.curves?.find(c => c.active) || 
                          pump.curves?.[0];
      if (!activeCurve) return { gain: 0, isOverloaded: false, curve: null };
      const isOverloaded = q_lmin > activeCurve.maxFlow || q_lmin < 0;
      const p = activeCurve.a2 * Math.pow(q_lmin, 2) + activeCurve.a1 * q_lmin + activeCurve.a0;
      return { gain: Math.max(0, p), isOverloaded, curve: activeCurve };
    };

    const waypointDistances: number[] = [0];
    let acc = 0;
    for (let j = 0; j < waypoints.length - 1; j++) {
      acc += L.latLng(waypoints[j].lat, waypoints[j].lng).distanceTo(L.latLng(waypoints[j+1].lat, waypoints[j+1].lng));
      waypointDistances.push(acc);
    }

    const computeFinalPressure = (flow: number) => {
      let currentP = startPressure || 0;
      let lastWPIdx = 0;
      let hasBufferBasin = false;
      let minCriticalPressure = Infinity;
      
      const startPump = settings.pumps.find(p => p.id === waypoints[0]?.pumpId);
      if (startPump) {
        const res = calculatePumpGain(startPump, waypoints[0]?.pumpCount || 1, flow, waypoints[0]?.curveId);
        currentP += res.gain;
      }

      for (let i = 1; i < rawElevationData.length; i++) {
        const res = rawElevationData[i];
        const prev = rawElevationData[i - 1];
        const d = res.distance - prev.distance;
        const diff = res.elevation - prev.elevation;

        let segmentIndex = 0;
        for (let j = 0; j < waypointDistances.length - 1; j++) {
          if (res.distance <= waypointDistances[j + 1] + 0.1) {
            segmentIndex = j;
            break;
          }
        }

        const hose = settings.hoses.find(h => h.id === waypoints[segmentIndex]?.hoseId) || settings.hoses[0];
        const hoseCount = waypoints[segmentIndex]?.hoseCount || 1;
        
        const Q_m3s = (flow / Math.max(1, hoseCount)) / 60000;
        const d_m = Math.max(0.001, hose.diameter / 1000);
        const h_f = 10.67 * d * Math.pow(Q_m3s, 1.852) / (Math.pow(Math.max(1, hose.roughness), 1.852) * Math.pow(d_m, 4.87));
        const frictionLoss = isFinite(h_f) ? h_f / 10.2 : 0;
        const staticLoss = isFinite(diff) ? diff / 10.2 : 0;

        currentP -= (frictionLoss + staticLoss);

        for (let j = lastWPIdx + 1; j < waypoints.length; j++) {
          if (res.distance >= waypointDistances[j] - 0.5) {
            lastWPIdx = j;
            if (waypoints[j].isBufferBasin) {
              minCriticalPressure = Math.min(minCriticalPressure, currentP);
              currentP = 0;
              hasBufferBasin = true;
            }
            if (waypoints[j].pumpId) {
              const pump = settings.pumps.find(p => p.id === waypoints[j].pumpId);
              if (pump) {
                const pumpResult = calculatePumpGain(pump, waypoints[j].pumpCount || 1, flow, waypoints[j].curveId);
                currentP += pumpResult.gain;
              }
            }
          }
        }
      }
      
      // Final delivery point is also a critical point
      minCriticalPressure = Math.min(minCriticalPressure, currentP);
      
      return { endPressure: currentP, hasBufferBasin, minCriticalPressure };
    };

    // Find max flow (where end pressure or buffer basin inlet is at least 0.05 bar)
    let maxFlow = 0;
    if (waypoints.length >= 2) {
      let low = 0;
      let high = 10000; 
      for (let iter = 0; iter < 20; iter++) {
        let mid = (low + high) / 2;
        if (computeFinalPressure(mid).minCriticalPressure > 0.05) low = mid;
        else high = mid;
      }
      maxFlow = Math.round(low);
    }

    const runCalculation = (flow: number) => {
      let totalDist = 0;
      let totalAscent = 0;
      let totalDescent = 0;
      let minElev = Infinity;
      let maxElev = -Infinity;
      let currentPressure = 0;
      let totalLoss = 0;
      let maxStaticPressureVal = 0;

      const calcResults: WaypointResult[] = waypoints.map(() => ({ 
        inletPressure: 0, 
        outletPressure: 0,
        segmentFrictionLoss: 0,
        segmentStaticLoss: 0,
        isOverloaded: false,
        isGrainSizeWarning: false,
        isNegativePressure: false,
        isHighPressure: false,
        isHighStaticPressure: false,
        staticPressure: 0
      }));

      let lastPassedWaypointIndex = 0;
      let hasBufferBasinSinceStart = false;
      const startPump = settings.pumps.find(p => p.id === waypoints[0]?.pumpId);
      const startPumpGrainSize = startPump?.grainSize || 0;
      const firstPumpResult = startPump ? calculatePumpGain(startPump, waypoints[0]?.pumpCount || 1, flow, waypoints[0]?.curveId) : { gain: 0, isOverloaded: false, curve: null };
      const startPumpActiveCurve = firstPumpResult.curve || (startPump ? (startPump.curves?.find(c => c.active) || startPump.curves?.[0]) : null);
      const firstPumpGain = firstPumpResult.gain;

      // Warnings use the current calculation flow
      const firstPumpWarningResult = startPump ? calculatePumpGain(startPump, waypoints[0]?.pumpCount || 1, flow, waypoints[0]?.curveId) : { gain: 0, isOverloaded: false, curve: null };
      calcResults[0].isOverloaded = firstPumpWarningResult.isOverloaded;

      currentPressure = (startPressure || 0) + firstPumpGain;
      let currentPressureZeroFlow = (startPressure || 0) + (startPumpActiveCurve?.a0 || 0);
      maxStaticPressureVal = currentPressureZeroFlow;

      if (startPump) {
        if (currentPressure > startPump.maxCasingPressure) calcResults[0].isHighPressure = true;
        if (currentPressureZeroFlow > startPump.maxCasingPressure) calcResults[0].isHighStaticPressure = true;
      }

      calcResults[0].inletPressure = Math.round((startPressure || 0) * 10) / 10;
      calcResults[0].outletPressure = Math.round(currentPressure * 10) / 10;
      calcResults[0].staticPressure = Math.round(currentPressureZeroFlow * 10) / 10;
      calcResults[0].pumpGain = Math.round(firstPumpGain * 10) / 10;
      // currentPressure remains unrounded for the loop to avoid steps in the chart

      const processedData: ElevationData[] = [];
      processedData.push({
        distance: 0,
        elevation: rawElevationData[0].elevation,
        pressure: currentPressure,
        pressureZeroFlow: currentPressureZeroFlow,
        maxPressureLimit: startPump?.maxCasingPressure || settings.hoses[0]?.maxPressure,
        lat: rawElevationData[0].lat,
        lng: rawElevationData[0].lng
      });

      const waypointHoses = waypoints.map(wp => settings.hoses.find(h => h.id === wp.hoseId) || settings.hoses[0]);
      const waypointPumps = waypoints.map(wp => settings.pumps.find(p => p.id === wp.pumpId));

      let segmentIndex = 0;
      for (let i = 1; i < rawElevationData.length; i++) {
        const res = rawElevationData[i];
        const prev = rawElevationData[i - 1];
        const d = res.distance - prev.distance;
        totalDist = res.distance;
        const diff = res.elevation - prev.elevation;
        if (diff > 0) totalAscent += diff;
        else totalDescent += Math.abs(diff);

        while (segmentIndex < waypointDistances.length - 2 && totalDist > waypointDistances[segmentIndex + 1] + 0.1) {
          segmentIndex++;
        }

        const hose = waypointHoses[segmentIndex];
        const hoseCount = waypoints[segmentIndex]?.hoseCount || 1;
        const Q_m3s = (flow / Math.max(1, hoseCount)) / 60000;
        const d_m = Math.max(0.001, hose.diameter / 1000);
        const h_f = 10.67 * d * Math.pow(Q_m3s, 1.852) / (Math.pow(Math.max(1, hose.roughness), 1.852) * Math.pow(d_m, 4.87));
        const frictionLoss = isFinite(h_f) ? h_f / 10.2 : 0;
        const staticLoss = isFinite(diff) ? diff / 10.2 : 0;
        
        calcResults[segmentIndex].segmentFrictionLoss += frictionLoss;
        calcResults[segmentIndex].segmentStaticLoss += staticLoss;

        const segmentLoss = frictionLoss + staticLoss;
        currentPressure -= segmentLoss;
        currentPressureZeroFlow -= staticLoss;
        maxStaticPressureVal = Math.max(maxStaticPressureVal, currentPressureZeroFlow);
        totalLoss += segmentLoss;

        // Negative pressure check
        if (currentPressure < 0) {
          calcResults[segmentIndex].isNegativePressure = true;
        }

        if (currentPressure > hose.maxPressure) calcResults[segmentIndex].isHighPressure = true;
        if (currentPressureZeroFlow > hose.maxPressure) calcResults[segmentIndex].isHighStaticPressure = true;

        const currentDist = totalDist;
        let jumpAdded = false;

        for (let j = lastPassedWaypointIndex + 1; j < waypoints.length; j++) {
          if (totalDist >= waypointDistances[j] - 0.5) {
            lastPassedWaypointIndex = j;
            const exactDist = waypointDistances[j];
            const inlet = currentPressure;
            const inletZeroFlow = currentPressureZeroFlow;
            calcResults[j].inletPressure = Math.round(inlet * 10) / 10;
            calcResults[j].staticPressure = Math.round(inletZeroFlow * 10) / 10;

            processedData.push({
              distance: exactDist,
              elevation: res.elevation,
              pressure: inlet,
              pressureZeroFlow: inletZeroFlow,
              maxPressureLimit: hose.maxPressure,
              lat: res.lat,
              lng: res.lng
            });

            if (waypoints[j].isBufferBasin) {
              hasBufferBasinSinceStart = true;
              currentPressure = 0;
              currentPressureZeroFlow = 0;
              processedData.push({
                distance: exactDist,
                elevation: res.elevation,
                pressure: 0,
                pressureZeroFlow: 0,
                maxPressureLimit: 0,
                lat: res.lat,
                lng: res.lng
              });
            }

            let currentMaxP = hose.maxPressure;
            if (waypoints[j].pumpId) {
              const pump = waypointPumps[j];
              if (pump) {
                currentMaxP = pump.maxCasingPressure;
                const pumpResult = calculatePumpGain(pump, waypoints[j].pumpCount || 1, flow, waypoints[j].curveId);
                const pumpGain = pumpResult.gain;
                calcResults[j].pumpGain = Math.round(pumpGain * 10) / 10;
                
                const pumpWarningResult = calculatePumpGain(pump, waypoints[j].pumpCount || 1, flow, waypoints[j].curveId);
                calcResults[j].isOverloaded = pumpWarningResult.isOverloaded;
                
                if (!hasBufferBasinSinceStart && startPumpGrainSize > 0 && pump.grainSize < startPumpGrainSize) {
                  calcResults[j].isGrainSizeWarning = true;
                }
    
                if (isFinite(pumpGain)) currentPressure += pumpGain;
                const activeCurve = pumpResult.curve || pump.curves?.find(c => c.active) || pump.curves?.[0];
                if (activeCurve) currentPressureZeroFlow += activeCurve.a0;
                maxStaticPressureVal = Math.max(maxStaticPressureVal, currentPressureZeroFlow);

                if (currentPressure > pump.maxCasingPressure) calcResults[j].isHighPressure = true;
                if (currentPressureZeroFlow > pump.maxCasingPressure) calcResults[j].isHighStaticPressure = true;
              }
            }
            
            const outlet = currentPressure;
            const outletZeroFlow = currentPressureZeroFlow;
            calcResults[j].outletPressure = Math.round(outlet * 10) / 10;
            calcResults[j].staticPressure = Math.round(outletZeroFlow * 10) / 10;

            processedData.push({
              distance: exactDist,
              elevation: res.elevation,
              pressure: outlet,
              pressureZeroFlow: outletZeroFlow,
              maxPressureLimit: currentMaxP,
              lat: res.lat,
              lng: res.lng
            });
            jumpAdded = true;
          }
        }

        if (!jumpAdded) {
          processedData.push({
            distance: currentDist,
            elevation: res.elevation,
            pressure: currentPressure,
            pressureZeroFlow: currentPressureZeroFlow,
            maxPressureLimit: hose.maxPressure,
            lat: res.lat,
            lng: res.lng
          });
        }

        minElev = Math.min(minElev, res.elevation);
        maxElev = Math.max(maxElev, res.elevation);
      }

      const finalEndPressure = Math.round(currentPressure * 10) / 10;
      if (calcResults.length > 0) {
        const lastIdx = calcResults.length - 1;
        if (lastPassedWaypointIndex < lastIdx) {
          for (let j = lastPassedWaypointIndex + 1; j < waypoints.length; j++) {
            calcResults[j].inletPressure = finalEndPressure;
            calcResults[j].outletPressure = finalEndPressure;
            calcResults[j].staticPressure = Math.round(currentPressureZeroFlow * 10) / 10;
          }
        }
        calcResults[lastIdx].inletPressure = finalEndPressure;
        calcResults[lastIdx].outletPressure = finalEndPressure;
        calcResults[lastIdx].staticPressure = Math.round(currentPressureZeroFlow * 10) / 10;
      }

      processedData.sort((a, b) => a.distance - b.distance);
      return {
        processedData,
        calcResults,
        summary: {
          totalDist,
          totalAscent,
          totalDescent,
          minElev,
          maxElev,
          totalLoss,
          finalEndPressure,
          maxStaticPressureVal,
          anyPumpOverloaded: calcResults.some(r => r.isOverloaded),
          anyGrainSizeWarning: calcResults.some(r => r.isGrainSizeWarning),
          anyNegativePressure: calcResults.some(r => r.isNegativePressure),
          anyHighPressure: calcResults.some(r => r.isHighPressure),
          anyHighStaticPressure: calcResults.some(r => r.isHighStaticPressure)
        }
      };
    };

    // 1. Preset Flow Model
    const presetFlow = plannerFlowRate;
    const presetResult = runCalculation(presetFlow);

    // 2. Max Flow Model
    const maxFlowResult = runCalculation(maxFlow);

    // Determine which model to display primarily
    const activeResult = settings.useMaxFlowModel ? maxFlowResult : presetResult;

    let totalPower = 0;
    let minGrainSize = Infinity;
    waypoints.forEach((wp) => {
      const pump = settings.pumps.find(p => p.id === wp.pumpId);
      if (pump) {
        const count = wp.pumpCount || 1;
        if (pump.driveType === 'Elektro') totalPower += (pump.power || 0) * count;
        if (pump.grainSize !== undefined) minGrainSize = Math.min(minGrainSize, pump.grainSize);
      }
    });
    if (minGrainSize === Infinity) minGrainSize = 0;

    setElevationData(activeResult.processedData);
    setWaypointResults(activeResult.calcResults);
    setSummary({
      totalDistance: activeResult.summary.totalDist,
      totalAscent: Math.round(activeResult.summary.totalAscent),
      totalDescent: Math.round(activeResult.summary.totalDescent),
      minElevation: Math.round(activeResult.summary.minElev),
      maxElevation: Math.round(activeResult.summary.maxElev),
      totalPressureLoss: Math.round(activeResult.summary.totalLoss * 10) / 10,
      endPressure: activeResult.summary.finalEndPressure,
      totalElevationDiff: Math.round(rawElevationData[rawElevationData.length - 1].elevation - rawElevationData[0].elevation),
      totalPower: Math.round(totalPower * 10) / 10,
      minGrainSize: minGrainSize,
      maxFlow: maxFlow,
      anyPumpOverloaded: activeResult.summary.anyPumpOverloaded,
      anyGrainSizeWarning: activeResult.summary.anyGrainSizeWarning,
      anyNegativePressure: activeResult.summary.anyNegativePressure,
      anyHighPressure: activeResult.summary.anyHighPressure,
      anyHighStaticPressure: activeResult.summary.anyHighStaticPressure,
      maxStaticPressure: Math.round(activeResult.summary.maxStaticPressureVal * 10) / 10,
      maxFlowSummary: {
        endPressure: maxFlowResult.summary.finalEndPressure,
        elevationData: maxFlowResult.processedData,
        waypointResults: maxFlowResult.calcResults,
        anyPumpOverloaded: maxFlowResult.summary.anyPumpOverloaded,
        anyNegativePressure: maxFlowResult.summary.anyNegativePressure,
        anyHighPressure: maxFlowResult.summary.anyHighPressure,
        anyHighStaticPressure: maxFlowResult.summary.anyHighStaticPressure
      }
    });
  }, [rawElevationData, waypoints, plannerFlowRate, startPressure, settings.pumps, settings.hoses, settings.useMaxFlowModel]);

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-slate-50 overflow-hidden">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 z-50 shadow-sm">
        {/* Row 1: Logo, Title and Actions */}
        <div className="px-3 md:px-6 py-2 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="bg-[#00549f] p-1.5 md:p-2 rounded-lg text-white">
              <PumpIcon size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base md:text-xl font-bold text-slate-900 leading-tight truncate">Pumpstreckenrechner</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider hidden md:block">Druckverlust & Pumpstrecken-Planung</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCurrentView('planner')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold",
                  currentView === 'planner' 
                    ? "bg-white text-blue-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <MapIcon size={16} />
                <span>Planer</span>
              </button>
              <button
                onClick={() => setCurrentView('analysis')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold",
                  currentView === 'analysis' 
                    ? "bg-white text-blue-700 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <BarChart3 size={16} />
                <span>Auswertung</span>
              </button>
              <button
                onClick={() => setCurrentView('strecken')}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold",
                  currentView === 'strecken' 
                    ? "bg-white text-indigo-600 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                <TrendingUp size={16} />
                <span>Strecken</span>
              </button>
            </nav>

            <div className="flex items-center gap-2">
              {isOfflineMode && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 border border-amber-100 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                  <Globe size={12} />
                  <span>Offline</span>
                </div>
              )}
              <button
                onClick={() => setCurrentView('settings')}
                className={cn(
                  "flex-shrink-0 p-1.5 md:p-2 rounded-xl border shadow-sm",
                  currentView === 'settings'
                    ? "bg-blue-700 text-white border-blue-700"
                    : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                )}
                title="Einstellungen"
              >
                <Settings size={18} className="md:w-5 md:h-5" strokeWidth={2.5} />
              </button>

              {waypoints.length > 0 && (
                <div className="flex items-center gap-2">
                  {waypoints.length >= 2 && summary && (
                    <button
                      onClick={saveRoute}
                      disabled={isLoading}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 md:py-2 rounded-xl border shadow-sm",
                        showSaveSuccess 
                          ? "bg-emerald-600 text-white border-emerald-600" 
                          : "bg-white text-emerald-600 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50",
                        isLoading && "opacity-50 cursor-not-allowed"
                      )}
                      title="Strecke speichern"
                    >
                      {showSaveSuccess ? <Check size={18} strokeWidth={2.5} /> : <Save size={18} strokeWidth={2.5} />}
                    </button>
                  )}
                  
                  <button
                    onClick={() => setIsDeletingAllWaypoints(true)}
                    className="flex-shrink-0 p-1.5 md:p-2 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 shadow-sm"
                    title="Alle Punkte entfernen"
                  >
                    <Trash2 size={18} className="md:w-5 md:h-5" strokeWidth={2.5} />
                  </button>
                </div>
              )}
            </div>

            {isLoading && (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                <Loader2 size={16} />
                <span className="text-[10px] font-bold uppercase tracking-wider hidden md:inline">Berechne...</span>
              </div>
            )}
            
            {summary && (
              <div className="hidden lg:flex items-center gap-6 border-l border-slate-200 pl-6">
                {/* Stats removed as requested */}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Mobile Navigation */}
        <div className="md:hidden px-3 pb-3">
          <nav className="flex items-center bg-slate-100 p-1 rounded-xl w-full">
            <button
              onClick={() => setCurrentView('planner')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold",
                currentView === 'planner' 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <MapIcon size={14} />
              <span>Planer</span>
            </button>
            <button
              onClick={() => setCurrentView('analysis')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold",
                currentView === 'analysis' 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <BarChart3 size={14} />
              <span>Auswertung</span>
            </button>
            <button
              onClick={() => setCurrentView('strecken')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold",
                currentView === 'strecken' 
                  ? "bg-white text-indigo-600 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <TrendingUp size={14} />
              <span>Strecken</span>
            </button>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 relative overflow-hidden">
        {currentView === 'planner' ? (
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 relative">
              <MapContainer 
                center={[51.1657, 10.4515]} 
                zoom={6} 
                maxZoom={19}
                className="h-full w-full z-0"
                zoomControl={false}
              >
                <TileLayer
                  url={
                    settings.mapStyle === 'topo' 
                      ? "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                      : settings.mapStyle === 'satellite'
                      ? "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  }
                  attribution={
                    settings.mapStyle === 'topo'
                      ? '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
                      : settings.mapStyle === 'satellite'
                      ? '&copy; <a href="https://www.esri.com/">Esri</a>'
                      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  }
                  maxZoom={19}
                  maxNativeZoom={
                    settings.mapStyle === 'topo' ? 17 : 
                    settings.mapStyle === 'satellite' ? 18 : 19
                  }
                />
                <MapEvents onMapClick={isOfflineMode ? () => {} : addWaypoint} />
                <MapController currentView={currentView} waypoints={waypoints} />
                <CurrentLocationMarker isTracking={isTracking} />
                
                {waypoints.map((wp, index) => (
                  <Marker 
                    key={wp.id} 
                    position={[wp.lat, wp.lng]}
                    draggable={!isOfflineMode}
                    icon={createWaypointIcon(index, !!wp.pumpId || index === 0, !!wp.hoseOverridden)}
                    eventHandlers={{
                      dragend: (e) => {
                        if (isOfflineMode) return;
                        const marker = e.target;
                        const position = marker.getLatLng();
                        updateWaypoint(wp.id, { lat: position.lat, lng: position.lng });
                      },
                      click: (e) => {
                        L.DomEvent.stopPropagation(e);
                      }
                    }}
                  >
                    <Popup minWidth={200}>
                      <WaypointPopup 
                        wp={wp}
                        index={index}
                        waypoints={waypoints}
                        settings={settings}
                        plannerFlowRate={plannerFlowRate}
                        setPlannerFlowRate={setPlannerFlowRate}
                        startPressure={startPressure}
                        setStartPressure={setStartPressure}
                        updateWaypoint={updateWaypoint}
                        removeWaypoint={removeWaypoint}
                        sortPumps={sortPumps}
                        waypointResults={waypointResults}
                      />
                    </Popup>
                  </Marker>
                ))}

                {/* Route segments (Luftlinie) - clickable to insert points */}
                {waypoints.length > 1 && waypoints.map((wp, index) => {
                  if (index === waypoints.length - 1) return null;
                  const nextWp = waypoints[index + 1];
                  return (
                    <Polyline 
                      key={`click-seg-${wp.id}-${nextWp.id}`}
                      positions={[[wp.lat, wp.lng], [nextWp.lat, nextWp.lng]]} 
                      color="transparent" 
                      weight={24} 
                      opacity={0}
                      eventHandlers={{
                        click: (e) => {
                          if (isOfflineMode) return;
                          L.DomEvent.stopPropagation(e);
                          insertWaypointAt(index, e.latlng.lat, e.latlng.lng);
                        }
                      }}
                      pathOptions={{
                        className: isOfflineMode ? 'cursor-default' : 'cursor-pointer'
                      }}
                    />
                  );
                })}

                <RoutePolylines elevationData={elevationData} waypoints={waypoints} isDataStale={isElevationStale} />
              </MapContainer>

              {/* Map Style Selector - Floating in Planner */}
              <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-2 items-end">
                {isTracking && (
                  <div className="bg-red-500 text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 text-[10px] font-bold mb-2">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    GPS AUFZEICHNUNG AKTIV
                  </div>
                )}
                <div className="bg-white/90 backdrop-blur-sm p-1.5 rounded-2xl shadow-xl border border-white/20 flex gap-1">
                  <button 
                    onClick={reverseRoute}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-white/50"
                    title="Förderrichtung umkehren"
                  >
                    <ArrowLeftRight size={14} />
                  </button>
                  <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                  <button 
                    onClick={centerOnGPS}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-white/50"
                    title="Aktuelle Position"
                  >
                    <MapPin size={14} />
                  </button>
                  <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                  <button 
                    onClick={toggleTracking}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold",
                      isTracking 
                        ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                        : "text-slate-600 hover:bg-white/50"
                    )}
                  >
                    <Navigation2 size={14} />
                    <span className="hidden sm:inline">{isTracking ? 'Stop GPS' : 'GPS Tracking'}</span>
                  </button>
                  <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                  <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold text-slate-600 hover:bg-white/50 cursor-pointer">
                    <FileUp size={14} />
                    <span className="hidden sm:inline">GPX Import</span>
                    <input 
                      type="file" 
                      accept=".gpx" 
                      className="hidden" 
                      onChange={handleGPXUpload} 
                    />
                  </label>
                  <div className="w-px h-4 bg-slate-200 self-center mx-1" />
                  {[
                    { id: 'standard', icon: <Globe size={14} />, label: 'Standard' },
                    { id: 'topo', icon: <TrendingUp size={14} />, label: 'Topo' },
                    { id: 'satellite', icon: <Layers size={14} />, label: 'Satellit' }
                  ].map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSettings(s => ({ ...s, mapStyle: style.id }))}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-bold",
                        settings.mapStyle === style.id 
                          ? "bg-indigo-600 text-white shadow-lg" 
                          : "text-slate-600 hover:bg-white/50"
                      )}
                    >
                      {style.icon}
                      <span className="hidden sm:inline">{style.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : currentView === 'analysis' ? (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10">
            <div className="max-w-5xl mx-auto mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Analyse</h2>
                <p className="text-slate-500 text-sm">Detaillierte Auswertung der aktuellen Planung.</p>
              </div>
            </div>
            {summary ? (
              <div ref={analysisRef}>
                <AnalysisReport 
                  route={{
                    id: currentRouteId || 'current',
                    name: currentRouteId ? (savedRoutes.find(r => r.id === currentRouteId)?.name || 'Routen-Auswertung') : 'Routen-Auswertung',
                    date: new Date().toLocaleDateString('de-DE'),
                    waypoints,
                    flowRate: plannerFlowRate,
                    startPressure,
                    summary,
                    waypointResults,
                    elevationData,
                    useMaxFlowModel: settings.useMaxFlowModel
                  }}
                  settings={settings}
                  formatDist={formatDist}
                  createWaypointIcon={createWaypointIcon}
                  isElevationStale={isElevationStale}
                />
              </div>
            ) : (
              <div className="max-w-3xl mx-auto bg-white p-12 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                  <BarChart3 size={32} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Keine Daten zur Analyse</h3>
                  <p className="text-slate-400 text-sm max-w-xs mx-auto">
                    Bitte erstelle zuerst eine Route im Planer, um eine detaillierte Analyse zu erhalten.
                  </p>
                </div>
                <button 
                  onClick={() => setCurrentView('planner')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                >
                  Zurück zum Planer
                </button>
              </div>
            )}
          </div>
        ) : currentView === 'strecken' ? (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10">
            <div className="max-w-5xl mx-auto space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Strecken</h2>
                  <p className="text-slate-500">Verwalte deine gespeicherten Strecken und Planungen.</p>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setImportType('routes');
                      setTimeout(() => fileInputRef.current?.click(), 0);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-bold hover:bg-slate-50 border border-indigo-100 shadow-sm"
                    title="Strecken importieren"
                  >
                    <FileUp size={14} />
                    <span className="hidden sm:inline">Import</span>
                  </button>
                  <button 
                    onClick={handleExportRoutes}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl text-xs font-bold hover:bg-slate-50 border border-indigo-100 shadow-sm"
                    title="Alle Strecken exportieren"
                  >
                    <Download size={14} />
                    <span className="hidden sm:inline">Export</span>
                  </button>
                  {savedRoutes.length > 0 && (
                    <button 
                      onClick={() => setIsDeletingAllRoutes(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 border border-red-100"
                    >
                      <Trash2 size={14} />
                      <span className="hidden sm:inline">Alle löschen</span>
                    </button>
                  )}
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200">
                    <TrendingUp size={24} className="text-blue-700" />
                  </div>
                </div>
              </div>

              {savedRoutes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedRoutes.map((route) => (
                    <div key={route.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md group">
                      <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="bg-indigo-50 p-2 rounded-xl text-indigo-600">
                            <MapIcon size={20} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{route.date}</span>
                        </div>
                        
                          <div>
                            <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600">{route.name}</h3>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <Navigation size={12} className="text-slate-400" />
                                <span className="text-xs text-slate-500">{(route.waypoints || []).length} Wegpunkte</span>
                              </div>
                              {route.distance !== undefined && (
                                <div className="flex items-center gap-1">
                                  <Globe size={12} className="text-slate-400" />
                                  <span className="text-xs text-slate-500">{formatDist(route.distance)}</span>
                                </div>
                              )}
                            </div>
                          </div>

                        <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Volumenstrom</p>
                            <p className="text-sm font-bold text-slate-900">{route.flowRate || 0} l/min</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Abgabedruck</p>
                            <p className="text-sm font-bold text-slate-900">{route.summary && typeof route.summary.endPressure === 'number' ? `${route.summary.endPressure.toFixed(1)} bar` : 'N/A'}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => loadRoute(route)}
                            className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-sm"
                          >
                            Laden
                          </button>
                          <button 
                            onClick={() => downloadPDF(route)}
                            disabled={isExporting}
                            className={cn(
                              "p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100 shadow-sm hover:bg-blue-100",
                              isExporting && "opacity-50 cursor-not-allowed"
                            )}
                            title="PDF Export"
                          >
                            <FileText size={16} />
                          </button>
                          <button 
                            onClick={() => handleShareRoute(route)}
                            className="p-2.5 bg-white text-indigo-600 rounded-xl border border-indigo-100 shadow-sm hover:bg-indigo-50"
                            title="Teilen"
                          >
                            <Share2 size={16} />
                          </button>
                          <button 
                            onClick={() => {
                              const newName = prompt('Neuer Name:', route.name);
                              if (newName) {
                                setSavedRoutes(prev => prev.map(r => r.id === route.id ? { ...r, name: newName } : r));
                              }
                            }}
                            className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 border border-slate-100"
                            title="Umbenennen"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => setRouteToDeleteId(route.id)}
                            className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 border border-red-100"
                            title="Löschen"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300">
                    <TrendingUp size={32} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Noch keine Strecken</h3>
                    <p className="text-slate-400 text-sm max-w-xs mx-auto">
                      Hier werden deine gespeicherten Strecken angezeigt. Klicke auf das Speicher-Icon im Planer, um eine Route zu sichern.
                    </p>
                  </div>
                  <button 
                    onClick={() => setCurrentView('planner')}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-200 hover:bg-indigo-700"
                  >
                    Jetzt erste Strecke planen
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10">
            <div className="max-w-3xl mx-auto space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Einstellungen</h2>
                <p className="text-slate-500">Passe den Routenplaner an deine Bedürfnisse an.</p>
              </div>

              {/* Settings Tabs */}
              <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
                <button 
                  onClick={() => setSettingsTab('general')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2",
                    settingsTab === 'general' ? "bg-indigo-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <Globe size={16} />
                  Standard
                </button>
                <button 
                  onClick={() => setSettingsTab('pumps')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2",
                    settingsTab === 'pumps' ? "bg-blue-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <PumpIcon size={16} />
                  Pumpen
                </button>
                <button 
                  onClick={() => setSettingsTab('hoses')}
                  className={cn(
                    "flex-1 py-2 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2",
                    settingsTab === 'hoses' ? "bg-cyan-600 text-white shadow-md" : "text-slate-500 hover:bg-slate-50"
                  )}
                >
                  <Spline size={16} />
                  Schläuche
                </button>
              </div>

              <div className="space-y-6">
                {settingsTab === 'pumps' && (
                  <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-blue-50 p-2 rounded-lg text-blue-600">
                        <PumpIcon size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800">Pumpen-Konfiguration</h3>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-xs font-bold text-slate-500 uppercase block tracking-widest">Verfügbare Pumpen (Nach Hersteller)</label>
                          <div className="flex items-center gap-2">
                             <button 
                              onClick={() => {
                                setImportType('pumps');
                                setTimeout(() => fileInputRef.current?.click(), 0);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 border border-blue-100"
                              title="Bestand importieren"
                            >
                              <FileUp size={12} />
                              Import
                            </button>
                            <button 
                              onClick={handleExportPumps}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-bold hover:bg-blue-100 border border-blue-100"
                              title="Bestand exportieren"
                            >
                              <Download size={12} />
                              Export
                            </button>
                          </div>
                        </div>
                        <div className="space-y-4">
                          {groupedPumps.map(([manufacturer, pumps]) => {
                            const isExpanded = expandedManufacturer === manufacturer;
                            const enabledCount = pumps.filter(p => p.enabled).length;
                            const selectedModelId = selectedModelByManufacturer[manufacturer];
                            const selectedPump = pumps.find(p => p.id === selectedModelId);

                            return (
                              <div key={manufacturer} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                                {/* Manufacturer Header (Accordion Toggle) */}
                                <div 
                                  className={cn(
                                    "p-5 flex items-center justify-between cursor-pointer",
                                    isExpanded ? "bg-slate-50 border-b border-slate-200" : "hover:bg-slate-50"
                                  )}
                                  onClick={() => setExpandedManufacturer(isExpanded ? null : manufacturer)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className={cn(
                                      "p-2 rounded-xl",
                                      enabledCount > 0 ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400"
                                    )}>
                                      <PumpIcon size={20} />
                                    </div>
                                    <div>
                                      <h4 className="text-lg font-bold text-slate-900">{manufacturer}</h4>
                                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        {enabledCount} von {pumps.length} Modellen aktiv
                                      </p>
                                    </div>
                                  </div>
                                  <div>
                                    <ArrowDownRight size={20} className="text-slate-400" />
                                  </div>
                                </div>

                                {/* Expanded Content */}
                                {isExpanded && (
                                  <div className="p-5 space-y-6">
                                    {/* List of Models */}
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Modelle</label>
                                      {pumps.map(p => (
                                        <div 
                                          key={p.id} 
                                          className={cn(
                                            "flex items-center justify-between p-3 rounded-2xl border cursor-pointer",
                                            selectedModelId === p.id 
                                              ? "bg-blue-50 border-blue-200" 
                                              : "bg-white border-slate-100 hover:border-slate-200"
                                          )}
                                          onClick={() => setSelectedModelByManufacturer(prev => ({ ...prev, [manufacturer]: p.id }))}
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className={cn(
                                              "w-2 h-2 rounded-full",
                                              p.enabled ? "bg-green-500" : "bg-slate-300"
                                            )} />
                                            <span className={cn(
                                              "text-sm font-bold",
                                              p.enabled ? "text-slate-800" : "text-slate-400"
                                            )}>
                                              {p.model}
                                            </span>
                                          </div>
                                          
                                          <button 
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setSettings(s => ({ 
                                                ...s, 
                                                pumps: s.pumps.map(pump => pump.id === p.id ? { ...pump, enabled: !pump.enabled } : pump) 
                                              }));
                                            }}
                                            className={cn(
                                              "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase",
                                              p.enabled 
                                                ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                            )}
                                          >
                                            {p.enabled ? "Aktiv" : "Inaktiv"}
                                          </button>
                                        </div>
                                      ))}
                                    </div>

                                    {/* Selected Pump Details */}
                                    {selectedPump && (
                                      <PumpDetails 
                                        pump={selectedPump}
                                        onUpdate={(updatedPump) => {
                                          setSettings(s => ({ 
                                            ...s, 
                                            pumps: s.pumps.map(p => p.id === updatedPump.id ? updatedPump : p) 
                                          }));
                                        }}
                                        onDelete={() => setPumpToDeleteId(selectedPump.id)}
                                        expandedManufacturer={expandedManufacturer}
                                        setExpandedManufacturer={setExpandedManufacturer}
                                        setSelectedModelByManufacturer={setSelectedModelByManufacturer}
                                      />
                                    )}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          
                          <button 
                            onClick={() => {
                              const newPump: Pump = {
                                id: `p-${Date.now()}`,
                                manufacturer: 'Neuer Hersteller',
                                model: 'Neues Modell',
                                type: 'Tauchpumpe',
                                driveType: 'Elektro',
                                power: 1.8,
                                grainSize: 8,
                                maxCasingPressure: 10,
                                curves: [{ id: 'c1', name: 'Standard', a2: 7.01E-06, a1: -2.58E-03, a0: 1.52E+00, maxFlow: 700, active: true }],
                                enabled: true
                              };
                              setSettings(s => ({ ...s, pumps: sortPumps([...s.pumps, newPump]) }));
                              setExpandedManufacturer(newPump.manufacturer);
                              setSelectedModelByManufacturer(prev => ({ ...prev, [newPump.manufacturer]: newPump.id }));
                              setEditingPumpId(newPump.id);
                            }}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold hover:border-red-200 hover:text-red-400 flex items-center justify-center gap-2"
                          >
                            <Plus size={14} />
                            Pumpe hinzufügen
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>
                )}

                {settingsTab === 'hoses' && (
                  <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-cyan-50 p-2 rounded-lg text-cyan-600">
                        <Navigation size={20} />
                      </div>
                      <h3 className="font-bold text-slate-800">Schlauch-Konfiguration</h3>
                    </div>

                    <div className="space-y-6">
                      <div className="pt-4">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-4 block tracking-widest">Verfügbare Schläuche</label>
                        <div className="space-y-2">
                          {sortHoses(settings.hoses).map((hose) => (
                            <div 
                              key={hose.id} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-2xl border cursor-pointer",
                                selectedHoseId === hose.id 
                                  ? "bg-cyan-50 border-cyan-200" 
                                  : "bg-white border-slate-100 hover:border-slate-200"
                              )}
                              onClick={() => setSelectedHoseId(hose.id)}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-2 h-2 rounded-full",
                                  hose.enabled ? "bg-green-500" : "bg-slate-300"
                                )} />
                                <span className={cn(
                                  "text-sm font-bold",
                                  hose.enabled ? "text-slate-800" : "text-slate-400"
                                )}>
                                  {hose.name}
                                </span>
                              </div>
                              
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSettings(s => ({ 
                                    ...s, 
                                    hoses: s.hoses.map(h => h.id === hose.id ? { ...h, enabled: !h.enabled } : h) 
                                  }));
                                }}
                                className={cn(
                                  "px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase",
                                  hose.enabled 
                                    ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                )}
                              >
                                {hose.enabled ? "Aktiv" : "Inaktiv"}
                              </button>
                            </div>
                          ))}

                          <button 
                            onClick={() => {
                              const newHose: HoseSize = {
                                id: `h-${Date.now()}`,
                                name: 'Neuer Schlauch',
                                diameter: 75,
                                roughness: 130,
                                maxPressure: 10,
                                enabled: true
                              };
                              setSettings(s => ({ ...s, hoses: sortHoses([...s.hoses, newHose]) }));
                              setSelectedHoseId(newHose.id);
                              setEditingHoseId(newHose.id);
                            }}
                            className="w-full py-3 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-xs font-bold hover:border-cyan-200 hover:text-cyan-400 flex items-center justify-center gap-2"
                          >
                            <Plus size={14} />
                            Schlauch hinzufügen
                          </button>
                        </div>
                      </div>

                      {/* Selected Hose Details */}
                      {(() => {
                        const selectedHose = settings.hoses.find(h => h.id === selectedHoseId);
                        if (!selectedHose) return null;

                        return (
                          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-1 h-4 bg-cyan-500 rounded-full" />
                                <h5 className="text-sm font-bold text-slate-800">Spezifikationen: {selectedHose.name}</h5>
                              </div>
                                <div className="flex items-center gap-4">
                                  {!selectedHose.isDefault && (
                                    <button 
                                      onClick={() => setHoseToDeleteId(selectedHose.id)}
                                      className="text-red-500 hover:text-red-700"
                                      title="Schlauch löschen"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                  <label className="text-[10px] font-bold text-slate-400 uppercase">Bezeichnung</label>
                                  <input 
                                    type="text" 
                                    value={selectedHose.name ?? ''}
                                    readOnly={selectedHose.isDefault}
                                    onChange={(e) => {
                                      setSettings(s => ({ 
                                        ...s, 
                                        hoses: s.hoses.map(h => h.id === selectedHose.id ? { ...h, name: e.target.value } : h) 
                                      }));
                                    }}
                                    className={cn(
                                      "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-cyan-500 outline-none",
                                      selectedHose.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Durchmesser (mm)</label>
                                    <input 
                                      type="number" 
                                      value={selectedHose.diameter === 0 ? '' : (selectedHose.diameter ?? '')}
                                      readOnly={selectedHose.isDefault}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSettings(s => ({ 
                                          ...s, 
                                          hoses: s.hoses.map(h => h.id === selectedHose.id ? { ...h, diameter: val === '' ? 0 : parseInt(val) || 0 } : h) 
                                        }));
                                      }}
                                      className={cn(
                                        "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none",
                                        selectedHose.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
                                      )}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Rauheitsbeiwert (C)</label>
                                    <input 
                                      type="number" 
                                      value={selectedHose.roughness === 0 ? '' : (selectedHose.roughness ?? '')}
                                      readOnly={selectedHose.isDefault}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSettings(s => ({ 
                                          ...s, 
                                          hoses: s.hoses.map(h => h.id === selectedHose.id ? { ...h, roughness: val === '' ? 0 : parseInt(val) || 0 } : h) 
                                        }));
                                      }}
                                      className={cn(
                                        "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none",
                                        selectedHose.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
                                      )}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Max. Druck (bar)</label>
                                    <input 
                                      type="number" 
                                      step="0.1"
                                      value={selectedHose.maxPressure === 0 ? '' : (selectedHose.maxPressure ?? '')}
                                      readOnly={selectedHose.isDefault}
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        setSettings(s => ({ 
                                          ...s, 
                                          hoses: s.hoses.map(h => h.id === selectedHose.id ? { ...h, maxPressure: val === '' ? 0 : parseFloat(val) || 0 } : h) 
                                        }));
                                      }}
                                      className={cn(
                                        "w-full bg-white p-2 rounded-lg text-xs font-bold mt-1 border border-slate-100 focus:ring-2 focus:ring-blue-500 outline-none",
                                        selectedHose.isDefault && "bg-slate-50 text-slate-500 cursor-not-allowed"
                                      )}
                                    />
                              </div>
                            </div>
                          </div>
                        </div>
                        );
                      })()}
                    </div>
                  </section>
                )}

                {settingsTab === 'general' && (
                  <div className="space-y-6">
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="bg-amber-50 p-2 rounded-lg text-amber-600">
                          <Globe size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800">System & Offline-Modus</h3>
                      </div>
                      
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-slate-800">Offline-Modus</p>
                            <p className="text-xs text-slate-500">Wird automatisch anhand der Internetverbindung gesteuert.</p>
                          </div>
                          <button 
                            onClick={() => setIsOfflineMode(!isOfflineMode)}
                            className={cn(
                              "w-11 h-6 rounded-full relative flex items-center px-1",
                              isOfflineMode ? "bg-amber-500" : "bg-slate-200"
                            )}
                          >
                            <div className={cn(
                              "w-4 h-4 bg-white rounded-full shadow-sm",
                              isOfflineMode ? "translate-x-5" : "translate-x-0"
                            )} />
                          </button>
                        </div>
                        {isOfflineMode && (
                          <div className="p-3 bg-amber-100/50 rounded-xl border border-amber-200 flex gap-3">
                            <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-800 leading-relaxed">
                              Im Offline-Modus können Wegpunkte nicht verschoben oder neu erstellt werden. 
                              Nutze GPX-Importe oder gespeicherte Strecken für Berechnungen.
                            </p>
                          </div>
                        )}

                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Berechnungs-Modell</label>
                          <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                            <button 
                              onClick={() => setSettings({ ...settings, useMaxFlowModel: false })}
                              className={cn(
                                "py-2 text-[10px] font-bold rounded-lg",
                                !settings.useMaxFlowModel ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                              )}
                            >
                              Vorgabe (l/min)
                            </button>
                            <button 
                              onClick={() => setSettings({ ...settings, useMaxFlowModel: true })}
                              className={cn(
                                "py-2 text-[10px] font-bold rounded-lg",
                                settings.useMaxFlowModel ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                              )}
                            >
                              Max. Flow
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-slate-200">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Höhendaten-Quelle</label>
                          <select 
                            value={settings.elevationSource ?? 'hoehendaten'}
                            onChange={(e) => setSettings({ ...settings, elevationSource: e.target.value })}
                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            <option value="hoehendaten">Hoehendaten.de (DGM 1m)</option>
                            <option value="open-meteo">Open-Meteo API</option>
                            <option value="open-elevation">Open-Elevation</option>
                            <option value="gpx_only">Nur GPX / GPS Daten</option>
                          </select>
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                          <button 
                            onClick={() => setShowManual(true)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-50 text-indigo-600 rounded-2xl text-sm font-bold hover:bg-indigo-100 border border-indigo-100"
                          >
                            <Info size={18} />
                            Anleitung öffnen
                          </button>
                        </div>
                      </div>
                    </section>

                    {/* Default Values Section */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600">
                          <LayoutDashboard size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800">Start-Daten (Standardwerte)</h3>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Standard-Volumenstrom (l/min)</label>
                          <input 
                            type="number" 
                            value={settings.flowRate === 0 ? '' : (settings.flowRate ?? '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings(s => ({ ...s, flowRate: val === '' ? 0 : parseInt(val) || 0 }));
                            }}
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Standard-Startdruck (bar)</label>
                          <input 
                            type="number" 
                            step="0.1"
                            value={settings.startPressure ?? 0}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings(s => ({ ...s, startPressure: val === '' ? 0 : parseFloat(val) || 0 }));
                            }}
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>
                        
                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Standard-Pumpe (Startpunkt)</label>
                          <select 
                            value={settings.defaultPumpId ?? ''}
                            onChange={(e) => setSettings(s => ({ ...s, defaultPumpId: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {sortPumps(settings.pumps.filter(p => p.enabled || p.id === settings.defaultPumpId)).map(p => (
                              <option key={p.id} value={p.id}>{p.manufacturer} {p.model}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Standard-Schlauchgröße</label>
                          <select 
                            value={settings.defaultHoseId ?? ''}
                            onChange={(e) => setSettings(s => ({ ...s, defaultHoseId: e.target.value }))}
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          >
                            {settings.hoses.filter(h => h.enabled || h.id === settings.defaultHoseId).map(h => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Standard-Schlauch-Anzahl</label>
                          <input 
                            type="number" 
                            min="1"
                            value={settings.defaultHoseCount === 0 ? '' : (settings.defaultHoseCount ?? '')}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSettings(s => ({ ...s, defaultHoseCount: val === '' ? 0 : parseInt(val) || 0 }));
                            }}
                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <div>
                              <p className="text-sm font-bold text-slate-800">Automatisches Pufferbecken</p>
                              <p className="text-xs text-slate-500">Aktiviert automatisch die Pufferbecken-Option, wenn eine Verstärker-Pumpe hinzugefügt wird.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                className="sr-only peer"
                                checked={settings.autoBufferBasin}
                                onChange={(e) => setSettings(s => ({ ...s, autoBufferBasin: e.target.checked }))}
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 peer-checked:bg-indigo-600"></div>
                            </label>
                          </div>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-4 px-1 italic">
                        Diese Werte werden automatisch für neue Wegpunkte und Berechnungen verwendet.
                      </p>
                    </section>
                  </div>
                )}

                {/* Info Section */}
                <div className="p-6 text-center">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mb-2">Pumpstreckenrechner v2.0</p>
                  <p className="text-xs text-slate-400">Entwickelt für den Katastrophenschutz (THW) und Feuerwehren.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Deletion Confirmation Modal */}
        {(pumpToDeleteId || hoseToDeleteId || isDeletingAllWaypoints || routeToDeleteId || isDeletingAllRoutes) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { 
                setPumpToDeleteId(null); 
                setHoseToDeleteId(null); 
                setIsDeletingAllWaypoints(false);
                setRouteToDeleteId(null);
                setIsDeletingAllRoutes(false);
              }}
            />
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative z-10">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Trash2 size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Löschen bestätigen</h3>
                <p className="text-slate-500 mb-8">
                  {hoseToDeleteId && settings.hoses.length <= 1 
                    ? "Es muss mindestens eine Schlauchgröße konfiguriert sein. Dieser Schlauch kann nicht gelöscht werden."
                    : isDeletingAllWaypoints
                    ? "Möchten Sie wirklich alle Wegpunkte aus der Planung entfernen?"
                    : isDeletingAllRoutes
                    ? "Möchten Sie wirklich alle gespeicherten Strecken unwiderruflich löschen?"
                    : routeToDeleteId
                    ? "Möchten Sie diese gespeicherte Strecke wirklich unwiderruflich löschen?"
                    : `Möchten Sie ${pumpToDeleteId ? "diese Pumpe" : "diese Schlauchgröße"} wirklich unwiderruflich löschen?`}
                </p>
                
                <div className="flex flex-col gap-3">
                  {(!hoseToDeleteId || settings.hoses.length > 1) && (
                    <button 
                      onClick={() => {
                        if (pumpToDeleteId) {
                          setSettings(s => ({ ...s, pumps: s.pumps.filter(p => p.id !== pumpToDeleteId) }));
                          setEditingPumpId(null);
                          setPumpToDeleteId(null);
                        } else if (hoseToDeleteId) {
                          setSettings(s => ({ ...s, hoses: s.hoses.filter(h => h.id !== hoseToDeleteId) }));
                          setSelectedHoseId(settings.hoses.find(h => h.id !== hoseToDeleteId)?.id || null);
                          setEditingHoseId(null);
                          setHoseToDeleteId(null);
                        } else if (isDeletingAllWaypoints) {
                          clearWaypoints();
                          setIsDeletingAllWaypoints(false);
                        } else if (isDeletingAllRoutes) {
                          setSavedRoutes([]);
                          setIsDeletingAllRoutes(false);
                        } else if (routeToDeleteId) {
                          setSavedRoutes(prev => prev.filter(r => r.id !== routeToDeleteId));
                          setRouteToDeleteId(null);
                        }
                      }}
                      className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 shadow-lg shadow-red-200 uppercase tracking-widest text-sm"
                    >
                      Ja, Löschen
                    </button>
                  )}
                  <button 
                    onClick={() => { 
                      setPumpToDeleteId(null); 
                      setHoseToDeleteId(null); 
                      setIsDeletingAllWaypoints(false);
                      setRouteToDeleteId(null);
                      setIsDeletingAllRoutes(false);
                    }}
                    className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 uppercase tracking-widest text-sm"
                  >
                    {hoseToDeleteId && settings.hoses.length <= 1 ? "Verstanden" : "Abbrechen"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Update Confirmation Modal */}
        {showUpdateConfirm && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowUpdateConfirm(false)}
            />
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative z-10">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Save size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Strecke aktualisieren?</h3>
                <p className="text-slate-500 mb-8">
                  Diese Strecke wurde bereits gespeichert. Möchten Sie die bestehende Strecke aktualisieren oder als neue Strecke speichern?
                </p>
                
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      setShowUpdateConfirm(false);
                      saveRoute({ forceUpdate: true });
                    }}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 uppercase tracking-widest text-sm"
                  >
                    Aktualisieren
                  </button>
                  <button 
                    onClick={() => {
                      setShowUpdateConfirm(false);
                      saveRoute({ isNew: true });
                    }}
                    className="w-full py-4 bg-white text-slate-600 font-bold rounded-2xl hover:bg-slate-50 border border-slate-200 uppercase tracking-widest text-sm"
                  >
                    Als neue Strecke speichern
                  </button>
                  <button 
                    onClick={() => setShowUpdateConfirm(false)}
                    className="w-full py-3 text-slate-400 font-medium hover:text-slate-600 text-sm"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Intro Modal (Short version for first-time users) */}
        {showIntro && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowIntro(false)}
            />
            <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative z-10">
              <div className="p-8 text-center space-y-6">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto">
                  <MapIcon size={40} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900">Willkommen!</h3>
                  <p className="text-slate-500 text-sm">
                    Planen Sie Ihre Pumpenförderstrecke in wenigen Schritten:
                  </p>
                </div>
                
                <div className="grid gap-4 text-left">
                  <div className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-indigo-600 font-bold shrink-0">1</div>
                    <p className="text-xs text-slate-600 leading-tight">Klicken Sie auf die Karte, um Wegpunkte für Ihre Strecke zu setzen.</p>
                  </div>
                  <div className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-indigo-600 font-bold shrink-0">2</div>
                    <p className="text-xs text-slate-600 leading-tight">Klicken Sie auf Marker, um Pumpen oder Schläuche zu konfigurieren.</p>
                  </div>
                  <div className="flex gap-4 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center text-indigo-600 font-bold shrink-0">3</div>
                    <p className="text-xs text-slate-600 leading-tight">Wechseln Sie zur "Auswertung", um den Druckverlauf zu prüfen.</p>
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <button 
                    onClick={() => setShowIntro(false)}
                    className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                  >
                    Loslegen
                  </button>
                  <button 
                    onClick={() => {
                      setShowIntro(false);
                      setShowManual(true);
                    }}
                    className="w-full py-3 text-slate-500 text-sm font-medium hover:text-indigo-600"
                  >
                    Ausführliche Anleitung lesen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manual Modal */}
        {showManual && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
              onClick={() => setShowManual(false)}
            />
            <div className="bg-white w-full max-w-5xl h-[92vh] max-h-[1000px] rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden relative z-10 flex flex-col">
              <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <Info size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Bedienungsanleitung</h3>
                    <p className="text-indigo-100 text-xs">Pumpenförderstrecken-Planer v2.0</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowManual(false)}
                  className="p-2 hover:bg-white/10 rounded-full"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Schnellauswahl / Tabs */}
              <div className="bg-slate-50 border-b border-slate-100 p-2 grid grid-cols-2 md:flex md:overflow-x-auto no-scrollbar gap-1">
                {MANUAL_CONTENT.map((section, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveManualTab(idx)}
                    className={cn(
                      "px-2 py-2 rounded-xl text-[10px] md:text-xs font-bold whitespace-nowrap md:flex-shrink-0 md:px-4 flex items-center justify-center gap-2",
                      activeManualTab === idx
                        ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {idx === 0 && <MapIcon size={14} />}
                    {idx === 1 && <BarChart3 size={14} />}
                    {idx === 2 && <LayoutDashboard size={14} />}
                    <span>{section.title.split('. ')[1] || section.title}</span>
                  </button>
                ))}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center justify-center w-10 h-10 bg-indigo-100 text-indigo-600 rounded-2xl text-lg font-bold">
                        {activeManualTab + 1}
                      </span>
                      <h4 className="text-xl font-bold text-slate-900">
                        {MANUAL_CONTENT[activeManualTab].title}
                      </h4>
                    </div>
                    
                    <div className="bg-white rounded-3xl p-2 md:p-4">
                      <div className="space-y-1">
                        {MANUAL_CONTENT[activeManualTab].content.split('\n').map((line, i) => {
                          if (line.startsWith('## ')) {
                            return (
                              <h5 key={i} className="text-indigo-600 font-bold text-sm uppercase tracking-wider mt-6 mb-2 first:mt-0">
                                {line.substring(3)}
                              </h5>
                            );
                          }
                          if (line.startsWith('• ')) {
                            const [label, ...rest] = line.substring(2).split(':');
                            const description = rest.join(':');
                            
                            let Icon = null;
                            const l = label.toLowerCase();
                            
                            // Tab 5: Gesamtauswertung
                            if (l.includes('abgabedruck')) Icon = Check;
                            else if (l.includes('volumenstrom')) Icon = PumpIcon;
                            else if (l.includes('distanz')) Icon = Navigation;
                            else if (l.includes('höhendiff')) Icon = TrendingUp;
                            else if (l.includes('druckverlust')) Icon = ArrowDownRight;
                            else if (l.includes('nullförderung')) Icon = AlertTriangle;
                            else if (l.includes('korndurchlass')) Icon = Filter;
                            else if (l.includes('leistung')) Icon = Zap;
                            else if (l.includes('max. flow')) Icon = Activity;
                            
                            // Tab 1: Planer
                            else if (l.includes('wegpunkte')) Icon = MapPin;
                            else if (l.includes('wasserentnahme')) Icon = Droplets;
                            else if (l.includes('gps-tracking')) Icon = Navigation2;
                            else if (l.includes('kartenstile')) Icon = Layers;
                            else if (l.includes('route umkehren')) Icon = ArrowLeftRight;
                            
                            // Tab 2: Konfiguration
                            else if (l.includes('pumpenauswahl')) Icon = PumpIcon;
                            else if (l.includes('pufferbecken')) Icon = Spline;
                            else if (l.includes('durchfluss')) Icon = Activity;
                            
                            else if (l.includes('abgabestelle')) Icon = MapPin;
                            else if (l.includes('marker verschieben')) Icon = Move;
                            else if (l.includes('punkte einfügen')) Icon = Plus;
                            else if (l.includes('standort-zentrierung')) Icon = Crosshair;
                            else if (l.includes('kennlinien')) Icon = Activity;
                            else if (l.includes('schlauch-override')) Icon = RefreshCw;
                            else if (l.includes('ausgangsdruck')) Icon = Gauge;
                            
                            // Tab 3: Auswertung
                            else if (l.includes('druckgraph')) Icon = BarChart3;
                            else if (l.includes('kavitations-warnung')) Icon = AlertCircle;
                            else if (l.includes('statischer druck')) Icon = ShieldAlert;
                            else if (l.includes('höhenprofil')) Icon = AreaChart;
                            else if (l.includes('belastungsgrenze')) Icon = Ruler;
                            else if (l.includes('interaktive analyse')) Icon = MousePointer2;
                            else if (l.includes('materialliste')) Icon = List;
                            
                            // Tab 4: Werkzeuge
                            else if (l.includes('bibliothek')) Icon = Save;
                            else if (l.includes('gpx')) Icon = Globe;
                            else if (l.includes('pdf')) Icon = Download;
                            else if (l.includes('offline')) Icon = Moon;
                            else if (l.includes('löschfunktionen')) Icon = Trash2;

                            return (
                              <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-200/50 last:border-0">
                                <div className="mt-0.5 bg-indigo-100 p-1.5 rounded-lg text-indigo-600 flex-shrink-0">
                                  {Icon ? <Icon size={14} /> : <div className="w-3.5 h-3.5 rounded-full bg-indigo-300" />}
                                </div>
                                <div className="text-sm md:text-base">
                                  <span className="font-bold text-slate-900">{label}:</span>
                                  <span className="text-slate-600 ml-1">{description}</span>
                                </div>
                              </div>
                            );
                          }
                          return (
                            <p key={i} className={cn(
                              "text-slate-600 text-sm md:text-base leading-relaxed mb-4 last:mb-0",
                              line.trim() === "" ? "h-2" : ""
                            )}>
                              {line}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".json" 
          onChange={handleImportFile}
        />

        {/* Export Selector Modal */}
        {showExportSelector && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-slate-900">
                      {showExportSelector === 'routes' ? 'Strecken wählen' : 'Pumpen wählen'}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      Wähle die Items aus, die du exportieren möchtest.
                    </p>
                  </div>
                  <button 
                    onClick={() => setShowExportSelector(null)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={24} className="text-slate-400" />
                  </button>
                </div>

                <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2">
                  {showExportSelector === 'routes' ? (
                    savedRoutes.map(route => (
                      <button
                        key={route.id}
                        onClick={() => {
                          setSelectedExportIds(prev => 
                            prev.includes(route.id) 
                              ? prev.filter(id => id !== route.id)
                              : [...prev, route.id]
                          );
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                          selectedExportIds.includes(route.id)
                            ? "bg-indigo-50 border-indigo-200"
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center border-2 transition-colors",
                            selectedExportIds.includes(route.id)
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300"
                          )}>
                            {selectedExportIds.includes(route.id) && <Check size={14} strokeWidth={4} />}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800 text-sm">{route.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">{route.date}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    settings.pumps.map(pump => (
                      <button
                        key={pump.id}
                        onClick={() => {
                          setSelectedExportIds(prev => 
                            prev.includes(pump.id) 
                              ? prev.filter(id => id !== pump.id)
                              : [...prev, pump.id]
                          );
                        }}
                        className={cn(
                          "w-full flex items-center justify-between p-4 rounded-2xl border transition-all",
                          selectedExportIds.includes(pump.id)
                            ? "bg-indigo-50 border-indigo-200"
                            : "bg-white border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center border-2 transition-colors",
                            selectedExportIds.includes(pump.id)
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300"
                          )}>
                            {selectedExportIds.includes(pump.id) && <Check size={14} strokeWidth={4} />}
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-slate-800 text-sm">{pump.manufacturer} {pump.model}</p>
                            <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">{pump.type}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => {
                      if (showExportSelector === 'routes') {
                        setSelectedExportIds(savedRoutes.map(r => r.id));
                      } else {
                        setSelectedExportIds(settings.pumps.map(p => p.id));
                      }
                    }}
                    className="py-3 px-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200"
                  >
                    Alle wählen
                  </button>
                  <button 
                    onClick={() => setSelectedExportIds([])}
                    className="py-3 px-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200"
                  >
                    Keine wählen
                  </button>
                  <button 
                    onClick={showExportSelector === 'routes' ? performExportRoutes : performExportPumps}
                    className="col-span-2 py-3 px-4 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                  >
                    Exportieren
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Route Success Toaster */}
        {/* Hidden container for PDF export */}
      {exportRoute && (
        <div className="fixed -left-[4000px] top-0" ref={printRef}>
          <div className="w-[1200px] bg-white p-12">
            <AnalysisReport 
              route={exportRoute}
              settings={settings}
              formatDist={formatDist}
              createWaypointIcon={createWaypointIcon}
              isElevationStale={false}
              isPrint={true}
            />
          </div>
        </div>
      )}

      {showShareSuccess && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 transition-all">
            <div className="bg-blue-500 p-1 rounded-full text-white">
              <Check size={16} strokeWidth={3} />
            </div>
            <p className="font-bold text-sm">Link kopiert! Bereit zum Teilen.</p>
          </div>
        )}
      </main>
    </div>
    </ErrorBoundary>
  );
}

