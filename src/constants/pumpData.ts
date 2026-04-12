import { Pump, HoseSize } from '../types';

export const sortPumps = (pumps: Pump[]) => {
  return [...pumps].sort((a, b) => {
    const mComp = a.manufacturer.localeCompare(b.manufacturer);
    if (mComp !== 0) return mComp;
    return a.model.localeCompare(b.model);
  });
};

export const sortHoses = (hoses: HoseSize[]) => {
  return [...hoses].sort((a, b) => {
    const dComp = a.diameter - b.diameter;
    if (dComp !== 0) return dComp;
    return a.name.localeCompare(b.name);
  });
};

export const DEFAULT_PUMPS: Pump[] = sortPumps([
  {
    id: 'atlas-copco-pas300mf',
    manufacturer: 'Atlas Copco',
    model: 'PAS 300MF',
    type: 'Trocken aufg. Pumpen',
    driveType: 'Diesel',
    power: 94,
    grainSize: 100,
    maxCasingPressure: 3,
    enabled: true,
    isDefault: true,
    curves: [
      { id: 'c1', name: '1200 rpm', a2: -3.3642E-09, a1: -1.4695E-05, a0: 1.5682E+00, maxFlow: 16500, active: true },
      { id: 'c2', name: '1350 rpm', a2: -3.2769E-09, a1: -1.5925E-05, a0: 1.9498E+00, maxFlow: 18500, active: false },
      { id: 'c3', name: '1500 rpm', a2: -3.3586E-09, a1: -1.8248E-05, a0: 2.4212E+00, maxFlow: 22500, active: false }
    ]
  },
  {
    id: 'boerger-fl1036',
    manufacturer: 'Börger',
    model: 'FL 1036',
    type: 'Trocken aufg. Pumpen',
    driveType: 'Diesel',
    power: 60,
    grainSize: 75,
    maxCasingPressure: 6,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'zwangsfördernd', a2: 0, a1: 0, a0: 3.0, maxFlow: 5000, active: true }]
  },
  {
    id: 'boerger-xl5350',
    manufacturer: 'Börger',
    model: 'XL 5350',
    type: 'Trocken aufg. Pumpen',
    driveType: 'Diesel',
    power: 130,
    grainSize: 100,
    maxCasingPressure: 2.5,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'zwangsfördernd', a2: 0, a1: 0, a0: 2.0, maxFlow: 25000, active: true }]
  },
  {
    id: 'dia-avs650ts',
    manufacturer: 'DIA Pumpen',
    model: 'AVS 650 TS',
    type: 'Trocken aufg. Pumpen',
    driveType: 'Diesel',
    power: 94,
    grainSize: 125,
    maxCasingPressure: 5,
    enabled: true,
    isDefault: true,
    curves: [
      { id: 'c1', name: '1500 rpm', a2: -1.2483E-24, a1: -5.8907E-05, a0: 2.8603E+00, maxFlow: 15000, active: false },
      { id: 'c2', name: '1600 rpm', a2: 1.4258E-24, a1: -6.9158E-05, a0: 3.2691E+00, maxFlow: 16000, active: false },
      { id: 'c3', name: '1800 rpm', a2: 1.0562E-24, a1: -9.3730E-05, a0: 4.1674E+00, maxFlow: 18000, active: false },
      { id: 'c4', name: '2100 rpm', a2: -4.0703E-24, a1: -9.9700E-05, a0: 5.1286E+00, maxFlow: 20000, active: true }
    ]
  },
  {
    id: 'flygt-2125mt',
    manufacturer: 'Flygt',
    model: '2125 MT',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 8,
    grainSize: 8,
    maxCasingPressure: 10,
    enabled: false,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: -9.7489E-10, a1: -6.7021E-04, a0: 2.7937E+00, maxFlow: 3300, active: true }]
  },
  {
    id: 'flygt-2640k234mt',
    manufacturer: 'Flygt',
    model: '2640-K234 MT',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 5.6,
    grainSize: 10,
    maxCasingPressure: 5,
    enabled: false,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 2.7885E-22, a1: -1.2301E-03, a0: 2.8935E+00, maxFlow: 2750, active: true }]
  },
  {
    id: 'flygt-2660k234mt',
    manufacturer: 'Flygt',
    model: '2660-K234 MT',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 10,
    grainSize: 10,
    maxCasingPressure: 5,
    enabled: false,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 1.7871E-24, a1: 7.8718E-07, a0: 3.5674E+00, maxFlow: 4250, active: true }]
  },
  {
    id: 'flygt-2670b226mt',
    manufacturer: 'Flygt',
    model: '2670-B226 MT',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 18,
    grainSize: 12,
    maxCasingPressure: 5,
    enabled: false,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 1.6296E-23, a1: -6.2354E-04, a0: 3.9986E+00, maxFlow: 6000, active: true }]
  },
  {
    id: 'flygt-2860b226mt',
    manufacturer: 'Flygt',
    model: '2860-B226 MT',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 10,
    grainSize: 10,
    maxCasingPressure: 7.5,
    enabled: false,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: -1.4829E-07, a1: -3.2418E-04, a0: 3.3176E+00, maxFlow: 3300, active: true }]
  },
  {
    id: 'hannibal-nrs150-315',
    manufacturer: 'Hannibal',
    model: 'NRS150-315',
    type: 'Trocken aufg. Pumpen',
    driveType: 'Diesel',
    power: 38,
    grainSize: 70,
    maxCasingPressure: 5,
    enabled: true,
    isDefault: true,
    curves: [
      { id: 'c1', name: '1500 rpm', a2: 9.3570E-24, a1: -3.4860E-04, a0: 3.2237E+00, maxFlow: 7500, active: true },
      { id: 'c2', name: '1670 rpm', a2: -3.9490E-23, a1: -4.1478E-04, a0: 4.0184E+00, maxFlow: 4170, active: false }
    ]
  },
  {
    id: 'hytrans-hydrosub150hf',
    manufacturer: 'Hytrans',
    model: 'HydroSub 150, High flow',
    type: 'Tauchpumpe',
    driveType: 'Diesel',
    power: 150,
    grainSize: 0,
    maxCasingPressure: 16,
    enabled: false,
    isDefault: true,
    curves: [
      { id: 'c1', name: '1400 rpm', a2: 1.5035E-24, a1: -2.5557E-05, a0: 5.1855E+00, maxFlow: 8000, active: false },
      { id: 'c2', name: '1800 rpm', a2: -3.4669E-24, a1: 8.1319E-05, a0: 8.0823E+00, maxFlow: 8500, active: false },
      { id: 'c3', name: '2200 rpm', a2: 1.3868E-23, a1: -3.0758E-04, a0: 1.1469E+01, maxFlow: 8500, active: true }
    ]
  },
  {
    id: 'mast-atp10r',
    manufacturer: 'Mast',
    model: 'ATP10 (R)',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 2,
    grainSize: 65,
    maxCasingPressure: 8,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 2.4142E-22, a1: -3.0636E-04, a0: 1.4001E+00, maxFlow: 1200, active: true }]
  },
  {
    id: 'mast-atp15r',
    manufacturer: 'Mast',
    model: 'ATP15 (R)',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 3.1,
    grainSize: 65,
    maxCasingPressure: 8,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 2.2650E-22, a1: -9.7879E-04, a0: 1.9778E+00, maxFlow: 1600, active: true }]
  },
  {
    id: 'mast-atp20r',
    manufacturer: 'Mast',
    model: 'ATP20 (R)',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 2.9,
    grainSize: 80,
    maxCasingPressure: 8,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: -1.8516E-23, a1: -2.4858E-04, a0: 1.3914E+00, maxFlow: 2500, active: true }]
  },
  {
    id: 'mast-tp15-1',
    manufacturer: 'Mast',
    model: 'TP15-1',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 5.3,
    grainSize: 15,
    maxCasingPressure: 8,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 0, a1: -7.0356E-04, a0: 2.1039E+00, maxFlow: 2400, active: true }]
  },
  {
    id: 'mast-tp4-1',
    manufacturer: 'Mast',
    model: 'TP4-1',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 1.8,
    grainSize: 8,
    maxCasingPressure: 8,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 0, a1: -7.8933E-04, a0: 1.9976E+00, maxFlow: 700, active: true }]
  },
  {
    id: 'mast-tp8-1',
    manufacturer: 'Mast',
    model: 'TP8-1',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 3.3,
    grainSize: 10,
    maxCasingPressure: 8,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 4.7652E-22, a1: -7.8933E-04, a0: 1.9976E+00, maxFlow: 1300, active: true }]
  },
  {
    id: 'ziegler-up4',
    manufacturer: 'Ziegler',
    model: 'Ultra Power 4 (PFPN10-1500)',
    type: 'Trocken aufg. Pumpen',
    driveType: 'Benzin',
    power: 50,
    grainSize: 6,
    maxCasingPressure: 17,
    enabled: false,
    isDefault: true,
    curves: [{ id: 'c1', name: 'Standard', a2: -1.7809E-07, a1: 1.4483E-04, a0: 1.6341E+01, maxFlow: 2200, active: true }]
  },
  {
    id: 'sulzer-absj205nd',
    manufacturer: 'Sulzer',
    model: 'ABS J 205 ND',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 21,
    grainSize: 8,
    maxCasingPressure: 10,
    enabled: false,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: -6.3988E-08, a1: -2.5562E-06, a0: 3.0025E+00, maxFlow: 6000, active: true }]
  },
  {
    id: 'spechtenhauser-chiemseea',
    manufacturer: 'Spechtenhauser',
    model: 'Chiemsee A',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 3.2,
    grainSize: 80,
    maxCasingPressure: 7.5,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: -1.6296E-23, a1: -6.3471E-04, a0: 1.4294E+00, maxFlow: 2500, active: true }]
  },
  {
    id: 'spechtenhauser-chiemseeb',
    manufacturer: 'Spechtenhauser',
    model: 'Chiemsee B',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 3.2,
    grainSize: 70,
    maxCasingPressure: 7.5,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: -7.4063E-23, a1: -5.2280E-04, a0: 1.4502E+00, maxFlow: 1800, active: true }]
  },
  {
    id: 'spechtenhauser-minich1600d',
    manufacturer: 'Spechtenhauser',
    model: 'Mini-Ch. 1600 D',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 2.7,
    grainSize: 65,
    maxCasingPressure: 7.5,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 7.9790E-23, a1: -8.9905E-04, a0: 1.8572E+00, maxFlow: 1600, active: true }]
  },
  {
    id: 'wilo-ks220n',
    manufacturer: 'Wilo',
    model: 'KS220N',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 24.5,
    grainSize: 10,
    maxCasingPressure: 7,
    enabled: false,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: -1.3526E-23, a1: -1.6260E-04, a0: 3.1702E+00, maxFlow: 5800, active: true }]
  },
  {
    id: 'wilo-tp100e210-52',
    manufacturer: 'Wilo',
    model: 'TP100 E210/52',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 6.7,
    grainSize: 95,
    maxCasingPressure: 5,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 2.9438E-23, a1: -6.3204E-04, a0: 1.5479E+00, maxFlow: 2750, active: true }]
  },
  {
    id: 'wilo-tp100e230-70',
    manufacturer: 'Wilo',
    model: 'TP100 E230/70',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 8.8,
    grainSize: 95,
    maxCasingPressure: 5,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 7.5314E-23, a1: -6.6265E-04, a0: 1.9210E+00, maxFlow: 2900, active: true }]
  },
  {
    id: 'wilo-tp100e250-84',
    manufacturer: 'Wilo',
    model: 'TP100 E250/84',
    type: 'Tauchpumpe',
    driveType: 'Elektro',
    power: 10.6,
    grainSize: 95,
    maxCasingPressure: 5,
    enabled: true,
    isDefault: true,
    curves: [{ id: 'c1', name: 'fest', a2: 0, a1: -6.0327E-04, a0: 2.1011E+00, maxFlow: 3000, active: true }]
  },
]);

export const DEFAULT_HOSES: HoseSize[] = sortHoses([
  { id: 'hose-c-52', name: 'C-52', diameter: 52, roughness: 135, maxPressure: 7.5, enabled: true, isDefault: true },
  { id: 'hose-b-75', name: 'B-75', diameter: 75, roughness: 135, maxPressure: 7.5, enabled: true, isDefault: true },
  { id: 'hose-a-110', name: 'A-110', diameter: 110, roughness: 135, maxPressure: 7.5, enabled: true, isDefault: true },
  { id: 'hose-f-150', name: 'F-150', diameter: 150, roughness: 135, maxPressure: 7.5, enabled: true, isDefault: true },
  { id: 'hose-g-200', name: 'G-200', diameter: 200, roughness: 135, maxPressure: 7.5, enabled: true, isDefault: true },
]);
