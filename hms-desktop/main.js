const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const waitOn = require('wait-on');

// Configuration
const BACKEND_PORT = 4000;
const FRONTEND_PORT = 3000;
const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
const FRONTEND_URL = `http://localhost:${FRONTEND_PORT}`;

let mainWindow = null;
let backendProcess = null;
let frontendProcess = null;

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

function getFrontendPath() {
  return path.join(getBasePath(), 'hms-frontend');
}

// Start the backend server
function startBackend() {
  return new Promise((resolve, reject) => {
    const backendDir = getBackendPath();
    console.log(`Starting backend from: ${backendDir}`);

    // Use npx nodemon for dev, or node for production
    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    backendProcess = spawn(command, ['nodemon', 'src/server.ts'], {
      cwd: backendDir,
      env: { ...process.env, PORT: String(BACKEND_PORT) },
      shell: true,
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

// Start the frontend server
function startFrontend() {
  return new Promise((resolve, reject) => {
    const frontendDir = getFrontendPath();
    console.log(`Starting frontend from: ${frontendDir}`);

    const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    frontendProcess = spawn(command, ['next', 'dev'], {
      cwd: frontendDir,
      env: {
        ...process.env,
        PORT: String(FRONTEND_PORT),
        NEXT_PUBLIC_BACKEND_URL: BACKEND_URL
      },
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    frontendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Frontend] ${output}`);
    });

    frontendProcess.stderr.on('data', (data) => {
      console.error(`[Frontend Error] ${data.toString()}`);
    });

    frontendProcess.on('error', (err) => {
      console.error('Failed to start frontend:', err);
      reject(err);
    });

    frontendProcess.on('close', (code) => {
      console.log(`Frontend process exited with code ${code}`);
    });

    resolve();
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

  if (frontendProcess) {
    console.log('Killing frontend process...');
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(frontendProcess.pid), '/f', '/t'], { shell: true });
    } else {
      frontendProcess.kill('SIGTERM');
    }
    frontendProcess = null;
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
    console.log('Backend started.');

    // Start frontend
    await startFrontend();
    console.log('Frontend starting...');

    // Wait for the frontend to be ready
    await waitOn({
      resources: [FRONTEND_URL],
      timeout: 60000,
      interval: 500,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    console.log('Frontend is ready! Loading app...');
    mainWindow.loadURL(FRONTEND_URL);

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
