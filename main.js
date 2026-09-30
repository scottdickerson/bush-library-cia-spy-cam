const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');

const DEV = process.argv.includes('--dev');
const SELFTEST = !!process.env.SPYCAM_SELFTEST;

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
if (SELFTEST) {
  // Chromium's built-in test-pattern camera, so the self-test needs no hardware.
  app.commandLine.appendSwitch('use-fake-device-for-media-stream');
  app.commandLine.appendSwitch('use-fake-ui-for-media-stream');
}

// Main screen 1280x1024, touchscreen to its right: the original HandScan.exe
// used one 2080x1024 window at 0,0 spanning both monitors.
const MAIN_SIZE = { width: 1280, height: 1024 };
const TOUCH_SIZE = { width: 800, height: 1024 };

function pickBounds() {
  const displays = screen.getAllDisplays();
  if (DEV || displays.length < 2) {
    // One display: either a dev laptop or a span splitter presenting both
    // monitors as a single wide desktop. Lay the windows out side by side.
    const { x, y } = screen.getPrimaryDisplay().bounds;
    return {
      main: { x, y, ...MAIN_SIZE },
      touch: { x: x + MAIN_SIZE.width, y, ...TOUCH_SIZE },
    };
  }
  // Two displays: the touchscreen is whichever reports touch support,
  // falling back to the non-primary display.
  const primary = screen.getPrimaryDisplay();
  const touch =
    displays.find((d) => d.touchSupport === 'available') ||
    displays.find((d) => d.id !== primary.id);
  const main = displays.find((d) => d.id !== touch.id);
  return { main: main.bounds, touch: touch.bounds };
}

function makeWindow(page, bounds) {
  const win = new BrowserWindow({
    ...bounds,
    frame: DEV,
    fullscreen: !DEV,
    alwaysOnTop: !DEV,
    backgroundColor: '#000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  win.loadFile(page);
  return win;
}

app.whenReady().then(() => {
  const bounds = pickBounds();
  const mainWin = makeWindow('main.html', bounds.main);
  const touchWin = makeWindow('touch.html', bounds.touch);

  // Touch page starts a run; main page ends it. Relay both ways.
  ipcMain.on('scan', () => mainWin.webContents.send('scan'));
  ipcMain.on('reset', () => touchWin.webContents.send('reset'));
  ipcMain.on('quit', () => app.quit());

  if (SELFTEST) selftest(mainWin, touchWin);
});

app.on('window-all-closed', () => app.quit());

// Triggers one scan and saves screenshots of both screens at key moments,
// so the whole flow can be checked without a touchscreen or camera.
async function selftest(mainWin, touchWin) {
  const out = path.join(__dirname, 'selftest');
  fs.mkdirSync(out, { recursive: true });
  const ready = (w) => new Promise((r) => w.webContents.once('did-finish-load', r));
  await Promise.all([ready(mainWin), ready(touchWin)]);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const snap = async (win, name) =>
    fs.writeFileSync(path.join(out, name), (await win.capturePage()).toPNG());

  await wait(1500);
  await snap(touchWin, 'touch-idle.png');
  touchWin.webContents.executeJavaScript('startScan()');
  await wait(5000);
  await snap(touchWin, 'touch-scanning.png');
  await snap(mainWin, 'main-5s.png');
  await wait(45000);
  await snap(mainWin, 'main-50s-camera.png');
  await wait(15000);
  await snap(mainWin, 'main-65s-no-camera.png');
  const running = await touchWin.webContents.executeJavaScript('running');
  console.log('SELFTEST touch still running at 65s (expected true):', running);
  await wait(12000);
  const after = await touchWin.webContents.executeJavaScript('running');
  console.log('SELFTEST touch reset after main ended (expected false):', !after);
  app.quit();
}
