import { useEffect } from 'react';

/** Esc on either screen quits the kiosk. */
export function useEscapeToQuit(): void {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') window.spycam.send('quit');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
