const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, 'preview');

function generate5ARefined(size = 512) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">
  <defs>
    <!-- Background Canvas: Deep Obsidian Charcoal with Warm Ambient Depth -->
    <linearGradient id="p-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#191815" />
      <stop offset="50%" stop-color="#12110F" />
      <stop offset="100%" stop-color="#080706" />
    </linearGradient>

    <!-- Outer Precision Rim: Glowing Electric Orange Hairline -->
    <linearGradient id="p-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7528" stop-opacity="0.95" />
      <stop offset="35%" stop-color="#F54E00" stop-opacity="0.45" />
      <stop offset="70%" stop-color="#28251F" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#FFA248" stop-opacity="0.65" />
    </linearGradient>

    <!-- Core Ambient Halo behind the Pulse Mark -->
    <radialGradient id="p-halo" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.45" />
      <stop offset="45%" stop-color="#F54E00" stop-opacity="0.14" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Dynamic Pulse Gradient -->
    <linearGradient id="p-orange" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#C23800" />
      <stop offset="22%" stop-color="#F54E00" />
      <stop offset="50%" stop-color="#FF6B26" />
      <stop offset="78%" stop-color="#FFA248" />
      <stop offset="100%" stop-color="#FFD4A8" />
    </linearGradient>

    <!-- Stem Gradient (Solid, grounded, energetic) -->
    <linearGradient id="p-stem" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#BA3700" />
      <stop offset="40%" stop-color="#F54E00" />
      <stop offset="100%" stop-color="#FF7528" />
    </linearGradient>

    <!-- Diamond Core Glow -->
    <radialGradient id="p-spark" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="30%" stop-color="#FFA54A" stop-opacity="0.9" />
      <stop offset="65%" stop-color="#F54E00" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Drop Shadow for Tactile Depth -->
    <filter id="p-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.7" />
    </filter>

    <!-- Subtle Bloom Glow -->
    <filter id="p-bloom" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Squircle Base (Curvature matches iOS / modern premium icon standards) -->
  <rect width="512" height="512" rx="120" fill="url(#p-bg)" />
  <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#p-border)" stroke-width="2" />
  
  <!-- Subtle Internal Radial Aura -->
  <circle cx="260" cy="240" r="185" fill="url(#p-halo)" />

  <g filter="url(#p-shadow)" transform="translate(6, 0)">
    <!-- Vertical Spine (Neural Stem) with rounded pill ends -->
    <rect x="146" y="122" width="38" height="268" rx="19" fill="url(#p-stem)" />

    <!--
      Seamless "P" Loop with Integrated "A" Pulse Wave:
      - Starts at top shoulder (165, 138)
      - Arches gracefully around crown to (368, 196)
      - Sweeps inward to (296, 264)
      - Dynamic pulse surge climbs to (258, 154)
      - Drops to (220, 264)
      - Locks horizontally into stem at (165, 264)
    -->
    <path d="M 165 140 
             C 248 116, 368 126, 368 196 
             C 368 244, 332 264, 296 264 
             L 258 152 
             L 220 264 
             L 165 264"
          fill="none"
          stroke="url(#p-orange)"
          stroke-width="34"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#p-bloom)" />

    <!-- Radiant AI Core Spark (Intelligence Sparkle) -->
    <circle cx="258" cy="152" r="26" fill="url(#p-spark)" />
    <!-- 4-point Diamond Star -->
    <path d="M 258 128 Q 258 152 234 152 Q 258 152 258 176 Q 258 152 282 152 Q 258 152 258 128 Z" 
          fill="#FFFFFF" />

    <!-- Glowing Credit Accent Dot (Micro Token at stem root) -->
    <circle cx="165" cy="371" r="8" fill="#FFA554" />
    <circle cx="165" cy="371" r="3.5" fill="#FFFFFF" />
  </g>
</svg>`;
}

async function run() {
  const svg = generate5ARefined(512);
  fs.writeFileSync(path.join(outDir, 'pulse-favicon-512.svg'), svg);

  const sizes = [512, 180, 64, 48, 32, 16];
  for (const size of sizes) {
    await sharp(Buffer.from(svg))
      .resize(size, size)
      .png()
      .toFile(path.join(outDir, `pulse-favicon-${size}.png`));
  }

  console.log("Rendered all sizes successfully!");
}

run().catch(console.error);
