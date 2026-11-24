# Bio3D — Interactive 3D Biology Learning

An interactive 3D biology explorer built with **Three.js** and **Vite**. Inspect biological specimens in 3D, click individual structures, step through guided tours, toggle exploded views, and test yourself with labeling and quiz modes.

**Live Demo:** https://bio3d-seven.vercel.app

## Features

- **7 Interactive 3D Models:** Animal Cell, Plant Cell, Bacteria, Human Heart, Leaf, Flower, and Fish
- **Explore Mode:** Clickable structures with smooth camera focus, highlighting, translucent outer-shell smart picking, and level-appropriate explanations
- **Exploded View & Guided Tour:** Separate structures spatially to inspect internal anatomy or step through curated part-by-part tours
- **Label & Quiz Modes:** Interactive labeling challenges and knowledge checks per specimen
- **Procedural & Python GLB Pipelines:** Supports both Node procedural Three.js builders (`scripts/export-models.mjs`) and Python NumPy mesh generators (`tools/build_cell.py`, `tools/build_heart.py`)

## Project Structure

- `index.html`, `category.html`, `viewer.html`, `about.html` — Multi-page Vite entry points
- `src/` — Three.js scene, picking, highlighting, animator, viewer modes (`explore`, `label`, `quiz`), UI components, and procedural builders
- `public/content/` — Catalog (`index.json`) and per-topic metadata, annotations, and quiz items (`topics/*.json`)
- `public/models/` — Exported `.glb` 3D assets
- `scripts/` — `export-models.mjs` and `validate-content.mjs`
- `tools/` — Python + NumPy `.glb` generators (`glbkit.py`, `build_cell.py`, `build_heart.py`)

## Local Development

```bash
npm install
npm run validate
npm run dev
```

### Build for Production

```bash
npm run build
```

### Regenerating 3D Models

```bash
# Procedural Node-exported models (bacteria, fish, flower, leaf, plant-cell)
npm run export-models

# High-detail Python GLB models (requires Python 3 + NumPy)
python3 tools/build_cell.py public/models/animal-cell.glb
python3 tools/build_heart.py public/models/human-heart.glb
```
