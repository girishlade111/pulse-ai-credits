const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const publicDir = path.join(__dirname, '..', 'public');

// --- SVG DEFINITIONS ---

// Master Pulse Mark SVG (512x512 with squircle container)
function getPulseMarkSvg({ size = 512, withBackground = true } = {}) {
  const bg = withBackground ? `
    <rect width="512" height="512" rx="120" fill="url(#p-bg)" />
    <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#p-border)" stroke-width="2" />
    <circle cx="260" cy="240" r="185" fill="url(#p-halo)" />
  ` : '';

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

  ${bg}

  <g filter="url(#p-shadow)" transform="translate(6, 0)">
    <!-- Vertical Spine (Neural Stem) with rounded pill ends -->
    <rect x="146" y="122" width="38" height="268" rx="19" fill="url(#p-stem)" />

    <!--
      Seamless "P" Loop with Integrated "A" Pulse Wave:
      - Starts at top shoulder (165, 140)
      - Arches gracefully around crown to (368, 196)
      - Sweeps inward to (296, 264)
      - Dynamic pulse surge climbs to (258, 152)
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

// Master Horizontal Logo (Icon + Wordmark)
function getFullLogoSvg({ width = 460, height = 120 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 120" width="${width}" height="${height}">
  <defs>
    <linearGradient id="fl-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#191815" />
      <stop offset="100%" stop-color="#080706" />
    </linearGradient>

    <linearGradient id="fl-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FF7528" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#FFA248" stop-opacity="0.4" />
    </linearGradient>

    <radialGradient id="fl-halo" cx="50%" cy="45%" r="50%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.45" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="fl-orange" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#C23800" />
      <stop offset="30%" stop-color="#F54E00" />
      <stop offset="70%" stop-color="#FFA248" />
      <stop offset="100%" stop-color="#FFD4A8" />
    </linearGradient>

    <linearGradient id="fl-stem" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#BA3700" />
      <stop offset="50%" stop-color="#F54E00" />
      <stop offset="100%" stop-color="#FF7528" />
    </linearGradient>

    <radialGradient id="fl-spark" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="1" />
      <stop offset="35%" stop-color="#FFA54A" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- Left Icon Mark (Scaled into 88x88 box at x=16, y=16) -->
  <g transform="translate(16, 16) scale(0.171875)">
    <!-- Squircle Base -->
    <rect width="512" height="512" rx="120" fill="url(#fl-bg)" />
    <rect width="510" height="510" x="1" y="1" rx="119" fill="none" stroke="url(#fl-border)" stroke-width="3" />
    <circle cx="260" cy="240" r="185" fill="url(#fl-halo)" />

    <g transform="translate(6, 0)">
      <rect x="146" y="122" width="38" height="268" rx="19" fill="url(#fl-stem)" />
      <path d="M 165 140 
               C 248 116, 368 126, 368 196 
               C 368 244, 332 264, 296 264 
               L 258 152 
               L 220 264 
               L 165 264"
            fill="none"
            stroke="url(#fl-orange)"
            stroke-width="34"
            stroke-linecap="round"
            stroke-linejoin="round" />

      <circle cx="258" cy="152" r="26" fill="url(#fl-spark)" />
      <path d="M 258 128 Q 258 152 234 152 Q 258 152 258 176 Q 258 152 282 152 Q 258 152 258 128 Z" fill="#FFFFFF" />
      <circle cx="165" cy="371" r="8" fill="#FFA554" />
      <circle cx="165" cy="371" r="3.5" fill="#FFFFFF" />
    </g>
  </g>

  <!-- Typography: Modern Geometric Wordmark with Perfect Kerning via tspan -->
  <g transform="translate(122, 68)">
    <text font-family="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
          font-size="44" 
          font-weight="600" 
          letter-spacing="-0.03em" 
          fill="#26251E">Pulse<tspan fill="#F54E00" font-weight="700">.</tspan><tspan fill="#5A5852" font-weight="500">ai</tspan></text>

    <!-- Tagline: Credit-Based AI Workspace -->
    <text x="2" y="24"
          font-family="'JetBrains Mono', monospace" 
          font-size="11" 
          font-weight="500" 
          letter-spacing="2.2" 
          text-transform="uppercase" 
          fill="#807D72">CREDIT-BASED WORKSPACE</text>
  </g>
</svg>`;
}

// Social Open Graph Card (1200x630)
function getSocialCardSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="card-bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#181714" />
      <stop offset="50%" stop-color="#100F0D" />
      <stop offset="100%" stop-color="#080706" />
    </linearGradient>

    <radialGradient id="card-glow" cx="30%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.25" />
      <stop offset="60%" stop-color="#F54E00" stop-opacity="0.05" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="grid-fade" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F54E00" stop-opacity="0.1" />
      <stop offset="100%" stop-color="#F54E00" stop-opacity="0" />
    </linearGradient>
  </defs>

  <!-- Canvas -->
  <rect width="1200" height="630" fill="url(#card-bg)" />
  <circle cx="360" cy="315" r="450" fill="url(#card-glow)" />

  <!-- Subtle grid lines in background -->
  <g stroke="url(#grid-fade)" stroke-width="1">
    <line x1="0" y1="105" x2="1200" y2="105" />
    <line x1="0" y1="210" x2="1200" y2="210" />
    <line x1="0" y1="315" x2="1200" y2="315" />
    <line x1="0" y1="420" x2="1200" y2="420" />
    <line x1="0" y1="525" x2="1200" y2="525" />
  </g>

  <!-- Large Pulse Mark on Left -->
  <g transform="translate(100, 155) scale(0.625)">
    ${getPulseMarkSvg({ size: 512, withBackground: true }).replace(/<svg[^>]*>|<\/svg>/g, '')}
  </g>

  <!-- Content on Right -->
  <g transform="translate(480, 255)">
    <text font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="76" font-weight="700" letter-spacing="-0.03em" fill="#FFFFFF">Pulse<tspan fill="#F54E00">.</tspan><tspan fill="#A09C92" font-weight="400">ai</tspan></text>
    <text y="64" font-family="'Inter', -apple-system, BlinkMacSystemFont, sans-serif" font-size="28" font-weight="400" fill="#A09C92">Credit-based AI workspace</text>
    
    <g transform="translate(0, 115)">
      <rect width="470" height="48" rx="8" fill="#1F1E19" stroke="#333129" stroke-width="1" />
      <text x="20" y="30" font-family="'JetBrains Mono', monospace" font-size="13" fill="#FFA554">⚡ SEARCH • RESEARCH • IMAGE GEN • AUTOMATION</text>
    </g>
  </g>
</svg>`;
}

// Convert Array of PNG buffers into multi-resolution .ico format
function createIco(images) {
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * count;
  let currentOffset = headerSize + dirSize;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(count, 4); // count

  const dirEntries = [];
  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width === 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height === 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image size
    entry.writeUInt32LE(currentOffset, 12); // offset
    dirEntries.push(entry);
    currentOffset += img.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...images.map(img => img.buffer)]);
}

async function buildAll() {
  console.log("Building all brand & favicon assets...");

  const markSvg = getPulseMarkSvg({ size: 512, withBackground: true });
  const markTransparentSvg = getPulseMarkSvg({ size: 512, withBackground: false });
  const fullLogoSvg = getFullLogoSvg();
  const socialSvg = getSocialCardSvg();

  // 1. Write SVG assets
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), markSvg);
  fs.writeFileSync(path.join(publicDir, 'pulse-icon.svg'), markSvg);
  fs.writeFileSync(path.join(publicDir, 'pulse-icon-transparent.svg'), markTransparentSvg);
  fs.writeFileSync(path.join(publicDir, 'pulse-logo.svg'), fullLogoSvg);

  // 2. Generate PNG sizes
  const p16 = await sharp(Buffer.from(markSvg)).resize(16, 16).png().toBuffer();
  const p32 = await sharp(Buffer.from(markSvg)).resize(32, 32).png().toBuffer();
  const p48 = await sharp(Buffer.from(markSvg)).resize(48, 48).png().toBuffer();
  const p180 = await sharp(Buffer.from(markSvg)).resize(180, 180).png().toBuffer();
  const p512 = await sharp(Buffer.from(markSvg)).resize(512, 512).png().toBuffer();

  // Apple touch icon (180x180)
  fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), p180);
  
  // High-res icon mark (512x512)
  fs.writeFileSync(path.join(publicDir, 'pulse-icon.png'), p512);

  // 3. Build multi-resolution ICO file (16, 32, 48)
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: p16 },
    { width: 32, height: 32, buffer: p32 },
    { width: 48, height: 48, buffer: p48 }
  ]);
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), icoBuffer);
  console.log(`Generated favicon.ico (${icoBuffer.length} bytes)`);

  // 4. Social Open Graph Card (1200x630)
  await sharp(Buffer.from(socialSvg)).png().toFile(path.join(publicDir, 'pulse-og-image.png'));
  // Also create pulse-logo.png
  await sharp(Buffer.from(fullLogoSvg)).png().toFile(path.join(publicDir, 'pulse-logo.png'));

  console.log("All brand and favicon assets created successfully in /public!");
}

buildAll().catch(console.error);
