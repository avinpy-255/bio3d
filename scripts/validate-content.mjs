#!/usr/bin/env node
/**
 * validate-content.mjs — CI content validator.
 *
 * Run with: npm run validate
 *
 * Validates:
 *  1. JSON schema: required fields present, types correct
 *  2. Quiz answer references: answer IDs/indices are valid
 *  3. Licence fields: all non-empty
 *  4. Catalog sync: every published topic JSON has an index.json entry and vice versa
 *  5. GLB budget: file size ≤ 2 MB (skipped if no GLB exists yet)
 *  6. GLB mesh check: meshNames exist in GLB (requires @gltf-transform/core, skipped if unavailable)
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

// ── Paths ─────────────────────────────────────────────────────────────
const ROOT       = resolve('.');
const CONTENT    = join(ROOT, 'public/content');
const TOPICS_DIR = join(CONTENT, 'topics');
const MODELS_DIR = join(ROOT, 'public/models');

let errors = 0;
let warnings = 0;

function err(msg)  { console.error('  ❌ ERROR:', msg); errors++; }
function warn(msg) { console.warn ('  ⚠️  WARN:', msg);  warnings++; }
function ok(msg)   { console.log  ('  ✅', msg); }

// ── Load catalog ──────────────────────────────────────────────────────
const catalogPath = join(CONTENT, 'index.json');
if (!existsSync(catalogPath)) {
  console.error('❌ FATAL: public/content/index.json not found');
  process.exit(1);
}
const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
const catalogMap = new Map(catalog.topics.map(t => [t.id, t]));

// ── Get topic JSON files ──────────────────────────────────────────────
if (!existsSync(TOPICS_DIR)) {
  console.error('❌ FATAL: public/content/topics/ not found');
  process.exit(1);
}
const topicFiles = readdirSync(TOPICS_DIR).filter(f => f.endsWith('.json'));

if (topicFiles.length === 0) {
  warn('No topic JSON files found in public/content/topics/');
}

// ── Validate each topic ───────────────────────────────────────────────
for (const file of topicFiles) {
  const topicId = file.replace('.json', '');
  const topicPath = join(TOPICS_DIR, file);

  console.log(`\n📋 Validating: ${topicId}`);

  let topic;
  try {
    topic = JSON.parse(readFileSync(topicPath, 'utf8'));
  } catch (e) {
    err(`Invalid JSON in ${file}: ${e.message}`);
    continue;
  }

  // 1. Required top-level fields
  for (const field of ['id', 'title', 'category', 'model', 'camera', 'parts', 'quiz']) {
    if (topic[field] == null) err(`Missing required field: "${field}"`);
  }
  if (topic.id !== topicId) err(`topic.id "${topic.id}" does not match filename "${topicId}"`);

  // 2. Model fields
  if (topic.model) {
    for (const field of ['src', 'source', 'author', 'licence']) {
      if (!topic.model[field]) err(`model.${field} is required (licence matters!)`);
    }
  }

  // 3. Camera fields
  if (topic.camera) {
    for (const field of ['position', 'target', 'minDistance', 'maxDistance']) {
      if (topic.camera[field] == null) err(`camera.${field} is required`);
    }
    if (!Array.isArray(topic.camera.position) || topic.camera.position.length !== 3)
      err('camera.position must be [x, y, z]');
    if (!Array.isArray(topic.camera.target) || topic.camera.target.length !== 3)
      err('camera.target must be [x, y, z]');
  }

  // 4. Parts validation
  const partIds = new Set();
  for (const part of topic.parts ?? []) {
    if (!part.id)                       { err('Part missing id'); continue; }
    if (partIds.has(part.id))           err(`Duplicate part id: "${part.id}"`);
    partIds.add(part.id);

    if (!['basic', 'neet'].includes(part.level))
      err(`Part "${part.id}": invalid level "${part.level}" (must be "basic" or "neet")`);

    if (!Array.isArray(part.meshNames) || part.meshNames.length === 0)
      err(`Part "${part.id}": meshNames must be a non-empty array`);

    if (!Array.isArray(part.anchor) || part.anchor.length !== 3)
      err(`Part "${part.id}": anchor must be [x, y, z]`);

    if (!part.name?.en) err(`Part "${part.id}": name.en is required`);
    if (!part.short?.en) err(`Part "${part.id}": short.en is required`);

    // Check NEET parts have detail
    if (part.level === 'neet' && !part.detail?.en)
      warn(`Part "${part.id}" is NEET level but has no detail text`);
  }

  ok(`${partIds.size} parts validated`);

  // 5. Quiz validation
  const quizIds = new Set();
  for (const q of topic.quiz ?? []) {
    if (!q.id)   { err('Quiz item missing id'); continue; }
    if (quizIds.has(q.id)) err(`Duplicate quiz id: "${q.id}"`);
    quizIds.add(q.id);

    for (const field of ['type', 'level', 'question', 'answer']) {
      if (q[field] == null) err(`Quiz "${q.id}": missing "${field}"`);
    }

    if (!['basic', 'neet'].includes(q.level))
      err(`Quiz "${q.id}": invalid level "${q.level}"`);

    if (!['mcq', 'tap-part'].includes(q.type))
      err(`Quiz "${q.id}": invalid type "${q.type}"`);

    if (q.type === 'mcq') {
      if (!Array.isArray(q.options) || q.options.length < 2)
        err(`Quiz "${q.id}": mcq needs at least 2 options`);
      if (typeof q.answer !== 'number' || q.answer < 0 || q.answer >= (q.options?.length ?? 0))
        err(`Quiz "${q.id}": answer index ${q.answer} is out of range`);
    }

    if (q.type === 'tap-part') {
      if (typeof q.answer !== 'string')
        err(`Quiz "${q.id}": tap-part answer must be a part id string`);
      else if (!partIds.has(q.answer))
        err(`Quiz "${q.id}": answer "${q.answer}" is not a valid part id`);
    }

    if (!q.explanation?.en) warn(`Quiz "${q.id}": no explanation text`);
    if (!q.question?.en)    err(`Quiz "${q.id}": question.en is required`);
  }

  ok(`${quizIds.size} quiz items validated`);

  // 6. Catalog sync
  if (!catalogMap.has(topicId)) {
    err(`Topic "${topicId}" has a JSON file but no entry in index.json`);
  } else {
    ok('Found in catalog index.json');
  }

  // 7. GLB check (optional)
  const glbPath = join(MODELS_DIR, `${topicId}.glb`);
  if (existsSync(glbPath)) {
    const stats = statSync(glbPath);
    const sizeMB = stats.size / (1024 * 1024);
    if (sizeMB > 2) {
      err(`GLB too large: ${sizeMB.toFixed(2)} MB (hard limit: 2 MB)`);
    } else if (sizeMB > 1) {
      warn(`GLB size ${sizeMB.toFixed(2)} MB exceeds 1 MB target`);
    } else {
      ok(`GLB size: ${(stats.size / 1024).toFixed(0)} KB ✓`);
    }

    // Deep validation with @gltf-transform/core (optional dependency)
    try {
      const { NodeIO } = await import('@gltf-transform/core');
      const io = new NodeIO();
      const document = await io.read(glbPath);
      // In glTF, object/part names can be on Nodes (standard Blender/Three.js export) or Meshes
      const nodeNames = new Set(document.getRoot().listNodes().map(n => n.getName()).filter(Boolean));
      const meshNames = new Set(document.getRoot().listMeshes().map(m => m.getName()).filter(Boolean));
      const availableNames = new Set([...nodeNames, ...meshNames]);

      let missingMeshes = 0;
      for (const part of topic.parts ?? []) {
        for (const meshName of part.meshNames ?? []) {
          if (!availableNames.has(meshName)) {
            err(`Part "${part.id}": mesh/node "${meshName}" not found in GLB (available: ${[...availableNames].join(', ')})`);
            missingMeshes++;
          }
        }
      }
      if (missingMeshes === 0) ok('All meshNames found in GLB ✓');
    } catch (e) {
      if (e.code === 'ERR_MODULE_NOT_FOUND' || e.message.includes('Cannot find')) {
        warn('@gltf-transform/core not installed — deep GLB mesh check skipped');
      } else {
        warn(`GLB deep check failed: ${e.message}`);
      }
    }
  } else {
    warn(`No GLB at public/models/${topicId}.glb — procedural model will be used (expected for Phase 1)`);
  }
}

// ── Check catalog entries have matching JSON files ────────────────────
console.log('\n📂 Checking catalog → topic file sync...');
for (const [id, entry] of catalogMap) {
  if (entry.status !== 'published') continue;
  const path = join(TOPICS_DIR, `${id}.json`);
  if (!existsSync(path)) {
    err(`Catalog entry "${id}" (status: published) has no matching topics/${id}.json`);
  }
}

// ── Summary ───────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(52));
if (errors === 0) {
  console.log(`✅ All validations passed! (${warnings} warning${warnings !== 1 ? 's' : ''})`);
  process.exit(0);
} else {
  console.error(`❌ ${errors} error${errors !== 1 ? 's' : ''}, ${warnings} warning${warnings !== 1 ? 's' : ''}`);
  process.exit(1);
}

