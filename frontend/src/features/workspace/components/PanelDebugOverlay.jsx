import { useState, useEffect } from 'react';

export function PanelDebugOverlay({ name, refContainer }) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!refContainer.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: Math.round(entry.contentRect.width),
          height: Math.round(entry.contentRect.height),
        });
      }
    });
    observer.observe(refContainer.current);
    return () => observer.disconnect();
  }, [refContainer]);

  return (
    <div className="absolute bottom-2 right-2 bg-black/85 text-[10px] font-mono text-emerald-400 px-2 py-1.5 rounded border border-emerald-400/30 z-[100] pointer-events-none shadow-lg select-none">
      <div className="font-bold border-b border-emerald-400/20 pb-0.5 mb-1">{name}</div>
      <div>W: {dimensions.width}px</div>
      <div>H: {dimensions.height}px</div>
      <div>Scroll: Independent</div>
    </div>
  );
}
