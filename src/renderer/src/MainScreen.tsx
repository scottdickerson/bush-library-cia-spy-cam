import { useEffect, useRef, useState } from 'react';
import { useEscapeToQuit } from './useEscapeToQuit';

// Calibration: measured from main.mp4, where the "LIVE FEED FROM THERMAL
// X-RAY SENSOR" box is empty black. Nudge these if the feed looks misaligned.
const CAM_BOX = { left: 342, top: 155, width: 882, height: 660 };
const CAM_START = 40.8; // seconds: box goes black
// seconds: the whole screen cuts to black at 60.1; ending here lets the
// 0.4s fade-out finish by then
const CAM_END = 59.7;
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

export function MainScreen() {
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
    let frame = 0;
    const tick = () => {
      setCamOn(!m.paused && m.currentTime >= CAM_START && m.currentTime < CAM_END);
      if (!m.paused) frame = requestAnimationFrame(tick);
    };
    const offScan = window.spycam.on('scan', () => {
      m.currentTime = 0;
      m.play();
      frame = requestAnimationFrame(tick);
    });
    return () => {
      offScan();
      cancelAnimationFrame(frame);
    };
  }, []);

  const onEnded = () => {
    setCamOn(false);
    movie.current!.currentTime = 0;
    window.spycam.send('reset');
  };

  const on = camOn ? ' on' : '';

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
      <video ref={cam} className={`cam${on}`} style={CAM_BOX} muted playsInline autoPlay />
      <div className={`scanlines${on}`} style={CAM_BOX} />
    </div>
  );
}
