const sharp = require('sharp');
const fs = require('fs');

async function createIcon(size) {
  // Create SVG with fire emoji
  const svg = `
    <svg width="${size}" height="${size}">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#FF6B35"/>
          <stop offset="100%" style="stop-color:#F7931E"/>
        </linearGradient>
      </defs>
      <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="url(#grad)"/>
      <text x="50%" y="50%" font-size="${size * 0.7}" text-anchor="middle" dy=".3em">🔥</text>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`icons/icon${size}.png`);
  
  console.log(`✓ Created icon${size}.png`);
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
