const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const waitOn = require('wait-on');

// Configuration
const BACKEND_PORT = 4000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

let mainWindow = null;
let backendProcess = null;

// Determine paths based on whether we're in dev or production
function getBasePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath);
  }
  return path.join(__dirname, '..');
}

function getBackendPath() {
  return path.join(getBasePath(), 'hms-backend');
}

// Kill any stale process still listening on the backend port (e.g. an orphaned
// backend left over from a previous run that was force-closed). Otherwise the
// fresh backend crashes with EADDRINUSE and the app silently falls back to it.
function killProcessOnPort(port) {
  return new Promise((resolve) => {
    try {
      const { exec } = require('child_process');
      exec(`netstat -ano | findstr :${port} | findstr LISTENING`, (err, stdout) => {
        if (err || !stdout) return resolve();
        const pids = new Set();
        stdout.trim().split(/\r?\n/).forEach((line) => {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && /^\d+$/.test(pid)) pids.add(pid);
        });
        pids.forEach((pid) => {
          try { process.kill(Number(pid), 'SIGTERM'); } catch (e) { /* already gone */ }
        });
        console.log(`Cleaned up ${pids.size} stale process(es) on port ${port}.`);
        setTimeout(resolve, 800);
      });
    } catch (e) {
      resolve();
    }
  });
}

// Start the backend server
function startBackend() {
  return new Promise(async (resolve, reject) => {
    const backendDir = getBackendPath();
    console.log(`Starting backend from: ${backendDir}`);

    const userDataPath = app.getPath('userData');
    
    // Setup SQLite DB Path
    let dbPath;
    if (app.isPackaged) {
      dbPath = path.join(userDataPath, 'database.sqlite');
      // If db doesn't exist, copy initial database
      if (!fs.existsSync(dbPath)) {
        const initialDb = path.join(backendDir, 'prisma', 'init.db');
        if (fs.existsSync(initialDb)) {
          fs.copyFileSync(initialDb, dbPath);
          console.log('Copied initial SQLite database to AppData:', dbPath);
        }
      }
    } else {
      dbPath = path.join(backendDir, 'prisma', 'dev.db');
      console.log('Using development SQLite database:', dbPath);
    }
    
    // Setup Uploads Path
    const uploadsPath = app.isPackaged ? path.join(userDataPath, 'uploads') : path.join(backendDir, 'uploads');
    if (!fs.existsSync(uploadsPath)) {
      fs.mkdirSync(uploadsPath, { recursive: true });
    }

    // Setup .env secrets
    const envPath = path.join(userDataPath, '.env');
    let jwtSecret = process.env.JWT_SECRET;
    let refreshSecret = process.env.JWT_REFRESH_SECRET;
    
    if (!fs.existsSync(envPath)) {
      const crypto = require('crypto');
      jwtSecret = crypto.randomBytes(32).toString('hex');
      refreshSecret = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(envPath, `JWT_SECRET=${jwtSecret}\nJWT_REFRESH_SECRET=${refreshSecret}\n`);
    } else {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const jwtMatch = envContent.match(/JWT_SECRET=(.*)/);
      const refreshMatch = envContent.match(/JWT_REFRESH_SECRET=(.*)/);
      if (jwtMatch) jwtSecret = jwtMatch[1].trim();
      if (refreshMatch) refreshSecret = refreshMatch[1].trim();
    }
    
    const dbUrl = `file:${dbPath}`;

    // Free the port first so a stale backend from a previous run can't block startup
    await killProcessOnPort(BACKEND_PORT);

    // Use node server.js for production, npx ts-node for dev
    const command = app.isPackaged ? 'node' : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
    const args = app.isPackaged ? ['dist/server.js'] : ['ts-node', '--transpile-only', 'src/server.ts'];

    backendProcess = spawn(command, args, {
      cwd: backendDir,
      env: { 
        ...process.env, 
        NODE_ENV: app.isPackaged ? 'production' : 'development',
        PORT: String(BACKEND_PORT), 
        DATABASE_URL: dbUrl,
        UPLOADS_DIR: uploadsPath,
        JWT_SECRET: jwtSecret,
        JWT_REFRESH_SECRET: refreshSecret
      },
      shell: true,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Backend] ${output}`);
      if (output.includes('Server is running')) {
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`[Backend Error] ${data.toString()}`);
    });

    backendProcess.on('error', (err) => {
      console.error('Failed to start backend:', err);
      reject(err);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    // Timeout fallback — resolve after 15s even if we don't see the message
    setTimeout(() => resolve(), 15000);
  });
}

// Create the main application window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'Hotel Management System',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
    autoHideMenuBar: true,
  });

  // Show window when content is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle PDF saving
  ipcMain.handle('save-pdf', async (event, buffer, defaultFilename) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Save PDF Report',
      defaultPath: defaultFilename || 'report.pdf',
      filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (canceled || !filePath) return false;

    try {
      fs.writeFileSync(filePath, Buffer.from(buffer));
      return true;
    } catch (err) {
      console.error('Failed to save PDF:', err);
      return false;
    }
  });

  // Handle PDF printing
  ipcMain.handle('print-pdf', async (event, buffer) => {
    try {
      const tempPath = path.join(app.getPath('temp'), `print_${Date.now()}.pdf`);
      fs.writeFileSync(tempPath, Buffer.from(buffer));

      const printWindow = new BrowserWindow({ 
        show: false,
        width: 900,
        height: 700,
        parent: mainWindow || undefined,
        webPreferences: { plugins: true }
      });

      printWindow.loadURL(`file://${tempPath}`);

      return new Promise((resolve) => {
        printWindow.webContents.on('did-finish-load', () => {
          setTimeout(async () => {
             try {
               printWindow.show();
               printWindow.focus();
               await printWindow.webContents.print({ silent: false });
               printWindow.close();
               fs.unlink(tempPath, () => {});
               if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
               resolve('printed');
             } catch (error) {
               console.error('Print failed:', error);
               printWindow.close();
               fs.unlink(tempPath, () => {});
               if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
               resolve(String(error && error.message || error).includes('cancel') ? 'cancelled' : 'failed');
             }
          }, 500);
        });
      });
    } catch (err) {
      console.error('Failed to print PDF:', err);
      return false;
    }
  });

  // Handle HTML printing
  ipcMain.handle('print-html', async (event, htmlContent) => {
    try {
      const tempPath = path.join(app.getPath('temp'), `print_${Date.now()}.html`);
      fs.writeFileSync(tempPath, htmlContent, 'utf8');

      const printWindow = new BrowserWindow({ 
        show: false,
        width: 900,
        height: 700,
        parent: mainWindow || undefined,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      });

      printWindow.loadURL(`file:///${tempPath.replace(/\\/g, '/')}`);

      return new Promise((resolve) => {
        printWindow.webContents.on('did-finish-load', () => {
          // Wait 500ms for images/fonts to render — identical to how print-pdf works
          setTimeout(async () => {
            try {
              printWindow.show();
              printWindow.focus();
              await printWindow.webContents.print({ 
                silent: false, 
                printBackground: true,
                margins: { marginType: 'none' } 
              });
              printWindow.close();
              fs.unlink(tempPath, () => {});
              if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
              resolve('printed');
            } catch (error) {
              console.error('Print HTML failed:', error);
              printWindow.close();
              fs.unlink(tempPath, () => {});
              if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
              resolve(String(error && error.message || error).includes('cancel') ? 'cancelled' : 'failed');
            }
          }, 500);
        });
      });
    } catch (err) {
      console.error('Failed to print HTML:', err);
      return false;
    }
  });
}

// Kill all child processes gracefully
function killAllProcesses() {
  if (backendProcess) {
    console.log('Killing backend process...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(backendProcess.pid), '/f', '/t'], { shell: true });
    } else {
      backendProcess.kill('SIGTERM');
    }
    backendProcess = null;
  }
}

// Main application startup
app.whenReady().then(async () => {
  createWindow();

  // Show a loading message
  mainWindow.loadURL(`data:text/html;charset=utf-8,
    <html>
      <head>
        <style>
          body {
            margin: 0; display: flex; align-items: center; justify-content: center;
            height: 100vh; background: #0a0a0f; color: #e0e0e0;
            font-family: 'Segoe UI', system-ui, sans-serif;
            flex-direction: column; gap: 20px;
          }
          .spinner {
            width: 50px; height: 50px;
            border: 4px solid rgba(255,255,255,0.1);
            border-top: 4px solid #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { margin: 0; font-weight: 400; font-size: 1.2rem; }
          p { margin: 0; color: #888; font-size: 0.9rem; }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <h2>Starting Hotel Management System...</h2>
        <p>This may take a moment on the first launch.</p>
      </body>
    </html>
  `);

  try {
    // Start backend first
    await startBackend();
    console.log('Backend started. Waiting for resources to be ready...');

    // Wait for the backend to be fully responding to requests
    await waitOn({
      resources: [BACKEND_URL],
      timeout: 60000,
      interval: 500,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    console.log('App is ready! Loading frontend...');
    mainWindow.loadURL(BACKEND_URL);

  } catch (err) {
    console.error('Startup error:', err);
    dialog.showErrorBox(
      'Startup Error',
      `Failed to start the Hotel Management System.\n\nError: ${err.message}\n\nPlease check that Node.js is installed and try again.`
    );
    app.quit();
  }
});

// Quit when all windows are closed
app.on('window-all-closed', () => {
  killAllProcesses();
  app.quit();
});

// Also kill processes on explicit quit
app.on('before-quit', () => {
  killAllProcesses();
});

// Handle macOS dock click
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
