// Vendors MediaPipe's wasm runtime + the face landmarker model into public/
// so the app never depends on a CDN at demo time.
// Runs on postinstall and before build. Must never hard-fail an install.
import { mkdir, copyFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wasmSrc = join(root, 'node_modules', '@mediapipe', 'tasks-vision', 'wasm');
const wasmDst = join(root, 'public', 'mp', 'wasm');
const modelDst = join(root, 'public', 'mp', 'models', 'face_landmarker.task');
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

// The package ships three builds. FilesetResolver feature-detects SIMD and
// fetches `vision_wasm_internal` on any modern browser, falling back to
// `vision_wasm_nosimd_internal` on older ones (Safari < 16.4, Chrome < 91).
// The `vision_wasm_module_internal` pair is only used by ESM-style loading,
// which we do not do — skipping it saves ~11 MB in the deployed build.
const WASM_PREFIXES = ['vision_wasm_internal', 'vision_wasm_nosimd_internal'];

async function copyWasm() {
  if (!existsSync(wasmSrc)) {
    console.warn('[assets] @mediapipe/tasks-vision not installed yet — skipping wasm copy.');
    return false;
  }
  await mkdir(wasmDst, { recursive: true });
  const all = await readdir(wasmSrc);
  const wanted = all.filter((f) => WASM_PREFIXES.some((p) => f.startsWith(p + '.')));
  if (!wanted.length) {
    console.warn(`[assets] no expected wasm files found in ${wasmSrc}; copying everything.`);
    for (const f of all) await copyFile(join(wasmSrc, f), join(wasmDst, f));
    return true;
  }
  for (const f of wanted) await copyFile(join(wasmSrc, f), join(wasmDst, f));
  // drop anything a previous, less selective run left behind
  for (const f of await readdir(wasmDst)) {
    if (!wanted.includes(f)) await rm(join(wasmDst, f), { force: true });
  }
  console.log(`[assets] wasm runtime vendored (${wanted.length} files).`);
  return true;
}

async function fetchModel() {
  if (existsSync(modelDst)) {
    const { size } = await stat(modelDst);
    if (size > 1_000_000) {
      console.log(`[assets] model already present (${(size / 1e6).toFixed(1)} MB).`);
      return true;
    }
  }
  await mkdir(dirname(modelDst), { recursive: true });
  try {
    console.log('[assets] downloading face_landmarker.task (~3.8 MB)...');
    const res = await fetch(MODEL_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(modelDst, Buffer.from(await res.arrayBuffer()));
    const { size } = await stat(modelDst);
    console.log(`[assets] model vendored (${(size / 1e6).toFixed(1)} MB).`);
    return true;
  } catch (err) {
    console.warn(`[assets] MODEL DOWNLOAD FAILED: ${err.message}`);
    console.warn('[assets] The app will still run in SIMULATION MODE.');
    console.warn(`[assets] To fix: download ${MODEL_URL}`);
    console.warn('[assets] and save it to public/mp/models/face_landmarker.task');
    return false;
  }
}

await copyWasm();
await fetchModel();
