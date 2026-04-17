export interface CharacteristicCurve {
  id: string;
  name: string; // Speed/Drehzahl
  a2: number;
  a1: number;
  a0: number;
  maxFlow: number;
  active: boolean;
}

export interface Pump {
  id: string;
  manufacturer: string;
  model: string;
  type: string;
  driveType: 'Elektro' | 'Diesel' | 'Benzin';
  power: number; // kW
  grainSize: number; // mm
  maxCasingPressure: number; // bar
  curves: CharacteristicCurve[];
  enabled: boolean;
  isDefault?: boolean;
}

export interface HoseSize {
  id: string;
  name: string;
  diameter: number; // mm
  roughness: number; // Hazen-Williams C factor (e.g., 130)
  maxPressure: number; // bar
  enabled: boolean;
  isDefault?: boolean;
}

export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  elevation?: number;
  pumpId?: string;
  pumpCount?: number;
  curveId?: string;
  hoseId?: string;
  hoseCount?: number;
  hoseOverridden?: boolean;
  isBufferBasin?: boolean;
}

export interface ElevationData {
  distance: number;
  elevation: number;
  pressure: number; // Calculated pressure at this point
  pressureZeroFlow?: number; // Calculated pressure at zero flow (all pumps running, end closed)
  maxPressureLimit?: number; // Maximum allowed pressure at this point (pump casing or hose)
  lat: number;
  lng: number;
}

export interface RouteSummary {
  totalDistance: number;
  totalAscent: number;
  totalDescent: number;
  minElevation: number;
  maxElevation: number;
  totalPressureLoss: number;
  endPressure: number;
  totalElevationDiff: number;
  totalPower: number;
  minGrainSize: number;
  anyPumpOverloaded?: boolean;
  anyGrainSizeWarning?: boolean;
  anyNegativePressure?: boolean;
  anyHighPressure?: boolean;
  anyHighStaticPressure?: boolean;
  maxStaticPressure: number;
  maxFlow?: number;
  maxFlowSummary?: {
    endPressure: number;
    elevationData: ElevationData[];
    waypointResults: WaypointResult[];
    anyPumpOverloaded: boolean;
    anyNegativePressure: boolean;
    anyHighPressure: boolean;
    anyHighStaticPressure: boolean;
  };
}

export interface SavedRoute {
  id: string;
  name: string;
  date: string;
  waypoints: Waypoint[];
  flowRate: number;
  distance?: number;
  startPressure: number;
  summary?: RouteSummary;
  waypointResults?: WaypointResult[];
  elevationData?: ElevationData[];
  rawElevationData?: {distance: number, elevation: number, lat: number, lng: number}[];
  useMaxFlowModel?: boolean;
}

export interface WaypointResult {
  inletPressure: number;
  outletPressure: number;
  staticPressure: number;
  pumpGain?: number;
  segmentFrictionLoss: number;
  segmentStaticLoss: number;
  isOverloaded?: boolean;
  isGrainSizeWarning?: boolean;
  isNegativePressure?: boolean;
  isHighPressure?: boolean;
  isHighStaticPressure?: boolean;
}
