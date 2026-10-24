import { useEffect, useRef, useState } from 'react';
import { FeedFilters, type FeedFilter } from './filters';
import { SatelliteHud } from './SatelliteHud';
import { useEscapeToQuit } from './useEscapeToQuit';

// Calibration: measured from main.mp4, where the "LIVE FEED FROM THERMAL
// X-RAY SENSOR" box is empty black. Nudge these if the feed looks misaligned.
const CAM_BOX = { left: 342, top: 155, width: 882, height: 660 };
const CAM_START = 40.8; // seconds: box goes black
// seconds: the whole screen cuts to black at 60.1; ending here lets the
// 0.4s fade-out finish by then
const CAM_END = 59.7;
// seconds: main fades back in to the seal and "PLACE HAND ON SCANNER BELOW",
// so the touchscreen returns to "Place right hand" at the same moment
const TOUCH_RESET_AT = 72.0;
// Substring of the camera's name to prefer; '' = first camera found.
const CAMERA_LABEL = '';

const STAGE = { width: 1280, height: 1024 };
const fitScale = () => Math.min(innerWidth / STAGE.width, innerHeight / STAGE.height);

async function openCamera(): Promise<MediaStream> {
  const video: MediaTrackConstraints = { width: 1280, height: 960 };
  if (CAMERA_LABEL) {
    // Device labels stay hidden until camera permission has been granted once.
    (await navigator.mediaDevices.getUserMedia({ video: true })).getTracks().forEach((t) => t.stop());
    const devices = await navigator.mediaDevices.enumerateDevices();
    const d = devices.find((d) => d.kind === 'videoinput' && d.label.includes(CAMERA_LABEL));
    if (d) video.deviceId = { exact: d.deviceId };
  }
  return navigator.mediaDevices.getUserMedia({ video });
}

// Frame of main.mp4 shown behind the feed in camera-only mode: mid live-feed segment.
const CAMERA_ONLY_FRAME = 50;

/**
 * `cameraOnly`: hold the video on its live-feed frame and show the feed
 * permanently, for tuning the look (`npm run camera:*`).
 * `filter`: which camera-feed look to apply.
 */
export function MainScreen({ cameraOnly, filter }: { cameraOnly: boolean; filter: FeedFilter }) {
  const movie = useRef<HTMLVideoElement>(null);
  const cam = useRef<HTMLVideoElement>(null);
  const [scale, setScale] = useState(fitScale);
  const [camOn, setCamOn] = useState(false);
  useEscapeToQuit();

  useEffect(() => {
    const onResize = () => setScale(fitScale());
    addEventListener('resize', onResize);
    return () => removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let stream: MediaStream | undefined;
    let cancelled = false;
    openCamera()
      .then((s) => {
        stream = s;
        if (cancelled) s.getTracks().forEach((t) => t.stop());
        else cam.current!.srcObject = s;
      })
      // No camera: the sequence still runs, the box just stays black.
      .catch((err) => console.error('Camera unavailable:', err));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    const m = movie.current!;
    if (cameraOnly) {
      m.currentTime = CAMERA_ONLY_FRAME; // applied once the video has loaded
      return;
    }
    let frame = 0;
    let touchReset = false;
    const tick = () => {
      setCamOn(!m.paused && m.currentTime >= CAM_START && m.currentTime < CAM_END);
      if (!touchReset && m.currentTime >= TOUCH_RESET_AT) {
        touchReset = true;
        window.spycam.send('reset');
      }
      if (!m.paused) frame = requestAnimationFrame(tick);
    };
    const offScan = window.spycam.on('scan', () => {
      touchReset = false;
      m.currentTime = 0;
      m.play();
      frame = requestAnimationFrame(tick);
    });
    return () => {
      offScan();
      cancelAnimationFrame(frame);
    };
  }, [cameraOnly]);

  // The touchscreen was already reset at TOUCH_RESET_AT; park on the seal frame.
  const onEnded = () => {
    setCamOn(false);
    movie.current!.currentTime = 0;
  };

  const on = camOn || cameraOnly ? ' on' : '';

  return (
    <div className="stage" style={{ transform: `scale(${scale}) translate(-50%, -50%)` }}>
      <video
        ref={movie}
        className="movie"
        src="media/main.mp4"
        muted
        playsInline
        preload="auto"
        onEnded={onEnded}
      />
      <FeedFilters />
      <video
        ref={cam}
        className={`cam${on}`}
        style={{ ...CAM_BOX, filter: filter === 'none' ? undefined : `url(#${filter})` }}
        muted
        playsInline
        autoPlay
      />
      <div className={`scanlines${on}`} style={CAM_BOX} />
      <SatelliteHud className={on} style={CAM_BOX} />
    </div>
  );
}
