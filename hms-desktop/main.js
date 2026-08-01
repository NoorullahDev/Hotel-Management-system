const { app, BrowserWindow, dialog } = require('electron');
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

// Start the backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendDir = getBackendPath();
    console.log(`Starting backend from: ${backendDir}`);

    const userDataPath = app.getPath('userData');
    
    // Setup SQLite DB Path
    const dbPath = path.join(userDataPath, 'dev.db');
    // If db doesn't exist, copy initial dev.db
    if (!fs.existsSync(dbPath)) {
      const initialDb = path.join(backendDir, 'prisma', 'dev.db');
      if (fs.existsSync(initialDb)) {
        fs.copyFileSync(initialDb, dbPath);
        console.log('Copied initial SQLite database to AppData:', dbPath);
      }
    }
    
    // Setup Uploads Path
    const uploadsPath = path.join(userDataPath, 'uploads');
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

    // Use node server.js for production, npx ts-node for dev
    const command = app.isPackaged ? 'node' : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
    const args = app.isPackaged ? ['dist/server.js'] : ['ts-node', '--transpile-only', 'src/server.ts'];

    backendProcess = spawn(command, args, {
      cwd: backendDir,
      env: { 
        ...process.env, 
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
