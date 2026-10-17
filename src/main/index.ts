import { app, BrowserWindow, ipcMain, screen, type Rectangle } from 'electron';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';

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

type Page = 'main' | 'touch';

function pickBounds(): Record<Page, Rectangle> {
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
    displays.find((d) => d.touchSupport === 'available') ??
    displays.find((d) => d.id !== primary.id)!;
  const main = displays.find((d) => d.id !== touch.id)!;
  return { main: main.bounds, touch: touch.bounds };
}

function makeWindow(page: Page, bounds: Rectangle): BrowserWindow {
  const win = new BrowserWindow({
    ...bounds,
    frame: DEV,
    fullscreen: !DEV,
    alwaysOnTop: !DEV,
    backgroundColor: '#000000',
    webPreferences: { preload: join(__dirname, '../preload/index.js') },
  });
  // electron-vite dev serves the renderer over HTTP; built apps load files.
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) win.loadURL(`${devUrl}/${page}.html`);
  else win.loadFile(join(__dirname, `../renderer/${page}.html`));
  return win;
}

app.whenReady().then(() => {
  const bounds = pickBounds();
  const mainWin = makeWindow('main', bounds.main);
  const touchWin = makeWindow('touch', bounds.touch);

  // Touch page starts a run; main page ends it. Relay both ways.
  ipcMain.on('scan', () => mainWin.webContents.send('scan'));
  ipcMain.on('reset', () => touchWin.webContents.send('reset'));
  ipcMain.on('quit', () => app.quit());

  if (SELFTEST) selftest(mainWin, touchWin);
});

app.on('window-all-closed', () => app.quit());

// Triggers one scan and saves screenshots of both screens at key moments,
// so the whole flow can be checked without a touchscreen or camera.
async function selftest(mainWin: BrowserWindow, touchWin: BrowserWindow): Promise<void> {
  const out = join(app.getAppPath(), 'selftest');
  mkdirSync(out, { recursive: true });
  const ready = (w: BrowserWindow) =>
    new Promise<void>((r) => w.webContents.once('did-finish-load', () => r()));
  await Promise.all([ready(mainWin), ready(touchWin)]);
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const snap = async (win: BrowserWindow, name: string) =>
    writeFileSync(join(out, name), (await win.capturePage()).toPNG());
  // The hand-scan video leaves frame 0 when a run starts and returns to it on reset.
  const touchRunning = () =>
    touchWin.webContents.executeJavaScript('document.querySelector("video").currentTime > 0');

  await wait(1500);
  await snap(touchWin, 'touch-idle.png');
  touchWin.webContents.executeJavaScript(
    'document.dispatchEvent(new PointerEvent("pointerdown"))',
  );
  await wait(5000);
  await snap(touchWin, 'touch-scanning.png');
  await snap(mainWin, 'main-5s.png');
  await wait(45000);
  await snap(mainWin, 'main-50s-camera.png');
  await wait(15000);
  await snap(mainWin, 'main-65s-no-camera.png');
  console.log('SELFTEST touch still running at 65s (expected true):', await touchRunning());
  // 73s: main is back on its seal screen (from 72s) but its video has not
  // ended (75s), so this fails if the touchscreen only resets on 'ended'.
  await wait(8000);
  await snap(mainWin, 'main-73s-seal.png');
  console.log('SELFTEST touch reset with main seal screen (expected true):', !(await touchRunning()));
  app.quit();
}
