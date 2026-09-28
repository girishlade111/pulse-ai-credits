const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, 'preview');

// Concept C: Unified Dynamic Ribbon "P" (The P and the Pulse are ONE seamless form)
function renderConceptC() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Rich Obsidian Canvas with Subtle Warmth -->
    <linearGradient id="bg-c" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1B1A16" />
      <stop offset="50%" stop-color="#12110E" />
      <stop offset="100%" stop-color="#080706" />
    </linearGradient>

    <!-- Refined Jewel Border -->
    <linearGradient id="border-c" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF6B2B" stop-opacity="0.9" />
      <stop offset="30%" stop-color="#F54E00" stop-opacity="0.4" />
      <stop offset="70%" stop-color="#26241E" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#FF8A3D" stop-opacity="0.5" />
    </linearGradient>

    <!-- Deep Ambient Orange Core Glow -->
    <radialGradient id="aura-c" cx="50%" cy="45%" r="55%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.4" />
      <stop offset="45%" stop-color="#F54E00" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Vibrant Multi-stop Pulse Ribbon Gradient -->
    <linearGradient id="ribbon-flow" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#B83800" />
      <stop offset="18%" stop-color="#F54E00" />
      <stop offset="45%" stop-color="#FF6F26" />
      <stop offset="70%" stop-color="#FFA048" />
      <stop offset="88%" stop-color="#FFC58A" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>

    <!-- Stem Gradient -->
    <linearGradient id="stem-flow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#BD3A00" />
      <stop offset="50%" stop-color="#F54E00" />
      <stop offset="100%" stop-color="#FF7528" />
    </linearGradient>

    <!-- Pulse Spike Glow -->
    <radialGradient id="spark-halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="25%" stop-color="#FFB366" stop-opacity="0.8" />
      <stop offset="60%" stop-color="#F54E00" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Soft Drop Shadow for Depth -->
    <filter id="shadow-c" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.65" />
    </filter>

    <!-- High-frequency Bloom -->
    <filter id="bloom-c" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="6" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Squircle Base (Curvature matches iOS / modern premium icon standards) -->
  <rect width="512" height="512" rx="120" fill="url(#bg-c)" />
  <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#border-c)" stroke-width="2" />
  
  <!-- Subtle Internal Glow Grid or Halo -->
  <circle cx="260" cy="240" r="180" fill="url(#aura-c)" />

  <g filter="url(#shadow-c)" transform="translate(10, 0)">
    <!-- THE MONOGRAM "P" WITH KINETIC PULSE INTEGRATION -->

    <!-- Vertical Spine (Neural Stem) with rounded tips -->
    <rect x="144" y="130" width="46" height="252" rx="23" fill="url(#stem-flow)" />

    <!-- Pulse Loop:
         Starts from top of stem at (167, 153),
         Arches smoothly around the crown to (368, 153) and down to (368, 225),
         Then dives inward into the signature sharp AI Pulse Wave:
         -> (325, 290)
         -> sharp upward burst to peak at (275, 172)
         -> drops to (225, 290)
         -> locks back into the stem at (167, 260)
    -->
    <path d="M 167 153 
             C 245 130, 376 142, 376 226 
             C 376 270, 350 292, 318 292 
             L 280 182 
             L 242 292 
             L 167 292"
          fill="none"
          stroke="url(#ribbon-flow)"
          stroke-width="40"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#bloom-c)" />

    <!-- AI Spark of Genesis (Glowing Diamond at Pulse Crest) -->
    <circle cx="280" cy="182" r="28" fill="url(#spark-halo)" />
    <!-- 4-point Diamond Star -->
    <path d="M 280 156 Q 280 182 254 182 Q 280 182 280 208 Q 280 182 306 182 Q 280 182 280 156 Z"
          fill="#FFFFFF" />

    <!-- Glowing Credit Accent Dot (Micro Token at stem root) -->
    <circle cx="167" cy="382" r="10" fill="#FFA554" />
    <circle cx="167" cy="382" r="5" fill="#FFFFFF" />
  </g>
</svg>`;
}

// Concept D: The "Sleek Minimalist Cyber-Pulse P" (Geometric & Ultra-Sharp)
// A bold modern glyph where the P's loop is an angular, high-tech pulse wave
function renderConceptD() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg-d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#191815" />
      <stop offset="100%" stop-color="#0B0A09" />
    </linearGradient>

    <linearGradient id="border-d" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7528" stop-opacity="0.8" />
      <stop offset="100%" stop-color="#24221D" stop-opacity="0.3" />
    </linearGradient>

    <radialGradient id="aura-d" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="pulse-d" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D04200" />
      <stop offset="30%" stop-color="#F54E00" />
      <stop offset="70%" stop-color="#FFA24A" />
      <stop offset="100%" stop-color="#FFD4A8" />
    </linearGradient>

    <filter id="shadow-d" x="-10%" y="-10%" width="125%" height="125%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.7" />
    </filter>
  </defs>

  <rect width="512" height="512" rx="120" fill="url(#bg-d)" />
  <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#border-d)" stroke-width="2" />
  <circle cx="256" cy="256" r="180" fill="url(#aura-d)" />

  <g filter="url(#shadow-d)" transform="translate(18, 0)">
    <!-- Vertical stem -->
    <path d="M 150 136 L 150 376" 
          stroke="url(#pulse-d)" 
          stroke-width="38" 
          stroke-linecap="round" />

    <!-- Pure geometric pulse that forms the upper loop of P -->
    <path d="M 150 148 L 246 148 L 282 226 L 318 108 L 358 266 L 392 186 L 406 200 C 406 270, 340 286, 270 286 L 150 286"
          fill="none"
          stroke="url(#pulse-d)"
          stroke-width="32"
          stroke-linecap="round"
          stroke-linejoin="round" />

    <!-- Floating AI Sparkle -->
    <path d="M 318 80 Q 318 96 302 96 Q 318 96 318 112 Q 318 96 334 96 Q 318 96 318 80 Z"
          fill="#FFFFFF" />
  </g>
</svg>`;
}

async function run() {
  const svgC = renderConceptC();
  const svgD = renderConceptD();
  
  fs.writeFileSync(path.join(outDir, 'concept-c.svg'), svgC);
  fs.writeFileSync(path.join(outDir, 'concept-d.svg'), svgD);

  await sharp(Buffer.from(svgC)).png().toFile(path.join(outDir, 'concept-c.png'));
  await sharp(Buffer.from(svgD)).png().toFile(path.join(outDir, 'concept-d.png'));
  
  console.log("Rendered concepts C and D to PNG and SVG");
}

run().catch(console.error);
