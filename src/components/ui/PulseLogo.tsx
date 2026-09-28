import React from "react";

export interface PulseLogoProps {
  /**
   * Visual variant:
   * - "full": Mark + "Pulse.ai" wordmark (default)
   * - "mark": Squircle icon badge
   * - "icon": Transparent mark only (no background)
   * - "wordmark": Typography only
   */
  variant?: "full" | "mark" | "icon" | "wordmark";
  /** Size preset or custom pixel number */
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  /** Whether to enable micro-pulse breathing animation on the AI core spark */
  animated?: boolean;
  /** Custom additional CSS class */
  className?: string;
  /** Optional secondary subtitle or tag */
  subtitle?: string;
  /** Whether to show the dot as an interactive accent */
  showDot?: boolean;
}

const SIZE_MAP = {
  xs: { icon: 20, text: "text-sm", gap: "gap-2" },
  sm: { icon: 26, text: "text-[15px]", gap: "gap-2.5" },
  md: { icon: 32, text: "text-lg", gap: "gap-3" },
  lg: { icon: 42, text: "text-2xl", gap: "gap-3.5" },
  xl: { icon: 56, text: "text-3xl", gap: "gap-4" },
};

/**
 * Pure SVG vector Mark component
 */
export const PulseMark: React.FC<{
  size?: number;
  withBackground?: boolean;
  animated?: boolean;
  className?: string;
}> = ({ size = 26, withBackground = true, animated = false, className = "" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      className={`shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Background Canvas: Deep Obsidian Charcoal */}
        <linearGradient id="pl-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#191815" />
          <stop offset="50%" stopColor="#12110F" />
          <stop offset="100%" stopColor="#080706" />
        </linearGradient>

        {/* Outer Precision Rim Hairline */}
        <linearGradient id="pl-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF7528" stopOpacity="0.95" />
          <stop offset="35%" stopColor="#F54E00" stopOpacity="0.45" />
          <stop offset="70%" stopColor="#28251F" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#FFA248" stopOpacity="0.65" />
        </linearGradient>

        {/* Core Ambient Halo */}
        <radialGradient id="pl-halo" cx="50%" cy="45%" r="50%">
          <stop offset="0%" stopColor="#F54E00" stopOpacity="0.45" />
          <stop offset="45%" stopColor="#F54E00" stopOpacity="0.14" />
          <stop offset="100%" stopColor="#F54E00" stopOpacity="0" />
        </radialGradient>

        {/* Dynamic Pulse Wave Gradient */}
        <linearGradient id="pl-orange" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#C23800" />
          <stop offset="22%" stopColor="#F54E00" />
          <stop offset="50%" stopColor="#FF6B26" />
          <stop offset="78%" stopColor="#FFA248" />
          <stop offset="100%" stopColor="#FFD4A8" />
        </linearGradient>

        {/* Vertical Stem Gradient */}
        <linearGradient id="pl-stem" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#BA3700" />
          <stop offset="40%" stopColor="#F54E00" />
          <stop offset="100%" stopColor="#FF7528" />
        </linearGradient>

        {/* Spark Star Radial Glow */}
        <radialGradient id="pl-spark" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="30%" stopColor="#FFA54A" stopOpacity="0.9" />
          <stop offset="65%" stopColor="#F54E00" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#F54E00" stopOpacity="0" />
        </radialGradient>

        {/* Tactile Drop Shadow */}
        <filter id="pl-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000000" floodOpacity="0.7" />
        </filter>

        {/* Glow Bloom */}
        <filter id="pl-bloom" x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {withBackground && (
        <g>
          <rect width="512" height="512" rx="120" fill="url(#pl-bg)" />
          <rect
            width="510"
            height="510"
            x="1"
            y="1"
            rx="119"
            fill="none"
            stroke="url(#pl-border)"
            strokeWidth="2"
          />
          <circle cx="260" cy="240" r="185" fill="url(#pl-halo)" />
        </g>
      )}

      <g filter="url(#pl-shadow)" transform="translate(6, 0)">
        {/* Vertical Spine (Neural Stem) */}
        <rect x="146" y="122" width="38" height="268" rx="19" fill="url(#pl-stem)" />

        {/*
          Seamless "P" Loop with Integrated "A" Pulse Wave:
          - Starts at shoulder (165, 140)
          - Arches around crown to (368, 196)
          - Sweeps to (296, 264)
          - Surges dynamically to (258, 152)
          - Plunges to (220, 264)
          - Locks horizontally into stem at (165, 264)
        */}
        <path
          d="M 165 140 
             C 248 116, 368 126, 368 196 
             C 368 244, 332 264, 296 264 
             L 258 152 
             L 220 264 
             L 165 264"
          fill="none"
          stroke="url(#pl-orange)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#pl-bloom)"
        />

        {/* Radiant AI Core Spark (Intelligence Sparkle) */}
        <g className={animated ? "animate-pulse" : ""}>
          <circle cx="258" cy="152" r="26" fill="url(#pl-spark)" />
          <path
            d="M 258 128 Q 258 152 234 152 Q 258 152 258 176 Q 258 152 282 152 Q 258 152 258 128 Z"
            fill="#FFFFFF"
          />
        </g>

        {/* Micro Token at stem root */}
        <circle cx="165" cy="371" r="8" fill="#FFA554" />
        <circle cx="165" cy="371" r="3.5" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

/**
 * World-class Brand Logo for Pulse AI
 */
export const PulseLogo: React.FC<PulseLogoProps> = ({
  variant = "full",
  size = "sm",
  animated = false,
  className = "",
  subtitle,
}) => {
  const sizeConfig = typeof size === "number" ? { icon: size, text: "text-base", gap: "gap-2.5" } : SIZE_MAP[size];

  if (variant === "mark") {
    return (
      <PulseMark
        size={sizeConfig.icon}
        withBackground={true}
        animated={animated}
        className={className}
      />
    );
  }

  if (variant === "icon") {
    return (
      <PulseMark
        size={sizeConfig.icon}
        withBackground={false}
        animated={animated}
        className={className}
      />
    );
  }

  return (
    <span className={`inline-flex items-center ${sizeConfig.gap} ${className}`}>
      {variant !== "wordmark" && (
        <PulseMark
          size={sizeConfig.icon}
          withBackground={true}
          animated={animated}
        />
      )}
      <span className="flex flex-col leading-none">
        <span
          className={`font-semibold tracking-tight text-ink ${sizeConfig.text} font-sans`}
        >
          Pulse<span className="text-primary font-bold">.</span>
          <span className="text-muted-foreground font-medium">ai</span>
        </span>
        {subtitle && (
          <span className="caption-uppercase tracking-wider text-muted text-[10px] mt-0.5">
            {subtitle}
          </span>
        )}
      </span>
    </span>
  );
};

export default PulseLogo;
