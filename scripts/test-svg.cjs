const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Generate the primary artistic Pulse mark SVG
// Canvas size: 512x512
function generatePulseIconSvg({ withBackground = true, size = 512 } = {}) {
  const bg = withBackground ? `
    <!-- Deep obsidian squircle background with subtle glow -->
    <rect width="512" height="512" rx="128" fill="url(#bg-grad)" />
    <rect width="510" height="510" x="1" y="1" rx="127" fill="none" stroke="url(#border-grad)" stroke-width="2" opacity="0.6" />
    <!-- Ambient radial glow behind the pulse -->
    <circle cx="256" cy="256" r="180" fill="url(#ambient-glow)" opacity="0.45" />
  ` : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1F1E19" />
      <stop offset="50%" stop-color="#161512" />
      <stop offset="100%" stop-color="#0E0D0B" />
    </linearGradient>

    <linearGradient id="border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7A33" stop-opacity="0.8" />
      <stop offset="40%" stop-color="#F54E00" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#2E2C26" stop-opacity="0.2" />
    </linearGradient>

    <radialGradient id="ambient-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.6" />
      <stop offset="60%" stop-color="#F54E00" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Main Pulse Stroke & Fill Gradients -->
    <linearGradient id="pulse-grad-1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D04200" />
      <stop offset="35%" stop-color="#F54E00" />
      <stop offset="70%" stop-color="#FF7324" />
      <stop offset="100%" stop-color="#FFA24C" />
    </linearGradient>

    <linearGradient id="pulse-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFA959" />
      <stop offset="40%" stop-color="#F54E00" />
      <stop offset="100%" stop-color="#BD3800" />
    </linearGradient>

    <linearGradient id="spark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="40%" stop-color="#FFF0DF" />
      <stop offset="100%" stop-color="#FF9D42" />
    </linearGradient>

    <radialGradient id="spark-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.9" />
      <stop offset="30%" stop-color="#FFA84A" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Drop Shadow Filter for Artistic Dimension -->
    <filter id="glow-filter" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="soft-shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  ${bg}

  <!-- Geometric artistic mark: Stylized Pulse Stem + Kinetic Wave Loop + AI Spark -->
  <g filter="url(#soft-shadow)">
    <!-- Back loop glow -->
    <path d="M 172 136 C 240 110, 368 116, 368 214 C 368 296, 276 308, 172 308" 
          fill="none" 
          stroke="url(#pulse-grad-1)" 
          stroke-width="38" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          opacity="0.3"
          filter="url(#glow-filter)" />

    <!-- Left vertical stem (neural spine / "P" stem) with sleek pill caps -->
    <path d="M 172 132 L 172 380" 
          fill="none" 
          stroke="url(#pulse-grad-1)" 
          stroke-width="36" 
          stroke-linecap="round" />

    <!-- The Kinetic Pulse Wave that flows across and arches into the P-loop -->
    <!-- Flat in -> sharp heartbeat pulse spike (up & down) -> arch into P-loop -> reconnect -->
    <path d="M 172 260 L 220 260 L 246 174 L 282 334 L 314 242 L 340 260" 
          fill="none" 
          stroke="url(#pulse-grad-2)" 
          stroke-width="30" 
          stroke-linecap="round" 
          stroke-linejoin="round" />

    <!-- The Outer P-Loop enclosing the pulse with continuous energy flow -->
    <path d="M 172 136 C 252 120, 384 136, 384 228 C 384 316, 268 316, 172 316" 
          fill="none" 
          stroke="url(#pulse-grad-1)" 
          stroke-width="34" 
          stroke-linecap="round" 
          stroke-linejoin="round" />

    <!-- AI Core Sparkle (4-point diamond star of intelligence) -->
    <circle cx="288" cy="222" r="26" fill="url(#spark-glow)" />
    
    <path d="M 288 198 Q 288 222 264 222 Q 288 222 288 246 Q 288 222 312 222 Q 288 222 288 198 Z" 
          fill="url(#spark-grad)" />

    <!-- Highlight bead / energy token at the end of the stem -->
    <circle cx="172" cy="132" r="9" fill="#FFF2E5" opacity="0.9" />
  </g>
</svg>`;
}

console.log("SVG template defined");
