import { useEffect, useState, type CSSProperties } from 'react';

// Overlay drawn over the camera feed so it reads as a spy-satellite downlink.
// The target is the George Bush Presidential Library, Brazos County, TX,
// matching "TARGETING BRAZOS COUNTY" earlier in main.mp4.
export function SatelliteHud({ className, style }: { className: string; style: CSSProperties }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const utc = now.toISOString().slice(0, 19).replace('T', ' ') + 'Z';

  return (
    <div className={`hud ${className}`} style={style}>
      <svg className="hud-lines" viewBox="0 0 882 660" aria-hidden>
        {/* Corner brackets */}
        <path d="M20 60V20h40M822 20h40v40M862 600v40h-40M60 640H20v-40" />
        {/* Centre reticle */}
        <path d="M441 250v60M441 350v60M321 330h60M501 330h60" />
        <rect x="411" y="300" width="60" height="60" />
      </svg>
      <div className="hud-tl">KH-12 // IR BAND 3 // THERMAL</div>
      <div className="hud-tr">
        <span className="hud-live">● LIVE</span> {utc}
      </div>
      <div className="hud-bl">TGT 30.6100°N 096.3530°W // BRAZOS CO. TX</div>
      <div className="hud-br">ALT 512 KM // GSD 0.15 M</div>
    </div>
  );
}
