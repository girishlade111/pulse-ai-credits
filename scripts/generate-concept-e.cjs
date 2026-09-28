const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, 'preview');

function renderConceptE() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Canvas: Deep Obsidian Charcoal with Warm Ambient Depth -->
    <linearGradient id="bg-obsidian" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E1D19" />
      <stop offset="50%" stop-color="#141310" />
      <stop offset="100%" stop-color="#0A0908" />
    </linearGradient>

    <!-- Outer Precision Rim: Glowing Electric Orange Hairline -->
    <linearGradient id="rim-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7528" stop-opacity="0.95" />
      <stop offset="35%" stop-color="#F54E00" stop-opacity="0.5" />
      <stop offset="70%" stop-color="#332F26" stop-opacity="0.2" />
      <stop offset="100%" stop-color="#FF944D" stop-opacity="0.6" />
    </linearGradient>

    <!-- Core Ambient Halo behind the Pulse Mark -->
    <radialGradient id="core-glow" cx="50%" cy="48%" r="50%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.45" />
      <stop offset="45%" stop-color="#F54E00" stop-opacity="0.14" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Continuous Pulse Ribbon Gradient -->
    <linearGradient id="pulse-flow" x1="10%" y1="90%" x2="90%" y2="10%">
      <stop offset="0%" stop-color="#C43800" />
      <stop offset="20%" stop-color="#F54E00" />
      <stop offset="45%" stop-color="#FF6B26" />
      <stop offset="70%" stop-color="#FFA248" />
      <stop offset="90%" stop-color="#FFC58A" />
      <stop offset="100%" stop-color="#FFFFFF" />
    </linearGradient>

    <!-- Stem Gradient (Solid, grounded, energetic) -->
    <linearGradient id="stem-flow" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#BD3A00" />
      <stop offset="45%" stop-color="#F54E00" />
      <stop offset="100%" stop-color="#FF7528" />
    </linearGradient>

    <!-- Diamond Core Glow -->
    <radialGradient id="spark-radial" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="30%" stop-color="#FFB366" stop-opacity="0.85" />
      <stop offset="65%" stop-color="#F54E00" stop-opacity="0.35" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <!-- Shadow for Depth and Tactile Feel -->
    <filter id="mark-shadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="10" stdDeviation="14" flood-color="#000000" flood-opacity="0.6" />
    </filter>

    <!-- Bloom Filter for Ultra-modern High-tech Radiance -->
    <filter id="mark-bloom" x="-25%" y="-25%" width="150%" height="150%">
      <feGaussianBlur stdDeviation="5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Squircle Base -->
  <rect width="512" height="512" rx="120" fill="url(#bg-obsidian)" />
  <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#rim-gradient)" stroke-width="2" />
  
  <!-- Ambient Inner Aura -->
  <circle cx="260" cy="245" r="185" fill="url(#core-glow)" />

  <g filter="url(#mark-shadow)" transform="translate(10, 0)">
    <!-- Seamless Continuous "P" + Pulse Geometry -->
    <!--
      The entire monogram and pulse wave are rendered with precision:
      Stem: from (165, 375) rising to (165, 150)
      Crown arch: sweeps to (270, 130) and down to (375, 215)
      Waist loop: curves inward to (325, 290)
      Dynamic AI Pulse spike: climbs to (276, 172)
      Plunges to: (232, 290)
      Connects to stem at: (165, 290)
    -->

    <!-- Main Vertical Stem with rounded pill ends -->
    <path d="M 165 375 L 165 150" 
          stroke="url(#stem-flow)" 
          stroke-width="38" 
          stroke-linecap="round" />

    <!-- Seamless Kinetic Pulse Loop -->
    <path d="M 165 150 
             C 240 126, 375 140, 375 220 
             C 375 264, 348 290, 318 290 
             L 278 174 
             L 238 290 
             L 165 290"
          fill="none"
          stroke="url(#pulse-flow)"
          stroke-width="36"
          stroke-linecap="round"
          stroke-linejoin="round"
          filter="url(#mark-bloom)" />

    <!-- Radiant AI Core Spark (Intelligence Sparkle) -->
    <circle cx="278" cy="174" r="28" fill="url(#spark-radial)" />
    <!-- 4-point Diamond Star -->
    <path d="M 278 148 Q 278 174 252 174 Q 278 174 278 200 Q 278 174 304 174 Q 278 174 278 148 Z"
          fill="#FFFFFF" />

    <!-- Credit Node Accent at the bottom of the stem (Token of Value) -->
    <circle cx="165" cy="375" r="10" fill="#FFA554" />
    <circle cx="165" cy="375" r="4.5" fill="#FFFFFF" />
  </g>
</svg>`;
}

// Also test a variant E2 without background for inline transparent use
function renderConceptETransparent() {
  return renderConceptE()
    .replace('<rect width="512" height="512" rx="120" fill="url(#bg-obsidian)" />', '')
    .replace('<rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#rim-gradient)" stroke-width="2" />', '');
}

async function run() {
  const svgE = renderConceptE();
  fs.writeFileSync(path.join(outDir, 'concept-e.svg'), svgE);

  // Render at 512, 128, 64, 32, 16 to inspect legibility
  await sharp(Buffer.from(svgE)).resize(512, 512).png().toFile(path.join(outDir, 'concept-e-512.png'));
  await sharp(Buffer.from(svgE)).resize(128, 128).png().toFile(path.join(outDir, 'concept-e-128.png'));
  await sharp(Buffer.from(svgE)).resize(64, 64).png().toFile(path.join(outDir, 'concept-e-64.png'));
  await sharp(Buffer.from(svgE)).resize(32, 32).png().toFile(path.join(outDir, 'concept-e-32.png'));
  await sharp(Buffer.from(svgE)).resize(16, 16).png().toFile(path.join(outDir, 'concept-e-16.png'));

  console.log("Rendered Concept E at 512, 128, 64, 32, 16");
}

run().catch(console.error);
