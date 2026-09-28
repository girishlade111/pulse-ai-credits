const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ensure output dir exists
const outDir = path.join(__dirname, 'preview');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Design Variation A: The Unified Kinetic Pulse "P"
function renderConceptA() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg-grad-a" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1C1B17" />
      <stop offset="50%" stop-color="#141310" />
      <stop offset="100%" stop-color="#0C0B0A" />
    </linearGradient>

    <!-- Outer Rim Glow -->
    <linearGradient id="rim-grad-a" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B2B" stop-opacity="0.8" />
      <stop offset="50%" stop-color="#F54E00" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#24221D" stop-opacity="0.4" />
    </linearGradient>

    <!-- Ambient Center Glow -->
    <radialGradient id="center-glow-a" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.35" />
      <stop offset="50%" stop-color="#F54E00" stop-opacity="0.12" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Main Dynamic Pulse Ribbon Gradient -->
    <linearGradient id="ribbon-grad" x1="10%" y1="90%" x2="90%" y2="10%">
      <stop offset="0%" stop-color="#D04200" />
      <stop offset="25%" stop-color="#F54E00" />
      <stop offset="60%" stop-color="#FF7528" />
      <stop offset="85%" stop-color="#FFA24A" />
      <stop offset="100%" stop-color="#FFBD75" />
    </linearGradient>

    <!-- Secondary Pulse Line Gradient -->
    <linearGradient id="pulse-line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#F54E00" />
      <stop offset="50%" stop-color="#FFB366" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>

    <!-- Spark Glow -->
    <radialGradient id="spark-glow-a" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="35%" stop-color="#FFA24A" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#F54E00" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <filter id="soft-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Squircle -->
  <rect width="512" height="512" rx="128" fill="url(#bg-grad-a)" />
  <rect width="510" height="510" x="1" y="1" rx="127" fill="none" stroke="url(#rim-grad-a)" stroke-width="2" />
  
  <!-- Subtle ambient aura -->
  <circle cx="256" cy="256" r="190" fill="url(#center-glow-a)" />

  <!-- THE ICONIC LOGO EMBLEM -->
  <g>
    <!-- Background pulse wave reflection / underglow -->
    <path d="M 120 264 L 186 264 L 216 196 L 254 332 L 290 220 L 320 264 L 392 264"
          fill="none"
          stroke="#F54E00"
          stroke-width="24"
          stroke-linecap="round"
          stroke-linejoin="round"
          opacity="0.25"
          filter="url(#soft-glow)" />

    <!-- Solid Main Pulse Stem ("P" spine) -->
    <path d="M 172 136 L 172 376"
          fill="none"
          stroke="url(#ribbon-grad)"
          stroke-width="38"
          stroke-linecap="round" />

    <!-- "P" Head Outer Arc -->
    <path d="M 172 136 C 248 116, 372 136, 372 230 C 372 314, 260 318, 172 318"
          fill="none"
          stroke="url(#ribbon-grad)"
          stroke-width="38"
          stroke-linecap="round"
          stroke-linejoin="round" />

    <!-- Kinetic Heartbeat Wave inside the P -->
    <path d="M 172 260 L 218 260 L 244 186 L 276 314 L 306 238 L 328 260 L 366 260"
          fill="none"
          stroke="url(#pulse-line-grad)"
          stroke-width="22"
          stroke-linecap="round"
          stroke-linejoin="round" />

    <!-- Radiant AI Core Spark (Intelligence Sparkle) in the upper focal quadrant -->
    <circle cx="282" cy="186" r="32" fill="url(#spark-glow-a)" />
    <!-- 4-point Diamond Star -->
    <path d="M 282 160 Q 282 186 256 186 Q 282 186 282 212 Q 282 186 308 186 Q 282 186 282 160 Z"
          fill="#FFFFFF" />

    <!-- Dynamic micro credit pip at stem base -->
    <circle cx="172" cy="376" r="10" fill="#FFA959" />
  </g>
</svg>`;
}

// Concept B: Clean Geometric Origami / Prismatic Faceted Pulse
function renderConceptB() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg-grad-b" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A1916" />
      <stop offset="100%" stop-color="#0E0D0C" />
    </linearGradient>

    <linearGradient id="rim-b" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7528" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0.2" />
    </linearGradient>

    <linearGradient id="grad-p1" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#D04200" />
      <stop offset="100%" stop-color="#F54E00" />
    </linearGradient>

    <linearGradient id="grad-p2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFA24A" />
      <stop offset="60%" stop-color="#F54E00" />
      <stop offset="100%" stop-color="#C23B00" />
    </linearGradient>

    <linearGradient id="grad-wave" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF5A05" />
      <stop offset="50%" stop-color="#FFAA5C" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>

    <radialGradient id="spark-b" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="40%" stop-color="#FFA24A" stop-opacity="0.6" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="512" height="512" rx="128" fill="url(#bg-grad-b)" />
  <rect width="510" height="510" x="1" y="1" rx="127" fill="none" stroke="url(#rim-b)" stroke-width="2" />
  
  <g transform="translate(16, 0)">
    <!-- Vertical Column / Neural Trunk -->
    <rect x="136" y="128" width="44" height="256" rx="22" fill="url(#grad-p1)" />

    <!-- Bold Curved Monogram Loop -->
    <path d="M 158 128 C 246 128, 360 148, 360 224 C 360 300, 246 320, 158 320"
          fill="none"
          stroke="url(#grad-p2)"
          stroke-width="44"
          stroke-linecap="round" />

    <!-- Integrated Electric Pulse Wave traversing horizontally through the loop -->
    <path d="M 104 256 L 158 256 L 192 180 L 236 328 L 274 216 L 298 256 L 360 256"
          fill="none"
          stroke="url(#grad-wave)"
          stroke-width="20"
          stroke-linecap="round"
          stroke-linejoin="round" />

    <!-- Synapse Star Core -->
    <circle cx="260" cy="180" r="28" fill="url(#spark-b)" />
    <path d="M 260 156 Q 260 180 236 180 Q 260 180 260 204 Q 260 180 284 180 Q 260 180 260 156 Z"
          fill="#FFFFFF" />
  </g>
</svg>`;
}

async function run() {
  const svgA = renderConceptA();
  const svgB = renderConceptB();
  
  fs.writeFileSync(path.join(outDir, 'concept-a.svg'), svgA);
  fs.writeFileSync(path.join(outDir, 'concept-b.svg'), svgB);

  await sharp(Buffer.from(svgA)).png().toFile(path.join(outDir, 'concept-a.png'));
  await sharp(Buffer.from(svgB)).png().toFile(path.join(outDir, 'concept-b.png'));
  
  console.log("Rendered concepts A and B to PNG and SVG");
}

run().catch(console.error);
