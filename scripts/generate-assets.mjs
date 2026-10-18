import {mkdir,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=require(process.env.TRIPON_NODE_MODULES ? process.env.TRIPON_NODE_MODULES+'/sharp' : 'sharp');
await mkdir('public/assets',{recursive:true});
// An original travel case: two companion coins follow a shared rising route.
const mark=`<g fill="none" stroke="#0eaa92" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M24 14v-3a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v3"/><rect x="9" y="14" width="46" height="42" rx="12"/><path d="M17 49h30"/><circle cx="22" cy="31" r="6"/><circle cx="36" cy="38" r="5"/><path d="m34 27 11-7m-6 0h6v6"/></g>`;
const svg=(body,w,h)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
const icon=svg(mark,64,64);
await writeFile('public/assets/icon.svg',icon);
for(const [variant,color] of [['light','#172c29'],['dark','#edf3ee']]){
  const wordmark=svg(`${mark}<text x="73" y="47" fill="${color}" font-family="Segoe UI,Arial,sans-serif" font-size="43" font-weight="700" letter-spacing="-2">Tripon<tspan fill="#0eaa92">.</tspan></text>`,230,64);
  await writeFile(`public/assets/tripon-wordmark-${variant}.svg`,wordmark);
  await sharp(Buffer.from(wordmark)).resize(920,256).png().toFile(`public/assets/tripon-wordmark-${variant}.png`);
  await writeFile(`public/assets/tripon-icon-${variant}.svg`,icon);
  await sharp(Buffer.from(icon)).resize(512,512).png().toFile(`public/assets/tripon-icon-${variant}.png`);
}
const appIcon=svg(`<rect width="512" height="512" rx="112" fill="#e6f6ef"/><g transform="translate(48 44) scale(6.5)">${mark}</g>`,512,512);
for(const size of [192,512])await sharp(Buffer.from(appIcon)).resize(size,size).png().toFile(`public/assets/icon-${size}.png`);
await sharp(Buffer.from(appIcon)).resize(180,180).png().toFile('public/assets/apple-touch-icon.png');
// Entire mark remains within the central 80%-diameter safe circle.
const maskable=svg(`<rect width="512" height="512" fill="#e6f6ef"/><g transform="translate(96 96) scale(5)">${mark}</g>`,512,512);
await writeFile('public/assets/icon-maskable.svg',maskable);
await sharp(Buffer.from(maskable)).png().toFile('public/assets/icon-maskable-512.png');
console.log('SVG logos, transparent PNG variants, favicon, and PWA icons generated.');

