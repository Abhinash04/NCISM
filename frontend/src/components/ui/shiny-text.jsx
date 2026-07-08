import { cn } from '@/lib/utils';

const INTENSITY_STOPS = {
  subtle: { from: 42, to: 58 },
  normal: { from: 35, to: 65 },
  strong: { from: 28, to: 72 },
};

export default function ShinyText({
  children,
  className = '',
  speed = 3,
  direction = 'left',
  color = 'currentColor',
  shineColor = 'var(--hero-shine)',
  spread = 120,
  intensity = 'normal',
  disabled = false,
  pauseOnHover = false,
  yoyo = false,
  delay = 0,
}) {
  const stops = INTENSITY_STOPS[intensity] ?? INTENSITY_STOPS.normal;
  const gradientStyle = {
    backgroundImage: `linear-gradient(${spread}deg, ${color} 0%, ${color} ${stops.from}%, ${shineColor} 50%, ${color} ${stops.to}%, ${color} 100%)`,
    backgroundSize: '200% auto',
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    animationDuration: `${speed + delay}s`,
    animationDirection: yoyo || direction === 'right' ? 'alternate' : 'normal',
  };

  return (
    <span
      className={cn(
        'inline-block bg-[position:150%_center]',
        !disabled && 'animate-shiny-text',
        pauseOnHover && 'hover:[animation-play-state:paused]',
        className
      )}
      style={gradientStyle}
    >
      {children}
    </span>
  );
}
