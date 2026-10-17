import { useEffect, useRef } from 'react';
import { useEscapeToQuit } from './useEscapeToQuit';

// sub.mp4: "Place right hand" → scanning → "Access granted" (10s).
// Idles on the first frame; stays on "Access granted" after playing until the
// main screen finishes its sequence and sends 'reset'.
export function TouchScreen() {
  const video = useRef<HTMLVideoElement>(null);
  useEscapeToQuit();

  useEffect(() => {
    const v = video.current!;
    let running = false;

    const startScan = () => {
      if (running) return;
      running = true;
      v.currentTime = 0;
      v.play();
      window.spycam.send('scan');
    };
    const offReset = window.spycam.on('reset', () => {
      running = false;
      v.pause();
      v.currentTime = 0;
    });

    document.addEventListener('pointerdown', startScan);
    return () => {
      document.removeEventListener('pointerdown', startScan);
      offReset();
    };
  }, []);

  return <video ref={video} src="media/sub.mp4" muted playsInline preload="auto" />;
}
