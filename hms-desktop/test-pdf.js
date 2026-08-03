const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const exePath = path.join(__dirname, 'dist', 'win-unpacked', 'Hotel Management System.exe');
  
  if (!fs.existsSync(exePath)) {
    console.error('FAIL: Executable not found at', exePath);
    process.exit(1);
  }

  console.log('Launching Electron app...');
  const app = await electron.launch({ executablePath: exePath });
  const window = await app.firstWindow();
  
  console.log('Waiting for Reports page to load...');
  // Navigate to reports or wait for text
  // The app might open to Dashboard first, let's navigate to Reports
  await window.click('text=Reports & Analytics', { timeout: 15000 }).catch(e => {
    // Maybe we are on reports?
  });
  
  await window.waitForSelector('text=Export PDF');

  // Mock dialog.showSaveDialog inside the main process
  await app.evaluate(({ dialog }, testFile) => {
    dialog.showSaveDialog = async () => {
      return { canceled: false, filePath: testFile };
    };
  }, path.join(__dirname, 'test-report.pdf'));

  console.log('Clicking Export PDF...');
  await window.click('text=Export PDF');
  
  console.log('Waiting 5 seconds for PDF to generate and save...');
  await new Promise(r => setTimeout(r, 5000));
  
  const pdfPath = path.join(__dirname, 'test-report.pdf');
  if (fs.existsSync(pdfPath)) {
    const stat = fs.statSync(pdfPath);
    console.log(`PASS: PDF saved successfully! File size: ${stat.size} bytes`);
    
    // We can also check if the PDF is reasonably sized to ensure it has content (charts are heavy)
    if (stat.size > 10000) {
      console.log('PASS: PDF size indicates it contains images/content.');
    } else {
      console.log('WARN: PDF size is very small, might be missing charts.');
    }
  } else {
    console.error('FAIL: PDF was not saved to disk.');
    process.exitCode = 1;
  }
  
  await app.close();
})();
