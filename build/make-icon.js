// Generates assets/icon.png (512x512) and assets/icon.ico from assets/logo.svg.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const pngToIco = require('png-to-ico');

(async () => {
  const assets = path.join(__dirname, '..', 'assets');
  const svg = fs.readFileSync(path.join(assets, 'logo.svg'));
  const png = await sharp(svg).resize(512, 512).png().toBuffer();
  fs.writeFileSync(path.join(assets, 'icon.png'), png);
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngs = await Promise.all(sizes.map(s => sharp(svg).resize(s, s).png().toBuffer()));
  fs.writeFileSync(path.join(assets, 'icon.ico'), await pngToIco(pngs));
  console.log('Wrote assets/icon.png and assets/icon.ico');
})().catch(e => { console.error(e); process.exit(1); });
