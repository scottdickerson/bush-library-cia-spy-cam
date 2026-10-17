# Bush Library CIA Spy Cam

Electron + React + TypeScript rebuild of the 2007 CIA Spycam exhibit: a hand-scan touchscreen that triggers a "satellite retasking" sequence on the main screen, with the live camera feed shown in the thermal x-ray sensor box.

## Run

```bash
npm install
npm start          # build, then run the kiosk fullscreen on the two displays
npm run dev        # framed windows side by side, with live reload
npm run typecheck  # TypeScript check
npm run selftest   # build, fake camera, one scan, screenshots saved to selftest/
```

Esc quits.

## Layout

Built with [electron-vite](https://electron-vite.org); output goes to `out/`.

- `src/renderer/src/TouchScreen.tsx` plays `media/sub.mp4` (hand scan) on the touchscreen; a touch starts a run.
- `src/renderer/src/MainScreen.tsx` plays `media/main.mp4` and overlays the camera between 40.8 s and 59.7 s (the screen cuts to black at 60.1 s).
- `src/renderer/public/media/` holds both videos.
- `src/preload/index.ts` exposes the `window.spycam` messaging API (typed in `src/renderer/src/spycam.ts`).
- `src/main/index.ts` places the windows: the touch window goes on the display reporting touch support, otherwise the non-primary one. With one display, both windows sit side by side (1280 + 800 wide), matching the original 2080×1024 spanning window.

## Calibration

Camera box position, feed timing and preferred camera name are constants at the top of `src/renderer/src/MainScreen.tsx`.

## Hardware

The camera is a USB (UVC) camera, which needs no driver. It sits about 50 ft from the PC on a USB 2.0-over-Ethernet extender (Cat5e/Cat6). Set `CAMERA_LABEL` in `MainScreen.tsx` if the PC has more than one camera.
