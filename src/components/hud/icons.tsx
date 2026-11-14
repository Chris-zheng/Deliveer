import React from 'react';

/**
 * Tiny stroke icons shared by the HUD and the panels.
 * They replace colour emoji so the glyphs look identical on every platform.
 */
type IconProps = { className?: string };

const base = 'inline-block align-[-0.15em]';

const Svg: React.FC<{ className?: string; children: React.ReactNode; fill?: string }> = ({
  className,
  children,
  fill = 'none',
}) => (
  <svg
    viewBox="0 0 24 24"
    width="1em"
    height="1em"
    fill={fill}
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={`${base} ${className ?? ''}`}
  >
    {children}
  </svg>
);

export const MapPinIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
    <circle cx="12" cy="10" r="2.5" />
  </Svg>
);

export const StarIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M12 3.5 14.7 9l6 .9-4.4 4.3 1 6-5.3-2.8L6.7 20l1-6L3.3 9.9l6-.9z" />
  </Svg>
);

export const FlameIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 .4 1.4 1.2 2 2.2 2.2C12 8.4 12 5.6 12 3z" />
  </Svg>
);

export const BoltIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12z" />
  </Svg>
);

export const CoinIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v8M9.5 10.2h3.8a1.8 1.8 0 0 1 0 3.6H9.5" />
  </Svg>
);

export const TrophyIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M8 4h8v4a4 4 0 0 1-8 0z" />
    <path d="M8 5H5.5a2.5 2.5 0 0 0 2.5 4M16 5h2.5a2.5 2.5 0 0 1-2.5 4" />
    <path d="M12 12v4M9 20h6l-.5-4h-5z" />
  </Svg>
);

export type MedalTier = 'bronze' | 'silver' | 'gold';

export const MedalIcon: React.FC<IconProps & { tier?: MedalTier }> = ({ className, tier = 'bronze' }) => {
  const fill = tier === 'gold' ? '#f7c948' : tier === 'silver' ? '#cfd8e3' : '#d08a4a';
  return (
    <Svg className={className} fill={fill}>
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M9 3h6l-2.5 6h-1z" stroke="none" fill="currentColor" opacity="0.25" />
    </Svg>
  );
};

export const CalendarIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M8 3v4M16 3v4M3.5 10h17" />
  </Svg>
);

export const BookIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 18.5V5.5" />
  </Svg>
);

export const TruckIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M3 7h10v9H3zM13 10h4l3 3v3h-7z" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="17" cy="18" r="1.8" />
  </Svg>
);

export const MapIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M3 6.5 9.5 4l5 2.5L21 4v13.5L14.5 20l-5-2.5L3 20z" />
    <path d="M9.5 4v13.5M14.5 6.5V20" />
  </Svg>
);

export const TargetIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
  </Svg>
);

export const BoxIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z" />
    <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
  </Svg>
);

export const TicketIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M3 8.5V6h18v2.5a3.5 3.5 0 0 0 0 7V18H3v-2.5a3.5 3.5 0 0 0 0-7z" />
    <path d="M12 8v1.5M12 14.5V16" />
  </Svg>
);
export const LockIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
    <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
  </Svg>
);

export const LandmarkIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M3 9 12 4l9 5" />
    <path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18" />
  </Svg>
);

export const FoodIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M3.5 11.5h17a8.5 8.5 0 0 1-8.5 8 8.5 8.5 0 0 1-8.5-8z" />
    <path d="M8 8.5c0-1.2 1-1.6 1-2.8M12 8.5c0-1.2 1-1.6 1-2.8M16 8.5c0-1.2 1-1.6 1-2.8" />
  </Svg>
);

export const ClockIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Svg>
);

export const RulerIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
    <path d="M7 8v3M11 8v3M15 8v3M19 8v3" />
  </Svg>
);

export const FlagIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M6 21V4M6 4.5h10l-1.6 3.5L16 11.5H6" />
  </Svg>
);

export const SparkIcon: React.FC<IconProps> = ({ className }) => (
  <Svg className={className}>
    <path d="M12 3.5 13.4 9l5.1 1.4-5.1 1.4L12 17.4l-1.4-5.6L5.5 10.4 10.6 9z" />
  </Svg>
);
