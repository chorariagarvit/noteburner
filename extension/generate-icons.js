const sharp = require('sharp');
const fs = require('fs');

async function createIcon(size) {
  // Create SVG with flame icon matching website favicon
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#ef4444"/>
          <stop offset="100%" style="stop-color:#dc2626"/>
        </linearGradient>
      </defs>
      
      <!-- Background with rounded corners -->
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
      
      <!-- Flame icon scaled and centered (matches website favicon) -->
      <g transform="translate(${size * 0.15}, ${size * 0.15}) scale(${size / 35})">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" 
              fill="#ffffff" stroke="#fef3c7" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"/>
      </g>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`icons/icon${size}.png`);
  
  console.log(`✓ Created icon${size}.png (matching website favicon)`);
}

(async () => {
  try {
    await createIcon(16);
    await createIcon(48);
    await createIcon(128);
    console.log('✓ All icons created successfully!');
  } catch (error) {
    console.error('Error creating icons:', error);
    process.exit(1);
  }
})();
