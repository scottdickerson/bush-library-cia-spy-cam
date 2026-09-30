# Bush Library CIA Spy Cam

Electron rebuild of the 2007 CIA Spycam exhibit: a hand-scan touchscreen that triggers a "satellite retasking" sequence on the main screen, with the live camera feed shown in the thermal x-ray sensor box.

## Run

```bash
npm install
npm start       # kiosk: fullscreen on the two displays
npm run dev     # framed windows side by side on one display
npm run selftest  # fake camera, one scan, screenshots saved to selftest/
```

Esc quits.

## Layout

- `touch.html` plays `media/sub.mp4` (hand scan) on the touchscreen; a touch starts a run.
- `main.html` plays `media/main.mp4` and overlays the camera between 40.8 s and 61.7 s.
- `main.js` places the windows: the touch window goes on the display reporting touch support, otherwise the non-primary one. With one display, both windows sit side by side (1280 + 800 wide), matching the original 2080×1024 spanning window.

## Calibration

Camera box position, feed timing and preferred camera name are constants at the top of the script in `main.html`.

## Hardware

The camera is an analog NTSC CCD (KT&C KPC-EX190SHW, 12 V DC). It connects through a UVC composite-to-USB capture dongle, which needs no driver.
