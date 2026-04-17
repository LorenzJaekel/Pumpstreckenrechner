import React, { useState, useEffect } from 'react';
import { 
  Check, 
  Navigation, 
  TrendingUp, 
  ArrowDownRight, 
  AlertTriangle, 
  Filter, 
  Zap
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine, 
  Label 
} from 'recharts';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { SavedRoute, ElevationData, WaypointResult, HoseSize } from '../types';
import { cn } from '../lib/utils';
import { RoutePolylines } from './RoutePolylines';
import { MapController } from './MapController';

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

function StatCard({ title, value, icon, color, isPrint = false }: { title: string, value: string, icon: React.ReactNode, color: string, isPrint?: boolean }) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-50 text-slate-600 border-slate-100",
  };

  return (
    <div className={cn(
      "p-4 rounded-3xl border shadow-sm flex flex-col justify-between",
      colorClasses[color] || colorClasses.blue,
      isPrint && "rounded-none p-2 shadow-none border-slate-100"
    )}>
      <div className="flex items-center justify-between mb-2">
        <p className={cn("font-bold uppercase tracking-widest", isPrint ? "text-[8px]" : "text-[10px]")}>{title}</p>
        <div className={cn(isPrint ? "opacity-50" : "opacity-80")}>{icon}</div>
      </div>
      <p className={cn("font-black tracking-tight", isPrint ? "text-lg" : "text-2xl")}>{value}</p>
    </div>
  );
}

const TooltipSync = ({ active, payload, setActivePoint }: any) => {
  useEffect(() => {
    if (active && payload && payload.length) {
      setActivePoint(payload[0].payload);
    }
  }, [active, payload, setActivePoint]);
  
  return <div className="opacity-0 pointer-events-none absolute" />;
};

export const AnalysisReport = ({ 
  route, 
  settings, 
  formatDist, 
  createWaypointIcon,
  isElevationStale,
  isPrint = false
}: { 
  route: SavedRoute; 
  settings: any; 
  formatDist: (m: number) => string;
  createWaypointIcon: any;
  isElevationStale: boolean;
  isPrint?: boolean;
}) => {
  const { waypoints, summary, flowRate, elevationData, waypointResults, name } = route;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activePoint, setActivePoint] = useState<ElevationData | null>(null);
  if (!summary || !elevationData || !waypointResults || !waypoints || waypoints.length === 0) return null;

  // Calculate ticks for Y-axis (Pressure) - 1 bar steps
  const minP = Math.min(...elevationData.map(d => d.pressure ?? 0), 0);
  const maxP = Math.max(...elevationData.map(d => d.pressure ?? 0), 1);
  const yStep = 1;
  const yTicks = [];
  for (let i = Math.floor(minP); i <= Math.ceil(maxP) + 1; i += yStep) {
    yTicks.push(i);
  }
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];

  // Calculate ticks for Elevation axis (Right)
  const minE = Math.min(...elevationData.map(d => d.elevation ?? 0));
  const maxE = Math.max(...elevationData.map(d => d.elevation ?? 0));
  const eMin = Math.floor(minE / 10) * 10;
  const eMax = Math.ceil(maxE / 10) * 10;
  const eStep = Math.max(10, Math.ceil((eMax - eMin) / 5));
  const eTicks = [];
  for (let i = eMin; i <= eMax; i += eStep) {
    eTicks.push(i);
  }

  // Calculate ticks for X-axis (Distance) - 100m steps
  const maxD = Math.max(...elevationData.map(d => d.distance), 100);
  const xStep = 100;
  const xTicks = [];
  for (let i = 0; i <= Math.ceil(maxD / xStep) * xStep; i += xStep) {
    xTicks.push(i);
  }

  return (
    <div className={cn(
      "mx-auto space-y-4",
      isPrint ? "max-w-[210mm] bg-white p-6 rounded-none shadow-lg print:shadow-none" : "max-w-5xl"
    )}>
      <div className={cn(
        "flex items-center justify-between border-b border-slate-100 pb-4",
        !isPrint && "mb-8"
      )}>
        <div>
          <h2 className={cn("font-bold text-slate-900", isPrint ? "text-2xl" : "text-3xl")}>{name || 'Pumpstrecken-Auswertung'}</h2>
          <p className="text-slate-500 text-sm">Detaillierte Statistiken und Analysen der geplanten Pumpstrecke.</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Datum</p>
          <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('de-DE')}</p>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Quelle</p>
          <p className="text-[10px] font-bold text-slate-900">
            {settings.elevationSource === 'hoehendaten' ? 'Hoehendaten.de (DGM 1m)' :
             settings.elevationSource === 'open-meteo' ? 'Open-Meteo API' :
             settings.elevationSource === 'open-elevation' ? 'Open-Elevation' : 'Nur GPX / GPS Daten'}
          </p>
        </div>
      </div>

      {/* Stats Row - Top */}
      <div className={cn(
        "grid gap-4",
        isPrint ? "grid-cols-4 gap-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {!settings.useMaxFlowModel && (
          <StatCard 
            title="Abgabedruck" 
            value={`${(summary.endPressure ?? 0).toFixed(1)} bar`} 
            icon={<Check size={isPrint ? 12 : 18} />} 
            color={summary.endPressure < 0 ? "red" : "green"}
            isPrint={isPrint}
          />
        )}
        <StatCard 
          title={settings.useMaxFlowModel ? "Max. Volumenstrom" : "Volumenstrom"} 
          value={`${settings.useMaxFlowModel ? (summary.maxFlow || 0) : flowRate} l/min`} 
          icon={<PumpIcon size={isPrint ? 12 : 18} />} 
          color={summary.anyPumpOverloaded ? "amber" : "blue"}
          isPrint={isPrint}
        />
        <StatCard 
          title="Distanz" 
          value={formatDist(summary.totalDistance)} 
          icon={<Navigation size={isPrint ? 12 : 18} />} 
          color="blue"
          isPrint={isPrint}
        />
        <StatCard 
          title="Höhendiff." 
          value={`${summary.totalElevationDiff} m`} 
          icon={<TrendingUp size={isPrint ? 12 : 18} />} 
          color="blue"
          isPrint={isPrint}
        />
        <StatCard 
          title="Druckverlust" 
          value={`${summary.totalPressureLoss} bar`} 
          icon={<ArrowDownRight size={isPrint ? 12 : 18} />} 
          color={(summary.anyNegativePressure || summary.anyHighPressure) ? "red" : "blue"}
          isPrint={isPrint}
        />
        <StatCard 
          title="Druck bei Nullförderung" 
          value={`${(summary.maxStaticPressure ?? 0).toFixed(1)} bar`} 
          icon={<AlertTriangle size={isPrint ? 12 : 18} />} 
          color={summary.anyHighStaticPressure ? "red" : "blue"}
          isPrint={isPrint}
        />
        <StatCard 
          title="Korndurchlass" 
          value={`${summary.minGrainSize} mm`} 
          icon={<Filter size={isPrint ? 12 : 18} />} 
          color={summary.anyGrainSizeWarning ? "amber" : "blue"}
          isPrint={isPrint}
        />
        <StatCard 
          title="E. Leistung" 
          value={`${summary.totalPower} kW`} 
          icon={<Zap size={isPrint ? 12 : 18} />} 
          color="blue"
          isPrint={isPrint}
        />
      </div>

      {summary.anyPumpOverloaded && !isPrint && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-amber-900">Warnung: Pumpen-Überlastung</p>
            <p className="text-xs text-amber-700">Mindestens eine Pumpe wird außerhalb ihrer spezifizierten Kennlinie (über Qmax) betrieben. Dies kann zu Schäden oder ungenauen Ergebnissen führen.</p>
          </div>
        </div>
      )}

      {summary.anyGrainSizeWarning && !isPrint && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <Filter className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-amber-900">Warnung: Korndurchlass-Engpass</p>
            <p className="text-xs text-amber-700">Eine Verstärkerpumpe hat einen kleineren Korndurchlass als die Startpumpe, ohne dass ein Pufferbecken dazwischen geschaltet ist. Es besteht Verstopfungsgefahr.</p>
          </div>
        </div>
      )}

      {summary.anyNegativePressure && !isPrint && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-red-900">Warnung: Negativer Druck (Unterdruck)</p>
            <p className="text-xs text-red-700">In mindestens einem Schlauchabschnitt fällt der Druck unter 0 bar. Dies führt zum Kollabieren der Schläuche und zum Abriss des Förderstroms. Erhöhen Sie den Startdruck oder fügen Sie eine Verstärkerpumpe hinzu.</p>
          </div>
        </div>
      )}

      {summary.anyHighPressure && !isPrint && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-red-900">Warnung: Zu hoher Betriebsdruck</p>
            <p className="text-xs text-red-700">In mindestens einem Abschnitt wird der zulässige Betriebsdruck der Pumpe oder des Schlauchs überschritten.</p>
          </div>
        </div>
      )}

      {summary.anyHighStaticPressure && !isPrint && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="text-sm font-bold text-amber-900">Warnung: Zu hoher Druck bei Nullförderung</p>
            <p className="text-xs text-amber-700">Wenn alle Pumpen laufen, aber die Strecke am Ende geschlossen ist (z.B. durch Verstopfung, geschlossenes Ventil oder Überfahren des Schlauchs), würde der Druck die Belastungsgrenzen überschreiten.</p>
          </div>
        </div>
      )}

      {/* Large Chart - Full Width */}
      <div className={cn(
        "bg-white p-4 rounded-3xl shadow-sm border border-slate-200 relative",
        isPrint && "rounded-none border-slate-100 p-2"
      )}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 min-h-[64px] sm:min-h-[48px]">
          <h3 className="font-bold text-slate-800">Druck-/ Höhenverlauf</h3>
          <div className="w-full sm:w-auto">
            {activePoint && !isPrint ? (
              <div className="grid grid-cols-2 sm:flex items-center gap-x-6 gap-y-2 sm:gap-4 bg-slate-50 p-3 sm:px-4 sm:py-2 rounded-2xl border border-slate-100">
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Distanz</span>
                  <span className="text-xs font-bold text-slate-900">{formatDist(activePoint.distance)}</span>
                </div>
                <div className="hidden sm:block h-6 w-px bg-slate-200 mx-1" />
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[9px] sm:text-[10px] font-bold text-blue-500 uppercase tracking-widest">Druck</span>
                  <span className="text-xs font-bold text-blue-600">{(activePoint.pressure ?? 0).toFixed(1)} bar</span>
                </div>
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[9px] sm:text-[10px] font-bold text-orange-500 uppercase tracking-widest">P-Stat</span>
                  <span className="text-xs font-bold text-orange-600">{(activePoint.pressureZeroFlow ?? 0).toFixed(1)} bar</span>
                </div>
                <div className="flex flex-col items-start sm:items-end">
                  <span className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Höhe</span>
                  <span className="text-xs font-bold text-slate-700">{activePoint.elevation.toFixed(1)} m</span>
                </div>
              </div>
            ) : !isPrint && (
              <div className="text-[10px] font-bold text-slate-300 uppercase tracking-widest italic px-1">
                Hover für Details
              </div>
            )}
          </div>
        </div>
        <div className={cn("w-full", isPrint ? "h-[350px]" : "h-80")}>
          {isPrint ? (
            <LineChart 
              width={750} 
              height={350}
              data={elevationData} 
              margin={{ top: 30, right: 40, left: 40, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />
              <XAxis 
                type="number"
                dataKey="distance" 
                ticks={xTicks}
                domain={[0, xTicks[xTicks.length - 1]]}
                tickFormatter={(val) => `${Math.round(val)}`}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                minTickGap={30}
              >
                <Label 
                  value="m" 
                  position="insideRight" 
                  offset={-10} 
                  dy={10} 
                  fontSize={10} 
                  fill="#94a3b8" 
                  fontWeight="bold"
                />
              </XAxis>
              <YAxis 
                ticks={yTicks}
                tickFormatter={(val) => `${Math.round(val)}`}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                domain={[yMin, yMax]}
                minTickGap={10}
                yAxisId="pressure"
                width={45}
              >
                <Label 
                  value="bar" 
                  position="top" 
                  offset={15} 
                  fontSize={10} 
                  fill="#94a3b8" 
                  fontWeight="bold"
                />
              </YAxis>
              <YAxis 
                orientation="right"
                ticks={eTicks}
                tickFormatter={(val) => `${Math.round(val)}`}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                domain={[eMin, eMax]}
                minTickGap={10}
                yAxisId="elevation"
                width={40}
              >
                <Label 
                  value="m" 
                  position="top" 
                  offset={15} 
                  fontSize={10} 
                  fill="#94a3b8" 
                  fontWeight="bold"
                />
              </YAxis>
              <Line 
                type="linear" 
                dataKey="pressure" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={false}
                yAxisId="pressure"
                name="Betriebsdruck"
                isAnimationActive={false}
              />
              <Line 
                type="linear" 
                dataKey="elevation" 
                stroke="#94a3b8" 
                strokeWidth={2}
                dot={false}
                yAxisId="elevation"
                name="Höhe"
                isAnimationActive={false}
              />
            </LineChart>
          ) : (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <LineChart 
                data={elevationData} 
                margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                onMouseMove={(e: any) => {
                  if (e && e.activeTooltipIndex !== undefined && e.activeTooltipIndex !== null) {
                    const point = elevationData[e.activeTooltipIndex];
                    if (point) setActivePoint(point);
                  }
                }}
                onMouseLeave={() => setActivePoint(null)}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <ReferenceLine y={0} stroke="#64748b" strokeWidth={2} />
                <XAxis 
                  type="number"
                  dataKey="distance" 
                  ticks={xTicks}
                  domain={[0, xTicks[xTicks.length - 1]]}
                  tickFormatter={(val) => `${Math.round(val)}`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={30}
                >
                  <Label 
                    value="m" 
                    position="insideRight" 
                    offset={-10} 
                    dy={10} 
                    fontSize={10} 
                    fill="#94a3b8" 
                    fontWeight="bold"
                  />
                </XAxis>
                <YAxis 
                  ticks={yTicks}
                  tickFormatter={(val) => `${Math.round(val)}`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[yMin, yMax]}
                  minTickGap={10}
                  yAxisId="pressure"
                  width={35}
                >
                  <Label 
                    value="bar" 
                    position="top" 
                    offset={10} 
                    fontSize={10} 
                    fill="#94a3b8" 
                    fontWeight="bold"
                  />
                </YAxis>
                <YAxis 
                  orientation="right"
                  ticks={eTicks}
                  tickFormatter={(val) => `${Math.round(val)}`}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  axisLine={false}
                  tickLine={false}
                  domain={[eMin, eMax]}
                  minTickGap={10}
                  yAxisId="elevation"
                  width={30}
                >
                  <Label 
                    value="m" 
                    position="top" 
                    offset={10} 
                    fontSize={10} 
                    fill="#94a3b8" 
                    fontWeight="bold"
                  />
                </YAxis>
                <Tooltip 
                  content={<TooltipSync setActivePoint={setActivePoint} />}
                  cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '5 5' }}
                />
                <Line 
                  type="linear" 
                  dataKey="pressure" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  dot={false}
                  yAxisId="pressure"
                  name="Betriebsdruck"
                  isAnimationActive={false}
                />
                <Line 
                  type="linear" 
                  dataKey="elevation" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  dot={false}
                  yAxisId="elevation"
                  name="Höhe"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bottom Section: Map and Component List */}
      <div className={cn(
        "grid gap-4",
        isPrint ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2"
      )}>
        {/* Map Preview */}
        <div 
          id="map-capture-container"
          className={cn(
            "bg-white p-1 shadow-sm border border-slate-200 overflow-hidden relative",
            isPrint ? "rounded-none border-slate-100 w-[750px] h-[350px]" : "rounded-3xl aspect-video lg:aspect-square"
          )}
        >
          <MapContainer 
            key={isPrint ? `print-map-${route.id}` : `analysis-map-${route.id}`}
            center={[waypoints[0].lat, waypoints[0].lng]} 
            zoom={13} 
            maxZoom={19}
            className="h-full w-full z-0"
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
            touchZoom={false}
            boxZoom={false}
            keyboard={false}
          >
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              maxZoom={19}
              maxNativeZoom={18}
              detectRetina={true}
            />
            <MapController currentView="analysis" waypoints={waypoints} isPrint={isPrint} />
            {waypoints.map((wp, index) => {
              const hasPump = !!wp.pumpId || index === 0;
              const isBasin = !!wp.isBufferBasin;
              const hasHoseOverride = !!wp.hoseOverridden;
              if (!hasPump && !isBasin && !hasHoseOverride) return null;
              return (
                <Marker 
                  key={`analysis-wp-${wp.id}`} 
                  position={[wp.lat, wp.lng]}
                  icon={createWaypointIcon(index, hasPump, hasHoseOverride)}
                  interactive={false}
                />
              );
            })}
            <RoutePolylines elevationData={elevationData} waypoints={waypoints} isDataStale={isElevationStale} />
          </MapContainer>
        </div>

        {/* Component List */}
        <div className={cn(
          "bg-white p-6 shadow-sm border border-slate-200",
          isPrint ? "rounded-none border-slate-100 p-4" : "rounded-3xl"
        )}>
          <h3 className="font-bold text-slate-800 text-lg mb-6">
            Komponenten
          </h3>
          <div className="space-y-3">
            {(() => {
              const items: React.ReactNode[] = [];
              let currentHoses: { hose: HoseSize, count: number, dist: number, frictionLoss: number, staticLoss: number }[] = [];

              waypoints.forEach((wp, idx) => {
                const pump = settings.pumps.find((p: any) => p.id === wp.pumpId);
                const results = waypointResults[idx] || { 
                  inletPressure: 0, 
                  outletPressure: 0, 
                  staticPressure: 0,
                  pumpGain: 0,
                  segmentFrictionLoss: 0, 
                  segmentStaticLoss: 0 
                } as WaypointResult;

                if (pump || wp.isBufferBasin || idx === waypoints.length - 1 || (idx === 0 && route.startPressure > 0)) {
                  if (currentHoses.length > 0) {
                    const grouped: typeof currentHoses = [];
                    currentHoses.forEach(h => {
                      const existing = grouped.find(g => g.hose.id === h.hose.id && g.count === h.count);
                      if (existing) {
                        existing.dist += h.dist;
                        existing.frictionLoss += h.frictionLoss;
                        existing.staticLoss += h.staticLoss;
                      } else {
                        grouped.push({ ...h });
                      }
                    });

                    grouped.forEach((h, hIdx) => {
                      const isNegative = waypointResults[idx - 1]?.isNegativePressure;
                      const isHighPressure = waypointResults[idx - 1]?.isHighPressure;
                      const isHighStatic = waypointResults[idx - 1]?.isHighStaticPressure;
                      const itemId = `hose-${idx}-${hIdx}`;
                      const isSelected = selectedId === itemId;

                      items.push(
                        <div 
                          key={itemId} 
                          onClick={() => !isPrint && setSelectedId(isSelected ? null : itemId)}
                          className={cn(
                            "flex flex-col gap-1 p-3 rounded-2xl border",
                            isSelected ? "bg-cyan-100 border-cyan-300 shadow-sm" : "bg-cyan-50 border-cyan-100 hover:border-cyan-200",
                            !isPrint && "cursor-pointer"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-bold text-black">
                                  <span className="inline-block mr-1">{formatDist(h.dist)}</span>
                                  {h.count > 1 && <span className="inline-block mr-1">{h.count}x</span>}
                                  <span className="inline-block">{h.hose.name}</span>
                                </p>
                                <div className="flex gap-1 flex-wrap justify-end">
                                  {!isPrint && isNegative && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 uppercase bg-red-100 px-1.5 py-0.5 rounded">
                                      <AlertTriangle size={10} /> Unterdruck!
                                    </span>
                                  )}
                                  {!isPrint && isHighPressure && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 uppercase bg-red-100 px-1.5 py-0.5 rounded">
                                      <AlertTriangle size={10} /> P-Max!
                                    </span>
                                  )}
                                  {!isPrint && isHighStatic && (
                                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                                      <AlertTriangle size={10} /> P-Stat!
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          {isSelected && !isPrint && (
                            <div className="mt-1 pt-1 border-t border-cyan-200/50 space-y-0.5">
                              <p className="text-[10px] text-cyan-700 font-bold">
                                Gesamtverlust: -{(h.frictionLoss + h.staticLoss).toFixed(2)} bar
                              </p>
                              <div className="flex gap-3 text-[9px] text-cyan-600 font-medium">
                                <span>Reibung: -{h.frictionLoss.toFixed(2)} bar</span>
                                <span>Höhe: {h.staticLoss >= 0 ? '-' : '+'}{Math.abs(h.staticLoss).toFixed(2)} bar</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    });
                    currentHoses = [];
                  }
                }

                if (wp.isBufferBasin && pump) {
                  const itemId = `combined-${wp.id}`;
                  const isSelected = selectedId === itemId;
                  items.push(
                    <div 
                      key={itemId} 
                      onClick={() => !isPrint && setSelectedId(isSelected ? null : itemId)}
                      className={cn(
                        "flex flex-col gap-1 p-3 rounded-2xl border",
                        isSelected ? "bg-blue-100 border-blue-300 shadow-sm" : "bg-blue-50 border-blue-100 hover:border-blue-200",
                        !isPrint && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-black">
                              <span className="inline-block mr-1">Pufferbecken &</span>
                              {wp.pumpCount && wp.pumpCount > 1 && <span className="inline-block mr-1">{wp.pumpCount}x</span>}
                              <span className="inline-block">{pump.manufacturer} {pump.model}</span>
                            </p>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {!isPrint && results.isHighPressure && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 uppercase bg-red-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle size={10} /> P-Max!
                                </span>
                              )}
                              {!isPrint && results.isHighStaticPressure && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle size={10} /> P-Stat!
                                </span>
                              )}
                              {!isPrint && results.isOverloaded && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle size={10} /> Überlastet
                                </span>
                              )}
                              {!isPrint && results.isGrainSizeWarning && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                                  <Filter size={10} /> Korn!
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {isSelected && !isPrint && (
                        <div className="mt-1 pt-1 border-t border-blue-200/50 space-y-1">
                          <div className="flex gap-3 text-[10px] font-bold text-blue-700">
                            <span>Eingang: {(results.inletPressure ?? 0).toFixed(1)} bar</span>
                            <span>Ausgang: {(results.outletPressure ?? 0).toFixed(1)} bar</span>
                          </div>
                          <div className="flex gap-3 text-[9px] text-blue-600 font-medium">
                            <span>Druckerhöhung: +{(results.pumpGain ?? 0).toFixed(1)} bar</span>
                            <span>Druck bei Nullförderung: {(results.staticPressure ?? 0).toFixed(1)} bar</span>
                          </div>
                          <div className="flex gap-3 text-[9px] text-blue-500 italic">
                            <span>Korndurchlass: {pump.grainSize} mm</span>
                            <span>Leistung: {pump.power} kW</span>
                            {(() => {
                              const curve = wp.curveId ? pump.curves?.find(c => c.id === wp.curveId) : pump.curves?.find(c => c.active);
                              return curve ? <span>Drehzahl: {curve.name}</span> : null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } else if (wp.isBufferBasin) {
                  const itemId = `basin-${wp.id}`;
                  const isSelected = selectedId === itemId;
                  items.push(
                    <div 
                      key={itemId} 
                      onClick={() => !isPrint && setSelectedId(isSelected ? null : itemId)}
                      className={cn(
                        "flex flex-col gap-1 p-3 rounded-2xl border",
                        isSelected ? "bg-blue-100 border-blue-300 shadow-sm" : "bg-blue-50 border-blue-100 hover:border-blue-200",
                        !isPrint && "cursor-pointer"
                      )}
                    >
                      <div className="flex-1">
                        <p className="text-xs font-bold text-black">Pufferbecken</p>
                      </div>
                      {isSelected && !isPrint && (
                        <div className="mt-1 pt-1 border-t border-blue-200/50 space-y-0.5">
                          <p className="text-[10px] text-blue-700 font-bold">
                            Eingang: {(results.inletPressure ?? 0).toFixed(1)} bar
                          </p>
                          <p className="text-[9px] text-blue-600 font-medium">
                            Druck bei Nullförderung: {(results.staticPressure ?? 0).toFixed(1)} bar
                          </p>
                        </div>
                      )}
                    </div>
                  );
                } else if (pump) {
                  const itemId = `pump-${wp.id}`;
                  const isSelected = selectedId === itemId;
                  items.push(
                    <div 
                      key={itemId} 
                      onClick={() => !isPrint && setSelectedId(isSelected ? null : itemId)}
                      className={cn(
                        "flex flex-col gap-1 p-3 rounded-2xl border",
                        isSelected ? "bg-blue-100 border-blue-300 shadow-sm" : "bg-blue-50 border-blue-100 hover:border-blue-200",
                        !isPrint && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-black">
                              {wp.pumpCount && wp.pumpCount > 1 && <span className="inline-block mr-1">{wp.pumpCount}x</span>}
                              <span className="inline-block">{pump.manufacturer} {pump.model}</span>
                            </p>
                            <div className="flex gap-1 flex-wrap justify-end">
                              {!isPrint && results.isHighPressure && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-red-600 uppercase bg-red-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle size={10} /> P-Max!
                                </span>
                              )}
                              {!isPrint && results.isHighStaticPressure && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle size={10} /> P-Stat!
                                </span>
                              )}
                              {!isPrint && results.isOverloaded && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                                  <AlertTriangle size={10} /> Überlastet
                                </span>
                              )}
                              {!isPrint && results.isGrainSizeWarning && (
                                <span className="flex items-center gap-1 text-[9px] font-bold text-amber-600 uppercase bg-amber-100 px-1.5 py-0.5 rounded">
                                  <Filter size={10} /> Korn!
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      {isSelected && !isPrint && (
                        <div className="mt-1 pt-1 border-t border-blue-200/50 space-y-1">
                          <div className="flex gap-3 text-[10px] font-bold text-blue-700">
                            <span>Eingang: {(results.inletPressure ?? 0).toFixed(1)} bar</span>
                            <span>Ausgang: {(results.outletPressure ?? 0).toFixed(1)} bar</span>
                          </div>
                          <div className="flex gap-3 text-[9px] text-blue-600 font-medium">
                            <span>Druckerhöhung: +{(results.pumpGain ?? 0).toFixed(1)} bar</span>
                            <span>Druck bei Nullförderung: {(results.staticPressure ?? 0).toFixed(1)} bar</span>
                          </div>
                          <div className="flex gap-3 text-[9px] text-blue-500 italic">
                            <span>Korndurchlass: {pump.grainSize} mm</span>
                            <span>Leistung: {pump.power} kW</span>
                            {(() => {
                              const curve = wp.curveId ? pump.curves?.find(c => c.id === wp.curveId) : pump.curves?.find(c => c.active);
                              return curve ? <span>Drehzahl: {curve.name}</span> : null;
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                } else if (idx === 0 && route.startPressure > 0) {
                  const itemId = `start-extraction-${wp.id}`;
                  const isSelected = selectedId === itemId;
                  items.push(
                    <div 
                      key={itemId} 
                      onClick={() => !isPrint && setSelectedId(isSelected ? null : itemId)}
                      className={cn(
                        "flex flex-col gap-1 p-3 rounded-2xl border",
                        isSelected ? "bg-blue-100 border-blue-300 shadow-sm" : "bg-blue-50 border-blue-100 hover:border-blue-200",
                        !isPrint && "cursor-pointer"
                      )}
                    >
                      <div className="flex-1">
                        <p className="text-xs font-bold text-black">Entnahmestelle ({route.startPressure.toFixed(1)} bar)</p>
                      </div>
                      {isSelected && !isPrint && (
                        <div className="mt-1 pt-1 border-t border-blue-200/50 space-y-0.5">
                          <p className="text-[10px] text-blue-700 font-bold">
                            Druck: {route.startPressure.toFixed(1)} bar
                          </p>
                          <p className="text-[9px] text-blue-600 font-medium">
                            Druck bei Nullförderung: {route.startPressure.toFixed(1)} bar
                          </p>
                        </div>
                      )}
                    </div>
                  );
                } else if (idx === waypoints.length - 1) {
                  const itemId = `end-${wp.id}`;
                  const isSelected = selectedId === itemId;
                  items.push(
                    <div 
                      key={itemId} 
                      onClick={() => !isPrint && setSelectedId(isSelected ? null : itemId)}
                      className={cn(
                        "flex flex-col gap-1 p-3 rounded-2xl border",
                        isSelected ? "bg-green-100 border-green-300 shadow-sm" : "bg-green-50 border-green-100 hover:border-green-200",
                        !isPrint && "cursor-pointer"
                      )}
                    >
                      <div className="flex-1">
                        <p className="text-xs font-bold text-black">Abgabestelle</p>
                      </div>
                      {isSelected && !isPrint && (
                        <div className="mt-1 pt-1 border-t border-green-200/50 space-y-0.5">
                          <p className="text-[10px] text-green-700 font-bold">
                            Druck: {(results.inletPressure ?? 0).toFixed(1)} bar
                          </p>
                          <p className="text-[9px] text-green-600 font-medium">
                            Druck bei Nullförderung: {(results.staticPressure ?? 0).toFixed(1)} bar
                          </p>
                        </div>
                      )}
                    </div>
                  );
                }

                if (idx < waypoints.length - 1) {
                  const nextWp = waypoints[idx + 1];
                  const dist = L.latLng(wp.lat, wp.lng).distanceTo(L.latLng(nextWp.lat, nextWp.lng));
                  const hose = settings.hoses.find((h: any) => h.id === wp.hoseId) || settings.hoses[0];
                  const hoseCount = wp.hoseCount || 1;
                  currentHoses.push({ hose, count: hoseCount, dist, frictionLoss: results.segmentFrictionLoss, staticLoss: results.segmentStaticLoss });
                }
              });
              return items;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
