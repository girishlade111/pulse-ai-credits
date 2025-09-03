import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// Minimalistic SaaS Icons
export const MinimalisticIcons = {
  // Plan Icons
  Free: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <circle 
        cx="12" 
        cy="12" 
        r="8" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <circle 
        cx="12" 
        cy="12" 
        r="3" 
        fill="currentColor" 
        opacity="0.3"
      />
    </svg>
  ),

  Starter: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <path 
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),

  Pro: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <path 
        d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 17.2l-6.4 4L8 14l-6-4.8h7.6L12 2z" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  ),

  Business: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <rect 
        x="3" 
        y="4" 
        width="18" 
        height="16" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <line 
        x1="7" 
        y1="8" 
        x2="17" 
        y2="8" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <line 
        x1="7" 
        y1="12" 
        x2="13" 
        y2="12" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <line 
        x1="7" 
        y1="16" 
        x2="11" 
        y2="16" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  ),

  // Feature Icons
  Search: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <circle 
        cx="11" 
        cy="11" 
        r="8" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <path 
        d="m21 21-4.35-4.35" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  ),

  Research: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <path 
        d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <circle 
        cx="12" 
        cy="13" 
        r="3" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  ),

  Image: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <rect 
        x="3" 
        y="3" 
        width="18" 
        height="18" 
        rx="2" 
        ry="2" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <circle 
        cx="9" 
        cy="9" 
        r="2" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <path 
        d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  ),

  Credits: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <rect 
        x="2" 
        y="7" 
        width="20" 
        height="10" 
        rx="2" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <circle 
        cx="7" 
        cy="12" 
        r="2" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <path 
        d="M17 12h.01" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  ),

  Check: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <path 
        d="m9 12 2 2 4-4" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  ),

  Close: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <path 
        d="m15 9-6 6" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path 
        d="m9 9 6 6" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
    </svg>
  ),

  Warning: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <path 
        d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <line 
        x1="12" 
        y1="9" 
        x2="12" 
        y2="13" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round"
      />
      <path 
        d="M12 17h.01" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round"
      />
    </svg>
  ),

  Gift: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={className}
    >
      <rect 
        x="3" 
        y="8" 
        width="18" 
        height="4" 
        rx="1" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <rect 
        x="4" 
        y="12" 
        width="16" 
        height="8" 
        rx="1" 
        stroke="currentColor" 
        strokeWidth="1.5"
        fill="none"
      />
      <line 
        x1="12" 
        y1="8" 
        x2="12" 
        y2="20" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <path 
        d="M8 8V6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
      <path 
        d="M16 8V6a2 2 0 0 0-2-2h0a2 2 0 0 0-2 2v2" 
        stroke="currentColor" 
        strokeWidth="1.5"
      />
    </svg>
  ),

  Loader: ({ className = "", size = 24 }: IconProps) => (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      className={`animate-spin ${className}`}
    >
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="32"
        strokeDashoffset="32"
        opacity="0.3"
        fill="none"
      />
      <circle 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="8"
        strokeDashoffset="8"
        fill="none"
      />
    </svg>
  )
};

export default MinimalisticIcons;