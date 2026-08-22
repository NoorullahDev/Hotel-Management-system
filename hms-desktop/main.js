const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const waitOn = require('wait-on');

// Configuration
const BACKEND_PORT = 4000;
const BACKEND_URL = `http://127.0.0.1:${BACKEND_PORT}`;

let mainWindow = null;
let backendProcess = null;
let autoBackupKey = null;
// NOTE: autoBackupPerformed flag removed — each backup opportunity (startup and
// quit) is now independent so both always run within a session.
let isQuitting = false;
let startupBackupDone = false; // tracks startup backup only to avoid duplication on activate
let firstRunAdmin = null;

// Determine paths based on whether we're in dev or production
function getBasePath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath);
  }
  return path.join(__dirname, '..');
}

// Product-wide license encryption secret. Shipped as hms-desktop/secrets.env
// (packaged via extraResources, gitignored) so it is never baked into the
// compiled backend. The backend refuses to start without it.
function getLicenseSecret() {
  const secretEnvPath = path.join(getBasePath(), 'hms-desktop', 'secrets.env');
  try {
    if (fs.existsSync(secretEnvPath)) {
      const content = fs.readFileSync(secretEnvPath, 'utf8');
      const match = content.match(/^\s*LICENSE_SECRET\s*=\s*(.+)\s*$/m);
      if (match) return match[1].trim();
    }
  } catch (err) {
    console.warn('Could not read license secret file:', err);
  }
  return undefined;
}

function getBackendPath() {
  return path.join(getBasePath(), 'hms-backend');
}

// Dedicated folder on the user's Desktop where automatic backups are saved.
function getBackupDir() {
  try {
    const desktop = app.getPath('desktop');
    if (desktop) return path.join(desktop, 'Backup');
  } catch (err) {
    console.warn('Could not resolve Desktop path for backups:', err);
  }
  return path.join(app.getPath('home'), 'Desktop', 'Backup');
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
      // Development: use the same dev.db that `npm run dev` (nodemon) uses.
      // This keeps Electron dev and direct-backend runs on the same database
      // so credentials and data are always consistent.
      // dev.local.db is reserved exclusively for integration tests (vitest)
      // so test runs never pollute the working development database.
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

    // Internal key + destination for the automatic on-close backup. Freshly
    // generated on every launch and shared with the backend via the environment.
    autoBackupKey = crypto.randomBytes(32).toString('hex');
    const backupDir = getBackupDir();
    console.log('Automatic backups will be saved to:', backupDir);

    // Free the port first so a stale backend from a previous run can't block startup
    await killProcessOnPort(BACKEND_PORT);

    // Apply pending Prisma migrations before serving so app updates that change
    // the schema are migrated onto the user's existing AppData database. Fresh
    // installs run against the just-copied init.db, which is already at the
    // latest migration version, making this a no-op for them. Dev mode is
    // skipped — the developer migrates dev.db through the normal workflow.
    if (app.isPackaged) {
      const prismaCli = path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js');
      if (!fs.existsSync(prismaCli)) {
        console.warn('[Migrate] Prisma CLI not found, skipping schema migration:', prismaCli);
      } else {
        console.log('[Migrate] Applying database migrations...');
        const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
          cwd: backendDir,
          env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', DATABASE_URL: dbUrl },
          encoding: 'utf8',
          windowsHide: true,
        });
        if (result.error || result.status !== 0) {
          throw new Error(`Database migration failed: ${(result.stderr || result.stdout || result.error || '').toString().trim()}`);
        }
        const summary = (result.stdout || '').trim().split('\n').filter(Boolean).pop();
        console.log('[Migrate]', summary || 'migrations up to date');
      }
    }

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
        JWT_REFRESH_SECRET: refreshSecret,
        LICENSE_SECRET: getLicenseSecret(),
        AUTO_BACKUP_KEY: autoBackupKey,
        BACKUP_DIR: backupDir
      },
      shell: true,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Backend] ${output}`);
      const firstRunMatch = output.match(/\[FIRST_RUN_ADMIN_CREATED\] username=(\S+) password=(\S+)/);
      if (firstRunMatch) {
        firstRunAdmin = { username: firstRunMatch[1], password: firstRunMatch[2] };
      }
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

// Append a line to backup.log in the Backup folder (Electron side).
// This records failures that happen before the backend has even started,
// or when the backend is unreachable, providing a full audit trail.
function writeElectronBackupLog(level, message) {
  try {
    const backupDir = getBackupDir();
    if (!backupDir) return;
    const logPath = path.join(backupDir, 'backup.log');
    const ts = new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi', hour12: false });
    const line = `[${ts}] [${level}] ${message}\n`;
    fs.mkdirSync(backupDir, { recursive: true });
    fs.appendFileSync(logPath, line, 'utf8');
  } catch (e) {
    console.warn('[AutoBackup] Could not write Electron backup.log:', e.message || e);
  }
}

/**
 * Trigger the auto-backup endpoint on the backend.
 * @param {string} trigger - Human-readable reason (e.g. 'STARTUP' or 'QUIT').
 * @param {number} [timeoutMs=45000] - Abort timeout in milliseconds.
 *
 * Design: Each call is fully independent — no global "already done" flag —
 * so both the startup backup and the quit-time backup always execute.
 * The backend itself names files with a second-precision timestamp and
 * appends a counter suffix if two files would otherwise collide.
 */
async function runAutoBackup(trigger = 'QUIT', timeoutMs = 45000) {
  if (!autoBackupKey) {
    const msg = `[${trigger}] Skipped: no autoBackupKey available (backend may not have started).`;
    console.warn('[AutoBackup]', msg);
    writeElectronBackupLog('ERROR', msg);
    return;
  }
  try {
    console.log(`[AutoBackup] Triggering ${trigger} backup...`);
    const res = await fetch(`${BACKEND_URL}/api/settings/backup/auto`, {
      method: 'POST',
      headers: { 'X-Auto-Backup-Key': autoBackupKey },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Backend returned ${res.status}${text ? `: ${text}` : ''}`);
    }
    const json = await res.json().catch(() => ({}));
    const savedFile = json.filename || '(unknown)';
    console.log(`[AutoBackup] ${trigger} backup saved: ${savedFile}`);
    // The backend already writes to backup.log on success, but we echo it here
    // for the Electron console as well (visible in DevTools / packaged logs).
  } catch (err) {
    const msg = `[${trigger}] Backup failed: ${err && err.message || err}`;
    console.error('[AutoBackup]', msg);
    writeElectronBackupLog('ERROR', msg);
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

    // ── Startup backup ───────────────────────────────────────────────────────
    // Run 3 seconds after the frontend loads so the app feels instant on
    // startup. This ensures data is backed up even if the app is later
    // force-closed or crashes before the quit-time backup can run.
    if (!startupBackupDone) {
      startupBackupDone = true;
      setTimeout(() => runAutoBackup('STARTUP'), 3000);
    }

    // First launch on a fresh installation: show the auto-generated temporary
    // admin credentials so the operator can log in and set their own password.
    if (firstRunAdmin) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'First-Time Setup',
        message: 'A temporary administrator account was created for this installation.',
        detail: `Username: ${firstRunAdmin.username}\nTemporary password: ${firstRunAdmin.password}\n\nYou will be asked to set a new password when you log in.`,
        buttons: ['OK']
      });
    }

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
  app.quit();
});

// Run the automatic backup before quitting, then shut down the backend.
// This is SEPARATE from the startup backup — both always run in a session.
app.on('before-quit', (event) => {
  if (isQuitting) return;
  event.preventDefault();
  isQuitting = true;
  (async () => {
    // Give the quit backup up to 60 s. The process stays alive until the
    // await resolves, so the backend won't be killed mid-write.
    await runAutoBackup('QUIT', 60000);
    killAllProcesses();
    app.quit();
  })();
});

// Handle macOS dock click
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
