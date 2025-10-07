import React from 'react';

// FIX: Define a common props interface for icons to allow `style` and other props.
interface IconProps {
    className?: string;
    style?: React.CSSProperties;
}

export const SurvivorIcon = ({ className, style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
  </svg>
);

export const TreeIcon = ({ className, style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M12 22a1 1 0 01-1-1v-5a1 1 0 011-1h1a1 1 0 011 1v5a1 1 0 01-1 1h-1z" />
    <path d="M19.95 13.5A7.5 7.5 0 004.05 13.5a1 1 0 001.414 1.414 5.5 5.5 0 018.072 0 1 1 0 001.414-1.414z" />
    <path d="M17.828 9.172a5 5 0 00-7.07 0 1 1 0 101.414 1.414 3 3 0 014.242 0 1 1 0 001.414-1.414z" />
  </svg>
);

export const HouseIcon = ({ className, style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} style={style}>
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0L2.47 11.47a.75.75 0 101.06 1.06l8.94-8.94z" />
    <path d="M14.25 10.5a.75.75 0 00-1.06 0l-3 3a.75.75 0 00-1.06 1.06l3 3a.75.75 0 001.06-1.06l-2.47-2.47 2.47-2.47a.75.75 0 000-1.06z" />
    <path d="M3.75 12a.75.75 0 01.75-.75h15a.75.75 0 010 1.5h-15a.75.75 0 01-.75-.75z" />
    <path d="M5.25 15h13.5a.75.75 0 01.75.75v3.375c0 .621-.504 1.125-1.125 1.125H5.625c-.621 0-1.125-.504-1.125-1.125V15.75a.75.75 0 01.75-.75z" />
  </svg>
);

export const PlankIcon = ({ className, style }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
        <path d="M2.5 4.5a.5.5 0 01.5-.5h14a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-14a.5.5 0 01-.5-.5v-1zM3 8.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h14a.5.5 0 00.5-.5v-1a.5.5 0 00-.5-.5h-14zM2.5 13.5a.5.5 0 01.5-.5h14a.5.5 0 01.5.5v1a.5.5 0 01-.5.5h-14a.5.5 0 01-.5-.5v-1z" />
    </svg>
);

export const BedIcon = ({ className, style }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
        <path fillRule="evenodd" d="M16 6.5a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0zM5.5 8a.5.5 0 000 1h9a.5.5 0 000-1h-9zM3 9a1 1 0 011-1h12a1 1 0 011 1v5a1 1 0 01-1-1H4a1 1 0 01-1-1V9z" clipRule="evenodd" />
    </svg>
);

export const WoodIcon = ({ className, style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
    <path d="M10 2a.75.75 0 01.75.75v14.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2z" />
    <path d="M3.375 5.093l.875 1.944a11.5 11.5 0 01-1.554 4.542.75.75 0 01-1.42-.58 13 13 0 001.758-5.152.75.75 0 01.342-.356z" />
    <path d="M16.625 5.093a.75.75 0 01.342.356 13 13 0 001.758 5.152.75.75 0 01-1.42.58 11.5 11.5 0 01-1.554-4.542l.875-1.944z" />
  </svg>
);

export const HeartIcon = ({ className, style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
    <path d="M10 3.5c-1.38 0-2.5 1.12-2.5 2.5 0 1.38 2.5 5.333 2.5 5.333s2.5-3.953 2.5-5.333c0-1.38-1.12-2.5-2.5-2.5z" />
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-1.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z" clipRule="evenodd" />
  </svg>
);

export const SwordIcon = ({ className, style }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
        <path d="M6.22 8.22a.75.75 0 011.06 0l1.97 1.97-.88.88-1.97-1.97a.75.75 0 010-1.06z" />
        <path fillRule="evenodd" d="M8.636 6.364a.75.75 0 010 1.06L6.393 9.667a2.25 2.25 0 000 3.182l2.243 2.243a2.25 2.25 0 003.182 0l2.243-2.243a2.25 2.25 0 000-3.182L11.818 7.424a.75.75 0 011.06 0l2.475 2.475a3.75 3.75 0 010 5.303l-2.243 2.243a3.75 3.75 0 01-5.303 0l-2.243-2.243a3.75 3.75 0 010-5.303L8.636 6.364z" clipRule="evenodd" />
    </svg>
);

export const ChestIcon = ({ className, style }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
        <path d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5z" />
        <path d="M3 9a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2H3z" />
    </svg>
);

export const MobIcon = ({ className, style }: IconProps) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM6 9a1 1 0 011-1h1a1 1 0 110 2H7a1 1 0 01-1-1zm6 0a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-4 6a3 3 0 01-3-3h6a3 3 0 01-3 3z" clipRule="evenodd" />
  </svg>
);

export const StringIcon = ({ className, style }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} style={style}>
        <path d="M6 3c-3 3 1 9 5 9s8-6 5-9c-3-3-7 1-9 5s9 8 9 5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const FishingRodIcon = ({ className, style }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className={className} style={style}>
        <path d="M17 3L3 17" />
        <path d="M17 3l-6 10-4-2" />
    </svg>
);

export const FishIcon = ({ className, style }: IconProps) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className} style={style}>
         <path d="M10.22 1.05a.75.75 0 00-1.44-.02L4.01 6.52a.75.75 0 00-.22.53v5.9a.75.75 0 00.22.53l4.77 5.49a.75.75 0 001.44-.02l4.77-5.49a.75.75 0 00.22-.53v-5.9a.75.75 0 00-.22-.53L10.22 1.05z" />
    </svg>
);