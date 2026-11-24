#!/usr/bin/env node
/**
 * export-models.mjs — Exports all procedural 3D builders to binary GLB files
 * inside public/models/. Run with: npm run export-models
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join, resolve } from 'path';

class NodeFileReader {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then(buf => {
      this.result = buf;
      if (this.onloadend) this.onloadend();
    });
  }
}
globalThis.FileReader = NodeFileReader;

const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
const { BUILDERS } = await import('../src/viewer/procedural/index.js');

const MODELS_DIR = resolve('public/models');
mkdirSync(MODELS_DIR, { recursive: true });

const exporter = new GLTFExporter();

for (const [topicId, builder] of Object.entries(BUILDERS)) {
  const model = builder();
  const gltf = await exporter.parseAsync(model, { binary: true });
  const buffer = Buffer.from(gltf);
  const outPath = join(MODELS_DIR, `${topicId}.glb`);
  writeFileSync(outPath, buffer);
  console.log(`✅ Exported ${topicId}.glb (${(buffer.length / 1024).toFixed(1)} KB)`);
}

