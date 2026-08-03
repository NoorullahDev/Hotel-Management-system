const fs = require('fs');
const path = require('path');

const pageTsxPath = path.join('app', '(dashboard)', 'reports', 'page.tsx');
let content = fs.readFileSync(pageTsxPath, 'utf8');

const newGeneratePDF = `  const generatePDF = async () => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Cover Section
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(hotelName, pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(hotelAddress, pageWidth / 2, 28, { align: 'center' });
      if (contactNumber || email) {
        doc.text([contactNumber && \`Phone: \${contactNumber}\`, email && \`Email: \${email}\`].filter(Boolean).join(' | '), pageWidth / 2, 34, { align: 'center' });
      }
      
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(40);
      doc.text("Comprehensive Performance Report", pageWidth / 2, 48, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text(\`Period: \${range.start} to \${range.end}\`, pageWidth / 2, 55, { align: 'center' });
      
      let currentY = 65;

      // 1. KPI Summary Section
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
      doc.text("Key Performance Indicators", 14, currentY);
      currentY += 8;

      autoTable(doc, {
        startY: currentY,
        head: [['Total Revenue', 'Occupancy Rate', 'Total Bookings', 'Avg Length of Stay', 'Guest Satisfaction']],
        body: [[
          formatCurrency(summary?.revenue ?? 0, currencySymbol),
          \`\${summary?.occupancyRate ?? 0}%\`,
          String(summary?.totalBookings ?? 0),
          \`\${summary?.avgLOS ?? 0} Nights\`,
          \`\${summary?.guestSatisfaction ?? 0} / 5\`
        ]],
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', halign: 'center' },
        bodyStyles: { fontStyle: 'bold', halign: 'center', fontSize: 11, textColor: [30, 41, 59] },
        margin: { top: 20 },
      });
      currentY = (doc as any).lastAutoTable.finalY + 15;

      const captureChart = async (id: string) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const canvas = await html2canvas(el, { scale: 2 });
        return canvas.toDataURL('image/png');
      };

      // Capture all 6 charts
      const revChartImg = await captureChart('chart-revenue');
      const occChartImg = await captureChart('chart-occupancy');
      const bookChartImg = await captureChart('chart-bookings');
      
      const restChartImg = await captureChart('chart-restaurant');
      const staffChartImg = await captureChart('chart-staff');
      const deptChartImg = await captureChart('chart-dept-revenue');

      // 2. Charts Section (Row 1)
      if (revChartImg) {
        if (currentY + 65 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
        doc.text("Revenue Trend", 14, currentY);
        currentY += 5;
        doc.addImage(revChartImg, 'PNG', 14, currentY, pageWidth - 28, 60);
        currentY += 65;
      }

      if (occChartImg && bookChartImg) {
        if (currentY + 65 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14); doc.setTextColor(0); doc.text("Occupancy & Bookings", 14, currentY);
        currentY += 5;
        doc.addImage(occChartImg, 'PNG', 14, currentY, (pageWidth - 30) / 2, 60);
        doc.addImage(bookChartImg, 'PNG', 14 + (pageWidth - 30) / 2 + 2, currentY, (pageWidth - 30) / 2, 60);
        currentY += 65;
      }
      
      // 3. Charts Section (Row 2)
      if (restChartImg) {
        if (currentY + 65 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14); doc.setTextColor(0); doc.text("Restaurant Revenue", 14, currentY);
        currentY += 5;
        doc.addImage(restChartImg, 'PNG', 14, currentY, pageWidth - 28, 60);
        currentY += 65;
      }
      
      if (staffChartImg && deptChartImg) {
        if (currentY + 65 > pageHeight - 20) { doc.addPage(); currentY = 20; }
        doc.setFontSize(14); doc.setTextColor(0); doc.text("Staff Performance & Revenue by Department", 14, currentY);
        currentY += 5;
        doc.addImage(staffChartImg, 'PNG', 14, currentY, (pageWidth - 30) / 2, 60);
        doc.addImage(deptChartImg, 'PNG', 14 + (pageWidth - 30) / 2 + 2, currentY, (pageWidth - 30) / 2, 60);
        currentY += 65;
      }

      // 4. Detailed Daily Breakdown (Tables)
      doc.addPage();
      currentY = 20;
      doc.setFontSize(16); doc.setTextColor(40); doc.text("Detailed Daily Breakdown", 14, currentY);
      currentY += 10;

      autoTable(doc, {
        startY: currentY,
        head: [['Date', 'Rooms Revenue', 'Restaurant Revenue', 'Other Revenue', 'Total']],
        body: revTable?.rows?.map((r: any) => [r.date, formatCurrency(r.roomsRevenue, currencySymbol), formatCurrency(r.restaurantRevenue, currencySymbol), formatCurrency(r.otherRevenue, currencySymbol), formatCurrency(r.total, currencySymbol)]) || [],
        foot: revTable?.totals ? [['Total', formatCurrency(revTable.totals.roomsRevenue, currencySymbol), formatCurrency(revTable.totals.restaurantRevenue, currencySymbol), formatCurrency(revTable.totals.otherRevenue, currencySymbol), formatCurrency(revTable.totals.total, currencySymbol)]] : [],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        margin: { top: 20 },
      });

      autoTable(doc, {
        startY: (doc as any).lastAutoTable.finalY + 15,
        head: [['Date', 'Occupied', 'Available', 'Reserved', 'Occupancy %']],
        body: occupancy?.table?.map((r: any) => [r.date, r.occupied, r.available, r.reserved, \`\${r.occupancyPct}%\`]) || [],
        foot: occupancy?.table?.length ? [['Total / Avg', String(occupancy.table.reduce((a:number,r:any)=>a+r.occupied,0)), String(occupancy.table.reduce((a:number,r:any)=>a+r.available,0)), String(occupancy.table.reduce((a:number,r:any)=>a+r.reserved,0)), \`\${occupancy?.occupancyRate}%\`]] : [],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        margin: { top: 20 },
      });

      // 5. Staff Report Table
      doc.addPage();
      currentY = 20;
      doc.setFontSize(16); doc.setTextColor(40); doc.text("Staff Report", 14, currentY);
      currentY += 10;
      
      autoTable(doc, {
        startY: currentY,
        head: [['Staff Name', 'Department', 'Tasks Completed', 'Efficiency %', 'Rating']],
        body: staffPerf?.map((s: any) => [s.name, s.department, s.tasksCompleted, \`\${s.efficiency}%\`, s.rating]) || [],
        theme: 'grid',
        headStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
        margin: { top: 20 },
      });

      // 6. Second pass: Add continuous page numbers to all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(\`\${hotelName} - \${range.start} to \${range.end}\`, 14, pageHeight - 10);
        doc.text(\`Page \${i} of \${totalPages}\`, pageWidth - 14, pageHeight - 10, { align: 'right' });
      }

      const pdfOutput = doc.output('arraybuffer');
      const filename = \`report_\${range.start}_to_\${range.end}.pdf\`;
      
      if ((window as any).electron?.savePdf) {
        const success = await (window as any).electron.savePdf(pdfOutput, filename);
        if (!success) console.log("PDF save cancelled or failed.");
      } else {
        doc.save(filename);
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
    }
  };`;

const oldRegex = /const generatePDF = async \(\) => \{[\s\S]*?\} catch \(error\) \{[\s\S]*?\}\s*\};/;
if (!oldRegex.test(content)) {
  console.error("Regex match failed!");
  process.exit(1);
}

content = content.replace(oldRegex, newGeneratePDF);
fs.writeFileSync(pageTsxPath, content);
console.log("Successfully replaced generatePDF!");
