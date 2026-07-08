import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useThemeStore } from '@/store/useThemeStore';

/** Read a palette CSS var (e.g. `--heading`) as a canvas-ready colour string. */
function readThemeColor(cssVar, fallback) {
  if (typeof document === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  return value || fallback;
}

/**
 * ShapeGrid — animated canvas grid of drifting tiles (square / hexagon / circle /
 * triangle). Adapted from React Bits: theme-aware (borders/fill default to the
 * active palette and recolour on theme change), non-interactive by default so it
 * can sit behind app content without capturing pointer events, and static under
 * `prefers-reduced-motion`.
 *
 * @param {object} props
 * @param {'diagonal'|'up'|'right'|'down'|'left'} [props.direction='diagonal']
 * @param {number} [props.speed=0.1]                 Animation speed multiplier.
 * @param {string} [props.borderColor]               Tile border (defaults to --heading).
 * @param {number} [props.squareSize=40]             Tile size in px.
 * @param {string} [props.hoverFillColor]            Hover fill (defaults to --t-accent).
 * @param {'square'|'hexagon'|'circle'|'triangle'} [props.shape='hexagon']
 * @param {number} [props.hoverTrailAmount=0]        Trailing hovered tiles (interactive only).
 * @param {boolean} [props.interactive=false]        Enable mouse hover fill/trail.
 * @param {string} [props.className]
 */
export default function ShapeGrid({
  direction = 'diagonal',
  speed = 0.1,
  borderColor,
  squareSize = 20,
  hoverFillColor,
  shape = 'hexagon',
  hoverTrailAmount = 0,
  interactive = false,
  className = '',
}) {
  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const gridOffset = useRef({ x: 0, y: 0 });
  const hoveredSquare = useRef(null);
  const trailCells = useRef([]);
  const cellOpacities = useRef(null);
  if (cellOpacities.current === null) cellOpacities.current = new Map();
  const themeKey = useThemeStore((s) => s.themeKey);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const stroke = borderColor ?? readThemeColor('--heading', '#0A3C30');
    const fill = hoverFillColor ?? readThemeColor('--t-accent', '#3EBB9E');
    const reduceMotion =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const isHex = shape === 'hexagon';
    const isTri = shape === 'triangle';
    const hexHoriz = squareSize * 1.5;
    const hexVert = squareSize * Math.sqrt(3);

    let visible = true;
    const resizeCanvas = (width, height) => {
      const nextWidth = Math.max(1, Math.round(width));
      const nextHeight = Math.max(1, Math.round(height));
      if (canvas.width === nextWidth && canvas.height === nextHeight) return;
      canvas.width = nextWidth;
      canvas.height = nextHeight;
    };
    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      requestAnimationFrame(() => {
        resizeCanvas(rect.width, rect.height);
        drawGrid();
      });
    });
    resizeObserver.observe(canvas);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
    });
    visibilityObserver.observe(canvas);

    const drawHex = (cx, cy, size) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i;
        const vx = cx + size * Math.cos(angle);
        const vy = cy + size * Math.sin(angle);
        if (i === 0) ctx.moveTo(vx, vy);
        else ctx.lineTo(vx, vy);
      }
      ctx.closePath();
    };
    const drawCircle = (cx, cy, size) => {
      ctx.beginPath();
      ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
      ctx.closePath();
    };
    const drawTriangle = (cx, cy, size, flip) => {
      ctx.beginPath();
      if (flip) {
        ctx.moveTo(cx, cy + size / 2);
        ctx.lineTo(cx + size / 2, cy - size / 2);
        ctx.lineTo(cx - size / 2, cy - size / 2);
      } else {
        ctx.moveTo(cx, cy - size / 2);
        ctx.lineTo(cx + size / 2, cy + size / 2);
        ctx.lineTo(cx - size / 2, cy + size / 2);
      }
      ctx.closePath();
    };

    // Paint a tile's hover fill (interactive only) then its border.
    const paintCell = (key, draw) => {
      if (interactive) {
        const alpha = cellOpacities.current.get(key);
        if (alpha) {
          ctx.globalAlpha = alpha;
          draw();
          ctx.fillStyle = fill;
          ctx.fill();
          ctx.globalAlpha = 1;
        }
      }
      draw();
      ctx.strokeStyle = stroke;
      ctx.stroke();
    };

    const drawGrid = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (isHex) {
        const colShift = Math.floor(gridOffset.current.x / hexHoriz);
        const offX = ((gridOffset.current.x % hexHoriz) + hexHoriz) % hexHoriz;
        const offY = ((gridOffset.current.y % hexVert) + hexVert) % hexVert;
        const cols = Math.ceil(canvas.width / hexHoriz) + 3;
        const rows = Math.ceil(canvas.height / hexVert) + 3;
        for (let col = -2; col < cols; col += 1) {
          for (let row = -2; row < rows; row += 1) {
            const cx = col * hexHoriz + offX;
            const cy = row * hexVert + ((col + colShift) % 2 !== 0 ? hexVert / 2 : 0) + offY;
            paintCell(`${col},${row}`, () => drawHex(cx, cy, squareSize));
          }
        }
      } else if (isTri) {
        const halfW = squareSize / 2;
        const colShift = Math.floor(gridOffset.current.x / halfW);
        const rowShift = Math.floor(gridOffset.current.y / squareSize);
        const offX = ((gridOffset.current.x % halfW) + halfW) % halfW;
        const offY = ((gridOffset.current.y % squareSize) + squareSize) % squareSize;
        const cols = Math.ceil(canvas.width / halfW) + 4;
        const rows = Math.ceil(canvas.height / squareSize) + 4;
        for (let col = -2; col < cols; col += 1) {
          for (let row = -2; row < rows; row += 1) {
            const cx = col * halfW + offX;
            const cy = row * squareSize + squareSize / 2 + offY;
            const flip = ((((col + colShift + row + rowShift) % 2) + 2) % 2) !== 0;
            paintCell(`${col},${row}`, () => drawTriangle(cx, cy, squareSize, flip));
          }
        }
      } else {
        const offX = ((gridOffset.current.x % squareSize) + squareSize) % squareSize;
        const offY = ((gridOffset.current.y % squareSize) + squareSize) % squareSize;
        const cols = Math.ceil(canvas.width / squareSize) + 3;
        const rows = Math.ceil(canvas.height / squareSize) + 3;
        const isCircle = shape === 'circle';
        for (let col = -2; col < cols; col += 1) {
          for (let row = -2; row < rows; row += 1) {
            const cx = col * squareSize + squareSize / 2 + offX;
            const cy = row * squareSize + squareSize / 2 + offY;
            if (isCircle) {
              paintCell(`${col},${row}`, () => drawCircle(cx, cy, squareSize));
            } else {
              const sx = col * squareSize + offX;
              const sy = row * squareSize + offY;
              paintCell(`${col},${row}`, () => {
                ctx.beginPath();
                ctx.rect(sx, sy, squareSize, squareSize);
              });
            }
          }
        }
      }
    };

    const updateCellOpacities = () => {
      const targets = new Map();
      if (hoveredSquare.current) targets.set(`${hoveredSquare.current.x},${hoveredSquare.current.y}`, 1);
      if (hoverTrailAmount > 0) {
        trailCells.current.forEach((t, i) => {
          const key = `${t.x},${t.y}`;
          if (!targets.has(key)) targets.set(key, (trailCells.current.length - i) / (trailCells.current.length + 1));
        });
      }
      targets.forEach((_v, key) => { if (!cellOpacities.current.has(key)) cellOpacities.current.set(key, 0); });
      cellOpacities.current.forEach((opacity, key) => {
        const next = opacity + ((targets.get(key) || 0) - opacity) * 0.15;
        if (next < 0.005) cellOpacities.current.delete(key);
        else cellOpacities.current.set(key, next);
      });
    };

    const wrapX = isHex ? hexHoriz * 2 : squareSize;
    const wrapY = isHex ? hexVert : isTri ? squareSize * 2 : squareSize;
    const step = () => {
      const s = Math.max(speed, 0.03);
      if (direction === 'right' || direction === 'diagonal') gridOffset.current.x = (gridOffset.current.x - s + wrapX) % wrapX;
      if (direction === 'left') gridOffset.current.x = (gridOffset.current.x + s + wrapX) % wrapX;
      if (direction === 'up') gridOffset.current.y = (gridOffset.current.y + s + wrapY) % wrapY;
      if (direction === 'down' || direction === 'diagonal') gridOffset.current.y = (gridOffset.current.y - s + wrapY) % wrapY;
    };
    const tick = () => {
      if (visible) {
        step();
        if (interactive) updateCellOpacities();
        drawGrid();
      }
      requestRef.current = requestAnimationFrame(tick);
    };

    if (reduceMotion) {
      drawGrid();
    } else {
      requestRef.current = requestAnimationFrame(tick);
    }

    // Mouse interaction (opt-in). Skipped entirely for the background use case.
    let handleMove;
    let handleLeave;
    if (interactive) {
      const pushTrail = () => {
        if (hoveredSquare.current && hoverTrailAmount > 0) {
          trailCells.current.unshift({ ...hoveredSquare.current });
          if (trailCells.current.length > hoverTrailAmount) trailCells.current.length = hoverTrailAmount;
        }
      };
      handleMove = (event) => {
        const rect = canvas.getBoundingClientRect();
        const mx = event.clientX - rect.left;
        const my = event.clientY - rect.top;
        const offX = ((gridOffset.current.x % squareSize) + squareSize) % squareSize;
        const offY = ((gridOffset.current.y % squareSize) + squareSize) % squareSize;
        const col = Math.floor((mx - offX) / squareSize);
        const row = Math.floor((my - offY) / squareSize);
        if (!hoveredSquare.current || hoveredSquare.current.x !== col || hoveredSquare.current.y !== row) {
          pushTrail();
          hoveredSquare.current = { x: col, y: row };
        }
      };
      handleLeave = () => { pushTrail(); hoveredSquare.current = null; };
      canvas.addEventListener('mousemove', handleMove);
      canvas.addEventListener('mouseleave', handleLeave);
    }

    return () => {
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('mouseleave', handleLeave);
      }
    };
  }, [direction, speed, borderColor, hoverFillColor, squareSize, shape, hoverTrailAmount, interactive, themeKey]);

  // The wrapping AppBackground already sets aria-hidden + pointer-events-none, so the
  // decorative canvas needs none of its own (avoids aria-hidden on a bare element).
  return <canvas ref={canvasRef} className={cn('block h-full w-full', className)} />;
}
