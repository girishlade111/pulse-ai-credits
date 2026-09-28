const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const outDir = path.join(__dirname, 'preview');

// Common defs helper
function getCommonDefs(prefix) {
  return `
    <linearGradient id="${prefix}-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1A1916" />
      <stop offset="50%" stop-color="#12110F" />
      <stop offset="100%" stop-color="#0A0908" />
    </linearGradient>

    <linearGradient id="${prefix}-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7528" stop-opacity="0.9" />
      <stop offset="30%" stop-color="#F54E00" stop-opacity="0.4" />
      <stop offset="70%" stop-color="#2E2B24" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#FFA048" stop-opacity="0.6" />
    </linearGradient>

    <radialGradient id="${prefix}-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.38" />
      <stop offset="50%" stop-color="#F54E00" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="${prefix}-grad" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D04200" />
      <stop offset="25%" stop-color="#F54E00" />
      <stop offset="55%" stop-color="#FF6B26" />
      <stop offset="80%" stop-color="#FFA248" />
      <stop offset="100%" stop-color="#FFD1A3" />
    </linearGradient>

    <linearGradient id="${prefix}-flame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFA959" />
      <stop offset="50%" stop-color="#F54E00" />
      <stop offset="100%" stop-color="#B83800" />
    </linearGradient>

    <radialGradient id="${prefix}-spark" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="35%" stop-color="#FFA248" stop-opacity="0.8" />
      <stop offset="70%" stop-color="#F54E00" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <filter id="${prefix}-shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.65" />
    </filter>
  `;
}

// Design 1: "The Kinetic P-Pulse" (Fixed stem + harmonious pulse flow)
function renderDesign1() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>${getCommonDefs('d1')}</defs>
  <rect width="512" height="512" rx="120" fill="url(#d1-bg)" />
  <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#d1-border)" stroke-width="2" />
  <circle cx="256" cy="256" r="180" fill="url(#d1-glow)" />

  <g filter="url(#d1-shadow)" transform="translate(4, 0)">
    <!-- Vertical stem: from y=136 to y=376 -->
    <line x1="168" y1="140" x2="168" y2="372" 
          stroke="url(#d1-grad)" 
          stroke-width="36" 
          stroke-linecap="round" />

    <!-- Pulse Loop: Arches from stem top, sweeps around, then plunges into heartbeat pulse -->
    <path d="M 168 140 
             C 246 116, 374 132, 374 218 
             C 374 266, 344 294, 308 294 
             L 272 176 
             L 236 294 
             L 168 294"
          fill="none"
          stroke="url(#d1-grad)"
          stroke-width="34"
          stroke-linecap="round"
          stroke-linejoin="round" />

    <!-- AI Spark at Pulse Crest -->
    <circle cx="272" cy="176" r="26" fill="url(#d1-spark)" />
    <path d="M 272 152 Q 272 176 248 176 Q 272 176 272 200 Q 272 176 296 176 Q 272 176 272 152 Z" 
          fill="#FFFFFF" />

    <!-- Token dot at stem bottom -->
    <circle cx="168" cy="372" r="9" fill="#FFA554" />
    <circle cx="168" cy="372" r="4" fill="#FFFFFF" />
  </g>
</svg>`;
}

// Design 2: "The Interlocking Synapse Pulse" (Architectural negative space)
// Clean separate stem + loop with integrated horizontal pulse waveform that interlocks with precision negative space
function renderDesign2() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>${getCommonDefs('d2')}</defs>
  <rect width="512" height="512" rx="120" fill="url(#d2-bg)" />
  <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#d2-border)" stroke-width="2" />
  <circle cx="256" cy="256" r="180" fill="url(#d2-glow)" />

  <g filter="url(#d2-shadow)">
    <!-- Neural Stem -->
    <rect x="136" y="130" width="42" height="252" rx="21" fill="url(#d2-grad)" />

    <!-- Outer 'P' Head Arch -->
    <path d="M 204 130 C 290 130, 376 150, 376 226 C 376 302, 290 322, 204 322"
          fill="none"
          stroke="url(#d2-flame)"
          stroke-width="38"
          stroke-linecap="round" />

    <!-- Central Precision Pulse Wave (Floating effortlessly through the core) -->
    <path d="M 104 256 L 160 256 L 198 172 L 244 336 L 286 216 L 316 256 L 372 256"
          fill="none"
          stroke="#FFFFFF"
          stroke-width="16"
          stroke-linecap="round"
          stroke-linejoin="round" />

    <!-- Glowing Node at the Pulse Peak -->
    <circle cx="198" cy="172" r="24" fill="url(#d2-spark)" />
    <circle cx="198" cy="172" r="6" fill="#FFFFFF" />

    <!-- Glowing Node at Secondary Peak -->
    <circle cx="286" cy="216" r="18" fill="url(#d2-spark)" />
    <circle cx="286" cy="216" r="5" fill="#FFFFFF" />
  </g>
</svg>`;
}

// Design 3: "The Quantum Pulse Prism" (Isometric 3D Hexagon / AI Core)
function renderDesign3() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    ${getCommonDefs('d3')}
    <linearGradient id="facet-top" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7528" />
      <stop offset="100%" stop-color="#F54E00" />
    </linearGradient>
    <linearGradient id="facet-left" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D04200" />
      <stop offset="100%" stop-color="#9C2F00" />
    </linearGradient>
    <linearGradient id="facet-right" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F54E00" />
      <stop offset="100%" stop-color="#BD3800" />
    </linearGradient>
  </defs>

  <rect width="512" height="512" rx="120" fill="url(#d3-bg)" />
  <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#d3-border)" stroke-width="2" />
  <circle cx="256" cy="256" r="180" fill="url(#d3-glow)" />

  <g filter="url(#d3-shadow)">
    <!-- Isometric Prism Cube / Diamond forming dynamic P silhouette -->
    <!-- Top Face -->
    <path d="M 256 120 L 370 186 L 256 252 L 142 186 Z" fill="url(#facet-top)" />
    <!-- Left Face (Stem) -->
    <path d="M 142 186 L 256 252 L 256 392 L 142 326 Z" fill="url(#facet-left)" />
    <!-- Right Face (Loop) -->
    <path d="M 256 252 L 370 186 L 370 310 L 256 376 Z" fill="url(#facet-right)" opacity="0.9" />

    <!-- Inner Neon Pulse Line running through the isometric facets -->
    <path d="M 142 256 L 198 256 L 236 170 L 276 330 L 316 220 L 344 256 L 370 256"
          fill="none"
          stroke="#FFFFFF"
          stroke-width="14"
          stroke-linecap="round"
          stroke-linejoin="round" />

    <!-- Pulse Diamond Spark -->
    <circle cx="236" cy="170" r="24" fill="url(#d3-spark)" />
    <circle cx="236" cy="170" r="6" fill="#FFFFFF" />
  </g>
</svg>`;
}

// Design 4: "The Dynamic Neo-Wave" (Pure energetic pulse waveform that loops into a stylized P)
function renderDesign4() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>${getCommonDefs('d4')}</defs>
  <rect width="512" height="512" rx="120" fill="url(#d4-bg)" />
  <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#d4-border)" stroke-width="2" />
  <circle cx="256" cy="256" r="180" fill="url(#d4-glow)" />

  <g filter="url(#d4-shadow)" transform="translate(10, 0)">
    <!-- Pulse Wave: Starts as flat signal from bottom, shoots up, pulses in the center, and forms the P loop -->
    <!-- Vertical stem -->
    <rect x="148" y="130" width="38" height="252" rx="19" fill="url(#d4-grad)" />

    <!-- P Loop consisting of dynamic dual pulse waves -->
    <path d="M 186 149 C 260 149, 364 165, 364 235 C 364 305, 260 321, 186 321"
          fill="none"
          stroke="url(#d4-grad)"
          stroke-width="38"
          stroke-linecap="round" />

    <!-- Active Vitality Pulse inside -->
    <path d="M 148 235 L 208 235 L 238 165 L 274 305 L 304 205 L 328 235 L 364 235"
          fill="none"
          stroke="#FFFFFF"
          stroke-width="14"
          stroke-linecap="round"
          stroke-linejoin="round" />

    <!-- Center AI Spark -->
    <circle cx="238" cy="165" r="22" fill="url(#d4-spark)" />
    <path d="M 238 145 Q 238 165 218 165 Q 238 165 238 185 Q 238 165 258 165 Q 238 165 238 145 Z" fill="#FFFFFF" />
  </g>
</svg>`;
}

async function run() {
  const d1 = renderDesign1();
  const d2 = renderDesign2();
  const d3 = renderDesign3();
  const d4 = renderDesign4();

  fs.writeFileSync(path.join(outDir, 'design-1.svg'), d1);
  fs.writeFileSync(path.join(outDir, 'design-2.svg'), d2);
  fs.writeFileSync(path.join(outDir, 'design-3.svg'), d3);
  fs.writeFileSync(path.join(outDir, 'design-4.svg'), d4);

  await sharp(Buffer.from(d1)).png().toFile(path.join(outDir, 'design-1.png'));
  await sharp(Buffer.from(d2)).png().toFile(path.join(outDir, 'design-2.png'));
  await sharp(Buffer.from(d3)).png().toFile(path.join(outDir, 'design-3.png'));
  await sharp(Buffer.from(d4)).png().toFile(path.join(outDir, 'design-4.png'));

  console.log("Rendered all 4 designs to PNG");
}

run().catch(console.error);
