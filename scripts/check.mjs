import {readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const file of ['dist/app.js','dist/core.js','dist/sw.js'])execFileSync(process.execPath,['--check',file]);
const manifest=JSON.parse(await readFile('dist/manifest.webmanifest','utf8'));
if(manifest.name!=='Tripon'||manifest.display!=='standalone')throw new Error('Invalid app manifest');
for(const icon of manifest.icons)await access('dist/'+icon.src.replace('./',''));
await access('dist/index.html');
console.log('Tripon syntax, manifest, and required assets passed. Static app is ready in dist/.');
