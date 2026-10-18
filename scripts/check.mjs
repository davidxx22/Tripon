import {readFile,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
for(const file of ['public/app.js','public/assistant.js','public/history.js','public/profile.js','public/core.js','public/trips.js','public/sync.js','public/sync-core.js','public/sw.js','worker/api.js'])execFileSync(process.execPath,['--check',file]);
const manifest=JSON.parse(await readFile('public/manifest.webmanifest','utf8'));
if(manifest.name!=='Tripon'||manifest.display!=='standalone')throw new Error('Invalid app manifest');
for(const icon of manifest.icons)await access('public/'+icon.src.replace('./',''));
await access('public/index.html');
console.log('Tripon syntax, manifest, and required assets passed.');
