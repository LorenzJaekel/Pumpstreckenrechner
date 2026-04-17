import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toJpeg } from 'html-to-image';
import L from 'leaflet';
import { SavedRoute, Waypoint } from '../types';

interface ExportPDFOptions {
  target: HTMLElement;
  exportRoute?: SavedRoute;
  savedRoutes: SavedRoute[];
  waypoints: Waypoint[];
  settings: any;
  onStart?: () => void;
  onComplete?: () => void;
  onError?: (error: any) => void;
}

export const exportToPDF = async ({
  target,
  exportRoute,
  savedRoutes,
  waypoints,
  settings,
  onStart,
  onComplete,
  onError
}: ExportPDFOptions) => {
  if (!target) {
    console.error('PDF Export: Target element not found');
    return;
  }
  
  onStart?.();
  try {
    // 1. Identify the route data
    const route = exportRoute;
    if (!route || !route.summary) {
      throw new Error("Keine Routendaten gefunden.");
    }

    console.log('PDF Export: Starting capture for route:', route.name);

    // 2. Capture Map and Chart as images
    // We look for the specific containers within the target
    const chartContainer = target.querySelector('.recharts-wrapper')?.parentElement;
    const mapContainer = target.querySelector('#map-capture-container') || target.querySelector('.leaflet-container');

    let chartDataUrl = '';
    let mapDataUrl = '';

    // Wait for components to settle
    await new Promise(resolve => setTimeout(resolve, 3000));

    if (chartContainer) {
      try {
        console.log('PDF Export: Capturing chart...');
        chartDataUrl = await toJpeg(chartContainer as HTMLElement, { 
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          quality: 0.9,
          cacheBust: true,
          skipFonts: true
        });
      } catch (chartError) {
        console.error('PDF Export: Error capturing chart:', chartError);
      }
    }

    if (mapContainer) {
      try {
        console.log('PDF Export: Capturing map...');
        // Wait longer for map tiles and fitBounds to finish
        await new Promise(resolve => setTimeout(resolve, 2500));
        mapDataUrl = await toJpeg(mapContainer as HTMLElement, { 
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          quality: 0.9,
          cacheBust: true,
          skipFonts: true
        });
      } catch (mapError) {
        console.error('PDF Export: Error capturing map:', mapError);
      }
    }

    // 3. Initialize PDF
    console.log('PDF Export: Initializing PDF document...');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);
    let currentY = 20;

    // 4. Header (Vector)
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text(route.name || 'Pumpstrecken-Auswertung', margin, currentY);
    currentY += 10;

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 116, 139); // Slate-500
    pdf.text('Detaillierte Statistiken und Analysen der geplanten Pumpstrecke.', margin, currentY);
    
    // Date and Source on the right
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.text('DATUM', pageWidth - margin, currentY - 5, { align: 'right' });
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(15, 23, 42); // Slate-900
    pdf.text(new Date().toLocaleDateString('de-DE'), pageWidth - margin, currentY, { align: 'right' });
    currentY += 15;

    // 5. Stats Grid (Vector)
    const isMaxFlow = route.useMaxFlowModel;
    const stats = [
      { label: isMaxFlow ? 'MAX. VOLUMENSTROM' : 'ABGABEDRUCK', value: isMaxFlow ? `${(route.summary.maxFlow || 0)} l/min` : `${(route.summary.endPressure ?? 0).toFixed(1)} bar` },
      { label: isMaxFlow ? 'ABGABEDRUCK' : 'VOLUMENSTROM', value: isMaxFlow ? `${(route.summary.endPressure ?? 0).toFixed(1)} bar` : `${route.flowRate} l/min` },
      { label: 'DISTANZ', value: `${Math.round(route.summary.totalDistance)} m` },
      { label: 'HÖHENDIFF.', value: `${route.summary.totalElevationDiff} m` },
      { label: 'DRUCKVERLUST', value: `${route.summary.totalPressureLoss} bar` },
      { label: 'P-STAT MAX', value: `${(route.summary.maxStaticPressure ?? 0).toFixed(1)} bar` },
      { label: 'KORNDURCHLASS', value: `${route.summary.minGrainSize} mm` },
      { label: 'E. LEISTUNG', value: `${route.summary.totalPower} kW` }
    ];

    const colWidth = contentWidth / 4;
    stats.forEach((stat, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      const x = margin + (col * colWidth);
      const y = currentY + (row * 15);

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(148, 163, 184); // Slate-400
      pdf.text(stat.label, x, y);

      pdf.setFontSize(12);
      pdf.setTextColor(15, 23, 42); // Slate-900
      pdf.text(stat.value, x, y + 6);
    });
    currentY += 35;

    // 6. Chart Image (Full Width)
    if (chartDataUrl) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(15, 23, 42);
      pdf.text('Druck- / Höhenverlauf', margin, currentY);
      currentY += 5;
      
      try {
        // Get chart aspect ratio
        const chartImg = new Image();
        chartImg.src = chartDataUrl;
        await new Promise((resolve, reject) => { 
          chartImg.onload = resolve; 
          chartImg.onerror = reject;
          setTimeout(() => reject(new Error('Chart image load timeout')), 5000);
        });
        const chartAspectRatio = chartImg.height / chartImg.width;
        const chartHeight = contentWidth * chartAspectRatio;
        
        // Limit chart height to fit page
        const finalChartHeight = Math.min(chartHeight, 80);
        pdf.addImage(chartDataUrl, 'JPEG', margin, currentY, contentWidth, finalChartHeight, undefined, 'FAST');
        currentY += finalChartHeight + 15;
      } catch (chartImgError) {
        console.error('PDF Export: Error processing chart image for PDF:', chartImgError);
        const chartHeight = 60;
        pdf.addImage(chartDataUrl, 'JPEG', margin, currentY, contentWidth, chartHeight, undefined, 'FAST');
        currentY += chartHeight + 15;
      }
    }

    // 7. Map Image (Full Width)
    if (mapDataUrl) {
      if (currentY > pageHeight - 80) {
        pdf.addPage();
        currentY = 20;
      }

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Kartenansicht', margin, currentY);
      currentY += 5;
      
      try {
        // Get map aspect ratio
        const mapImg = new Image();
        mapImg.src = mapDataUrl;
        await new Promise((resolve, reject) => { 
          mapImg.onload = resolve; 
          mapImg.onerror = reject;
          // Timeout for image loading
          setTimeout(() => reject(new Error('Map image load timeout')), 5000);
        });
        const mapAspectRatio = mapImg.height / mapImg.width;
        const mapHeight = contentWidth * mapAspectRatio;
        
        // Limit map height to fit page - same as chart
        const finalMapHeight = Math.min(mapHeight, 80);
        pdf.addImage(mapDataUrl, 'JPEG', margin, currentY, contentWidth, finalMapHeight, undefined, 'FAST');
        currentY += finalMapHeight + 15;
      } catch (imgError) {
        console.error('PDF Export: Error processing map image for PDF:', imgError);
        pdf.setFontSize(8);
        pdf.setTextColor(239, 68, 68);
        pdf.text('Kartenansicht konnte nicht geladen werden.', margin, currentY);
        currentY += 10;
      }
    }

    // 8. Components Table
    if (currentY > pageHeight - 40) {
      pdf.addPage();
      currentY = 20;
    }

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(15, 23, 42);
    pdf.text('Detaillierte Komponentenliste', margin, currentY);
    currentY += 8;

    const tableRows: any[] = [];
    const allWarnings: { component: string, type: string, detail: string }[] = [];
    
    let currentHoses: { 
      name: string, 
      count: number, 
      dist: number, 
      frictionLoss: number, 
      staticLoss: number,
      isNegative: boolean,
      isHighPressure: boolean,
      isHighStatic: boolean
    }[] = [];

    route.waypoints.forEach((wp, idx) => {
      const results = route.waypointResults?.[idx];
      const pump = settings.pumps.find((p: any) => p.id === wp.pumpId);
      
      // If it's a "node" (Pump, Basin, Start with pressure, or End)
      const isNode = pump || wp.isBufferBasin || idx === route.waypoints.length - 1 || (idx === 0 && route.startPressure > 0);

      if (isNode) {
        // First, flush any accumulated hoses before this node
        if (currentHoses.length > 0) {
          const grouped: typeof currentHoses = [];
          currentHoses.forEach(h => {
            const existing = grouped.find(g => g.name === h.name && g.count === h.count);
            if (existing) {
              existing.dist += h.dist;
              existing.frictionLoss += h.frictionLoss;
              existing.staticLoss += h.staticLoss;
              existing.isNegative = existing.isNegative || h.isNegative;
              existing.isHighPressure = existing.isHighPressure || h.isHighPressure;
              existing.isHighStatic = existing.isHighStatic || h.isHighStatic;
            } else {
              grouped.push({ ...h });
            }
          });

          grouped.forEach(h => {
            const warnings: string[] = [];
            if (h.isNegative) {
              warnings.push('Unterdruck');
              allWarnings.push({ 
                component: `${h.count}x ${h.name}`, 
                type: 'Negativer Druck (Unterdruck)',
                detail: 'In mindestens einem Schlauchabschnitt fällt der Druck unter 0 bar. Dies führt zum Kollabieren der Schläuche und zum Abriss des Förderstroms. Erhöhen Sie den Startdruck oder fügen Sie eine Verstärkerpumpe hinzu.'
              });
            }
            if (h.isHighPressure) {
              warnings.push('P-Max');
              allWarnings.push({ 
                component: `${h.count}x ${h.name}`, 
                type: 'Maximaldruck überschritten',
                detail: 'Der zulässige Betriebsdruck des Schlauchs wird überschritten. Es besteht die Gefahr von Materialversagen oder Schlauchplatzern.'
              });
            }
            if (h.isHighStatic) {
              warnings.push('P-Stat');
              allWarnings.push({ 
                component: `${h.count}x ${h.name}`, 
                type: 'Statischer Druck zu hoch',
                detail: 'Der statische Druck (Nullförderhöhe) überschreitet die Belastungsgrenze. Kritisch beim Schließen der Leitung.'
              });
            }

            tableRows.push([
              `${h.count}x ${h.name}`,
              `${Math.round(h.dist)} m`,
              '-',
              '-',
              `-${(h.frictionLoss + h.staticLoss).toFixed(2)}`,
              warnings.join(', ')
            ]);
          });
          currentHoses = [];
        }

        // Then add the node itself
        if (idx === 0 && !pump && !wp.isBufferBasin) {
          tableRows.push([
            'Einspeisung',
            '-',
            '-',
            (route.startPressure || 0).toFixed(1),
            '-',
            ''
          ]);
        } else if (wp.isBufferBasin || pump) {
          const pumpCount = wp.pumpCount || 1;
          const pumpName = pump ? [pump.manufacturer, pump.model].filter(Boolean).join(' ') : 'Pumpe';
          const name = wp.isBufferBasin && pump 
            ? `Pufferbecken + ${pumpCount}x ${pumpName}`
            : wp.isBufferBasin ? 'Pufferbecken' : `${pumpCount}x ${pumpName}`;
          
          const warnings: string[] = [];
          if (results?.isOverloaded) {
            warnings.push('Überlast');
            allWarnings.push({ 
              component: name, 
              type: 'Pumpen-Überlastung',
              detail: 'Die Pumpe wird außerhalb ihrer Kennlinie betrieben. Dies kann zu Kavitation, Motorschäden oder unzureichender Förderleistung führen.'
            });
          }
          if (results?.isHighPressure) {
            warnings.push('P-Max');
            allWarnings.push({ 
              component: name, 
              type: 'Gehäusedruck zu hoch',
              detail: 'Der maximale Gehäusedruck der Pumpe wird überschritten. Gefahr von Dichtungsschäden oder Gehäusebruch.'
            });
          }
          if (results?.isHighStaticPressure) {
            warnings.push('P-Stat');
            allWarnings.push({ 
              component: name, 
              type: 'Statischer Druck kritisch',
              detail: 'Der statische Druck am Gehäuse ist zu hoch. Gefahr beim plötzlichen Stopp der Förderung.'
            });
          }
          if (results?.isGrainSizeWarning) {
            warnings.push('Korn');
            allWarnings.push({ 
              component: name, 
              type: 'Korndurchlass-Warnung',
              detail: 'Der Korndurchlass dieser Pumpe ist geringer als bei vorangegangenen Pumpen. Verstopfungsgefahr.'
            });
          }

          tableRows.push([
            name,
            '-',
            (results?.inletPressure ?? 0).toFixed(1),
            (results?.outletPressure ?? 0).toFixed(1),
            `+${(results?.pumpGain ?? 0).toFixed(1)}`,
            warnings.join(', ')
          ]);
        } else if (idx === route.waypoints.length - 1) {
          tableRows.push([
            'Ende / Abgabe',
            '-',
            (results?.inletPressure ?? 0).toFixed(1),
            '-',
            '-',
            ''
          ]);
        }
      }

      // Accumulate hose for the next segment
      if (idx < route.waypoints.length - 1) {
        const nextWp = route.waypoints[idx + 1];
        const nextResults = route.waypointResults?.[idx + 1];
        const dist = L.latLng(wp.lat, wp.lng).distanceTo(L.latLng(nextWp.lat, nextWp.lng));
        const hose = settings.hoses.find((h: any) => h.id === wp.hoseId) || { name: 'Standard' };
        
        currentHoses.push({
          name: hose.name,
          count: wp.hoseCount || 1,
          dist: dist,
          frictionLoss: nextResults?.segmentFrictionLoss || 0,
          staticLoss: nextResults?.segmentStaticLoss || 0,
          isNegative: !!nextResults?.isNegativePressure,
          isHighPressure: !!nextResults?.isHighPressure,
          isHighStatic: !!nextResults?.isHighStaticPressure
        });
      }
    });

    autoTable(pdf, {
      startY: currentY,
      head: [['Komponente', 'Distanz', 'P-Ein', 'P-Aus', 'Delta P', 'Status']],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [15, 23, 42], fontSize: 8, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 20, halign: 'right' },
        2: { cellWidth: 15, halign: 'right' },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 25, halign: 'center' }
      },
      styles: { fontSize: 8, cellPadding: 2 },
      didDrawPage: (data) => {
        currentY = data.cursor?.y || 20;
      }
    });

    // 9. Warnings after table
    if (allWarnings.length > 0) {
      currentY += 10;
      if (currentY > pageHeight - 30) {
        pdf.addPage();
        currentY = 20;
      }

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(220, 38, 38); // Red-600
      pdf.text('Warnungen / Hinweise', margin, currentY);
      currentY += 6;

      pdf.setFontSize(8);
      // Group warnings by type to avoid per-component repetition
      const uniqueWarningTypes = new Map<string, { type: string, detail: string }>();
      allWarnings.forEach(w => {
        if (!uniqueWarningTypes.has(w.type)) {
          uniqueWarningTypes.set(w.type, { type: w.type, detail: w.detail });
        }
      });

      Array.from(uniqueWarningTypes.values()).forEach(w => {
        if (currentY > pageHeight - 20) {
          pdf.addPage();
          currentY = 20;
        }
        pdf.setFont('helvetica', 'bold');
        pdf.text(`• ${w.type}`, margin + 2, currentY);
        currentY += 4;
        
        pdf.setFont('helvetica', 'normal');
        const detailLines = pdf.splitTextToSize(w.detail || '', contentWidth - 10);
        pdf.text(detailLines, margin + 6, currentY);
        currentY += (detailLines.length * 4) + 2;
      });
    }

    // 10. Save
    console.log('PDF Export: Saving file...');
    const fileName = `${route.name || 'Export'}-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);

    onComplete?.();
  } catch (error) {
    console.error('CRITICAL: Error generating PDF:', error);
    onError?.(error);
  } finally {
    onComplete?.();
  }
};
