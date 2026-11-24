# SPEC.md — Interactive 3D Biology Learning Website

> **Status:** Draft v0.1 · 2026-11-24  
> **Decision owner:** project author  
> **Source plan:** `Interactive 3D Biology Learning Website - Project Plan.md`

---

## 1. Overview & Goals

### Problem

Students in classes 1–10 and NEET aspirants struggle with flat textbook diagrams. The heart's four chambers, the layers of a plant cell, the anatomy of a flower — these are inherently three-dimensional, but students see them only as 2D ink on paper. As a result, understanding, recall, and diagram-drawing suffer.

### Core Promise

> **Free to use. Free to host. Built with free tools. No paid APIs. No credits consumed.**

Every dependency — renderer, build tool, models, hosting — is open source or permanently free tier.

### Success Metrics

| Metric | Target |
|---|---|
| Initial page load (home) | < 2 s LCP on a 4G connection |
| Viewer load (model + JS) | < 4 s on slow 4G (≈ 1.5 Mbps) |
| Device target | ₹8–10k Android phone (2–3 GB RAM, mid-range GPU) |
| Frame rate | ≥ 30 fps during interaction on the device target |
| "Perfect before scaling" | Animal cell topic fully finished (all three modes, both levels, CI-validated) before a second topic is added |

---

## 2. Non-Goals (v1)

The following are **explicitly out of scope** for v1 and should not be designed around:

- User accounts, login, or any server-side session
- Backend or database (all data is static files)
- Hindi or any regional language UI (data is shaped for it, see §7)
- Voice explanations (planned for a later phase)
- Offline / PWA support
- Teacher mode or shareable quiz links
- Draw-and-compare mode
- Payment, ads, or monetisation of any kind

---

## 3. Users

### Primary personas

| Persona | Age | Devices | Key need |
|---|---|---|---|
| **Young learner** (Cl. 1–5) | 6–10 | Shared family Android phone | Big tap targets, fewest parts, simplest words |
| **Middle/secondary student** (Cl. 6–10) | 11–15 | Own or shared phone; occasional laptop | NCERT-accurate labels, label mode, quick quiz |
| **NEET aspirant** | 16–18+ | Phone + laptop | Full anatomical detail, all parts visible, harder quiz |

### Context

- Primarily mobile, often on a slow or metered data connection.
- May not have a keyboard (phone-only); touch-first interactions are non-negotiable.
- Many have never used a 3D viewer before — the interface must be self-explanatory.

---

## 4. Key Decisions

| Area | Decision | Reason |
|---|---|---|
| **3D engine** | Three.js | Full programmatic control over picking, highlight, pins, and animation; free and widely maintained |
| **Build tool** | Vite | Fast dev server, easy code-splitting, free; keeps home page tiny by lazy-loading Three.js |
| **UI framework** | Vanilla JS (no React/Vue) | Reduces bundle size; the UI is simple enough that a framework adds more overhead than value |
| **Routing** | Query-param (`viewer.html?topic=animal-cell`) | Works on static hosting (no server-side routing); simple to deep-link to a topic |
| **Hosting** | Cloudflare Pages | Free unlimited bandwidth on the free plan; edge CDN; preview deploys per branch |
| **Storage (progress)** | `localStorage` | No backend; survives a page refresh; easy `try/catch` for private-browsing graceful failure |
| **Analytics** | Cloudflare Web Analytics | Cookie-free, no GDPR banner needed, included with Cloudflare Pages |
| **Model optimisation** | `gltf-transform` CLI | Free, runs in CI, supports meshopt compression and WebP texture baking |
| **Fallback hosting** | GitHub Pages | Documented as an alternative; Vite `base` config covers the path prefix |

> **Decision log:** these defaults are easy to change. Each is noted in the relevant section. If a decision changes, update this table and the affected section.

---

## 5. Site Map & Routes

```
/index.html                   Home — category cards + search
/category.html?c=<id>         Category listing — topic cards
/viewer.html?topic=<id>       3D viewer for one topic
/about.html                   Credits, licences, open-source acknowledgements
```

### Pages

#### `index.html` — Home
- Four category cards: **Cells**, **Plants**, **Animals**, **Human Body**.
- Client-side search bar (searches `topics/index.json`).
- No Three.js loaded here; the home page JS bundle must stay < 30 KB gzip.

#### `category.html?c=<id>`
- Grid of topic cards. Each card shows thumbnail, title, and difficulty badge.
- Filter by level (Simple / NEET) using the global level toggle.

#### `viewer.html?topic=<id>`
- Three.js loaded lazily via dynamic `import()`.
- Mode tabs: **Explore** | **Label** | **Quiz**.
- Level toggle (Simple / NEET) in the top bar.
- Credits footer (author, licence, source URL).

#### `about.html`
- Aggregated credits from all topic JSONs.
- Code licence (MIT, pending confirmation) and content licence (CC BY-SA 4.0, pending confirmation).
- Links to source repositories and tools.

---

## 6. Feature Specifications

### 6.1 3D Viewer (core)

**Acceptance criteria:**

- [ ] OrbitControls with touch pinch-zoom, single-finger rotate, two-finger pan.
- [ ] Damping enabled (`enableDamping = true`, `dampingFactor = 0.08`).
- [ ] Zoom limits: `minDistance` and `maxDistance` set per topic in the topic JSON `camera` object.
- [ ] Reset-view button (icon + label): flies back to the topic's default `camera.position` and `camera.target`.
- [ ] Loading progress bar (0 → 100 %) driven by `GLTFLoader`'s `onProgress` callback.
- [ ] Error state: if the GLB fails to load, show an accessible error message and a 2D thumbnail with a parts list.
- [ ] Pixel-ratio capped at `Math.min(window.devicePixelRatio, 2)`.
- [ ] **Render-on-demand:** `renderer.setAnimationLoop(null)` when the scene is idle; re-triggered on pointer events, resize, and control changes. Saves battery on mobile.
- [ ] WebGL not supported: detect, show 2D thumbnail + parts list (no crash).

---

### 6.2 Explore Mode (tap to learn)

**Acceptance criteria:**

- [ ] Raycasting on `pointerup` (not `pointerdown` to avoid false positives during pan).
- [ ] Hit test resolves the clicked mesh name → looks up the matching `part` via `meshNames[]`.
- [ ] Selected part: emissive tint (`#fff` at 0.15 intensity). All other parts dimmed (material `opacity` 0.4, `transparent: true`).
- [ ] Info panel opens:
  - **Mobile (< 768 px):** slides up from the bottom as a bottom sheet (max 50 vh).
  - **Desktop (≥ 768 px):** fixed side panel (320 px wide, right side).
  - Shows: part `name`, `short` description. In NEET level, also shows `detail`.
- [ ] Tapping the canvas background (no mesh hit) deselects and restores all materials.
- [ ] **Parts list** (scrollable, below the canvas or in a collapsible drawer): lists all parts for the current level. Tapping a list item selects that part (same behaviour as raycasting) — this is the keyboard/screen-reader alternative to 3D tapping.
- [ ] Optional **isolate** toggle: hides all parts except the selected one.
- [ ] Optional **hide** toggle: makes the selected part invisible (useful for seeing hidden layers).

---

### 6.3 Label Mode

**Acceptance criteria:**

- [ ] Numbered pins are placed at each part's `anchor: [x, y, z]` using `CSS2DObject` (Three.js addon) so they always face the camera.
- [ ] All part names are hidden; pins show only their number.
- [ ] **Label tray:** a scrollable horizontal strip of label chips at the bottom of the screen.
- [ ] **Touch (mobile):** tap a pin, then tap a label chip to assign it.
- [ ] **Desktop enhancement:** drag a label chip onto a pin.
- [ ] Instant feedback: correct = green flash; wrong = red flash + chip returns to tray.
- [ ] "Show answer" button: reveals the correct label for a single pin without ending the session.
- [ ] Final score shown after all pins are labelled (or on a "Finish" button).
- [ ] Label mode only shows parts matching the current level.

---

### 6.4 Quiz Mode

**Acceptance criteria:**

- [ ] Two question types:
  - **`mcq`:** question text + 4 option chips; tap to answer.
  - **`tap-part`:** question text + live 3D scene; student taps the correct mesh.
- [ ] 5–10 questions per round, drawn from `quiz[]` filtered by level, then shuffled.
- [ ] After each answer: highlight correct option (green), wrong selection (red), show `explanation`.
- [ ] "Next" button to advance.
- [ ] After final question: score (`n / total`) + "Try again" and "Back to explore" buttons.
- [ ] Score saved to `localStorage` (best score per topic per level).

---

### 6.5 Level Toggle (Simple / NEET)

**Acceptance criteria:**

- [ ] Toggle is visible on the home, category, and viewer pages.
- [ ] Choice persisted in `localStorage` under key `bio3d_level`.
- [ ] On the viewer page, switching level in real time:
  - Filters parts list to those tagged with the current level.
  - Resets the info panel.
  - Resets label and quiz state if either mode is active.
- [ ] Default level: `basic` (Simple).

---

### 6.6 Search & Categories

**Acceptance criteria:**

- [ ] On home page load, fetch `public/content/index.json` (< 10 KB).
- [ ] Search is **client-side only**: filter the in-memory catalog by matching the query string against `title`, `aliases[]`, and `keywords[]`.
- [ ] Results shown as topic cards, navigating to `viewer.html?topic=<id>` on click.
- [ ] Empty state: "No results for '…'" with a suggestion to browse categories.
- [ ] No server round-trip for search.

---

### 6.7 Progress Tracking (Phase 5)

> Included here for completeness; not required for Phases 1–4.

- Best quiz score per topic per level stored in `localStorage` as `bio3d_progress_<topicId>_<level>`.
- Best label score stored similarly.
- Topic cards show a small progress badge (e.g. ★ 4/5 or ✓) when a score exists.
- `store/progress.js` wraps all `localStorage` access in `try/catch` so private-browsing never crashes the app.

---

## 7. Content Model (the Core Contract)

> **This is the most important section.** All features and all future topics depend on this schema being stable and correct.

### 7.1 Catalog — `public/content/index.json`

```json
{
  "version": 1,
  "topics": [
    {
      "id": "animal-cell",
      "title": { "en": "Animal Cell" },
      "category": "cells",
      "thumbnail": "/thumbs/animal-cell.webp",
      "aliases": ["eukaryotic cell", "human cell"],
      "keywords": ["cell", "nucleus", "membrane", "organelle"],
      "status": "published"
    }
  ]
}
```

`status` values: `"published"` | `"draft"` | `"coming-soon"`. Only `"published"` topics appear in public listings.

---

### 7.2 Topic JSON — `public/content/topics/<id>.json`

Full schema with the animal cell as a worked example:

```json
{
  "id": "animal-cell",
  "version": 1,
  "title": { "en": "Animal Cell" },
  "category": "cells",

  "model": {
    "src": "/models/animal-cell.glb",
    "sizeKB": 820,
    "source": "NIH 3D Print Exchange",
    "sourceUrl": "https://3dprint.nih.gov/discover/...",
    "author": "Original Author Name",
    "licence": "CC0",
    "credit": "",
    "modifications": "Cleaned up in Blender 4.x: applied transforms, re-named parts to part_<id> convention, reduced poly count, exported as GLB."
  },

  "camera": {
    "position": [0, 0, 4],
    "target": [0, 0, 0],
    "minDistance": 1.5,
    "maxDistance": 8
  },

  "parts": [
    {
      "id": "cell-membrane",
      "meshNames": ["part_cell-membrane"],
      "level": "basic",
      "name": { "en": "Cell Membrane" },
      "short": { "en": "A thin, flexible layer that surrounds the cell and controls what enters and leaves." },
      "detail": { "en": "A phospholipid bilayer with embedded proteins. Selectively permeable: allows water and small molecules to pass by osmosis and diffusion, while larger or charged molecules require protein channels or active transport. Also called the plasma membrane." },
      "anchor": [0, 1.1, 0],
      "aliases": ["plasma membrane", "plasmalemma"]
    },
    {
      "id": "nucleus",
      "meshNames": ["part_nucleus"],
      "level": "basic",
      "name": { "en": "Nucleus" },
      "short": { "en": "The control centre of the cell. It holds the DNA and directs all cell activities." },
      "detail": { "en": "Enclosed by a double-layered nuclear envelope perforated by nuclear pores. Contains chromatin (DNA + histone proteins) and one or more nucleoli that produce rRNA. Directs protein synthesis via mRNA transcription." },
      "anchor": [0, 0, 0],
      "aliases": ["cell nucleus"]
    },
    {
      "id": "mitochondria",
      "meshNames": ["part_mitochondria_1", "part_mitochondria_2", "part_mitochondria_3"],
      "level": "basic",
      "name": { "en": "Mitochondria" },
      "short": { "en": "The powerhouse of the cell. It converts food into energy the cell can use." },
      "detail": { "en": "Double-membraned organelle. The inner membrane is folded into cristae, increasing surface area for ATP synthesis via oxidative phosphorylation. Contains its own circular DNA and ribosomes, evidence of endosymbiotic origin." },
      "anchor": [0.6, 0.4, 0],
      "aliases": ["mitochondrion", "powerhouse"]
    },
    {
      "id": "endoplasmic-reticulum",
      "meshNames": ["part_er_rough", "part_er_smooth"],
      "level": "basic",
      "name": { "en": "Endoplasmic Reticulum" },
      "short": { "en": "A network of membranes that makes and transports proteins and fats." },
      "detail": { "en": "Rough ER (studded with ribosomes) folds and processes proteins destined for secretion or the membrane. Smooth ER (no ribosomes) synthesises lipids, metabolises carbohydrates, and detoxifies drugs. For NEET: rough and smooth ER are listed as separate parts (see ids `er-rough`, `er-smooth`)." },
      "anchor": [-0.5, 0.3, 0],
      "aliases": ["ER"]
    },
    {
      "id": "golgi-apparatus",
      "meshNames": ["part_golgi"],
      "level": "basic",
      "name": { "en": "Golgi Apparatus" },
      "short": { "en": "The cell's post office. It packages and ships proteins to where they are needed." },
      "detail": { "en": "A stack of flattened membrane sacs (cisternae). Receives vesicles from the rough ER (cis face), modifies and sorts proteins (glycosylation, phosphorylation), and dispatches them to lysosomes, the membrane, or for secretion (trans face)." },
      "anchor": [0.3, -0.5, 0],
      "aliases": ["Golgi body", "Golgi complex"]
    },
    {
      "id": "ribosomes",
      "meshNames": ["part_ribosomes"],
      "level": "basic",
      "name": { "en": "Ribosomes" },
      "short": { "en": "Tiny structures that build proteins by reading the cell's instructions." },
      "detail": { "en": "Made of rRNA and proteins (not membrane-bound). Free ribosomes make proteins for the cytoplasm; those on the rough ER make proteins for secretion or insertion into membranes. In prokaryotes, ribosomes are smaller (70S vs 80S in eukaryotes) — targeted by many antibiotics." },
      "anchor": [-0.3, -0.3, 0.2],
      "aliases": []
    },
    {
      "id": "lysosomes",
      "meshNames": ["part_lysosomes"],
      "level": "basic",
      "name": { "en": "Lysosomes" },
      "short": { "en": "The cell's recycling bins. They break down old or damaged parts of the cell." },
      "detail": { "en": "Membrane-bound vesicles containing hydrolytic enzymes active at pH ~5. Break down waste materials, foreign invaders (phagocytosis), and even the cell's own components (autophagy). Sometimes called 'suicide bags' (Lysosomes coined by Christian de Duve)." },
      "anchor": [-0.6, -0.2, 0],
      "aliases": ["lysosome"]
    },
    {
      "id": "vacuole",
      "meshNames": ["part_vacuole"],
      "level": "basic",
      "name": { "en": "Vacuole" },
      "short": { "en": "A storage bubble inside the cell. Animal cells have small vacuoles; plant cells have one large one." },
      "detail": { "en": "Membrane-bound sac. In animal cells, small vacuoles store water, ions, and waste. Food vacuoles form by phagocytosis; contractile vacuoles in some protists expel excess water (osmoregulation)." },
      "anchor": [0.1, 0.5, 0.1],
      "aliases": []
    },
    {
      "id": "centrosome",
      "meshNames": ["part_centrosome"],
      "level": "basic",
      "name": { "en": "Centrosome" },
      "short": { "en": "Organises the cell's skeleton and helps the cell divide." },
      "detail": { "en": "Consists of two centrioles at right angles, surrounded by pericentriolar material (PCM). Nucleates and anchors microtubules. During mitosis, the centrosome duplicates; each copy moves to a pole and organises the mitotic spindle." },
      "anchor": [-0.1, 0.7, 0.1],
      "aliases": ["centriole"]
    },
    {
      "id": "cytoplasm",
      "meshNames": ["part_cytoplasm"],
      "level": "basic",
      "name": { "en": "Cytoplasm" },
      "short": { "en": "The jelly-like fluid that fills the cell and holds all the organelles in place." },
      "detail": { "en": "Aqueous gel (cytosol) composed of water, ions, enzymes, and metabolites. Site of glycolysis and many biosynthetic reactions. Pervaded by the cytoskeleton (microfilaments, intermediate filaments, microtubules) which maintains cell shape and enables organelle movement." },
      "anchor": [0, 0, 0.5],
      "aliases": ["cytosol"]
    },
    {
      "id": "nucleolus",
      "meshNames": ["part_nucleolus"],
      "level": "neet",
      "name": { "en": "Nucleolus" },
      "short": { "en": "A region inside the nucleus that makes ribosomal RNA." },
      "detail": { "en": "Not membrane-bound; a phase-separated condensate within the nucleus. Contains rDNA (ribosomal DNA) loops from multiple chromosomes. Produces pre-rRNA transcripts that are processed and assembled with ribosomal proteins to form ribosomal subunits, which are then exported through nuclear pores." },
      "anchor": [0.1, 0.1, 0],
      "aliases": []
    },
    {
      "id": "nuclear-envelope",
      "meshNames": ["part_nuclear_envelope"],
      "level": "neet",
      "name": { "en": "Nuclear Envelope" },
      "short": { "en": "A double membrane that surrounds and protects the nucleus, with pores for communication." },
      "detail": { "en": "Two phospholipid bilayers (outer continuous with rough ER) perforated by ~2,000–3,000 nuclear pore complexes (NPCs) per nucleus. Each NPC (~120 MDa) is a selective gate for transport of mRNA, tRNA, and proteins between nucleus and cytoplasm." },
      "anchor": [0.3, 0.2, 0],
      "aliases": ["nuclear membrane", "nuclear pores"]
    },
    {
      "id": "er-rough",
      "meshNames": ["part_er_rough"],
      "level": "neet",
      "name": { "en": "Rough Endoplasmic Reticulum" },
      "short": { "en": "Part of the ER covered in ribosomes. It makes proteins for export." },
      "detail": { "en": "Continuous with the outer nuclear envelope. Ribosomes on its cytoplasmic face co-translationally insert newly synthesised proteins into its lumen, where chaperones fold them. Vesicles bud from transitional ER regions to carry cargo to the Golgi." },
      "anchor": [-0.6, 0.4, 0],
      "aliases": ["RER"]
    },
    {
      "id": "er-smooth",
      "meshNames": ["part_er_smooth"],
      "level": "neet",
      "name": { "en": "Smooth Endoplasmic Reticulum" },
      "short": { "en": "Part of the ER with no ribosomes. It makes fats and detoxifies the cell." },
      "detail": { "en": "Lacks ribosomes. Major site of phospholipid and steroid hormone synthesis (in steroidogenic cells). In liver cells, cytochrome P450 enzymes in the SER detoxify drugs and alcohol. Also sequesters Ca²⁺, which is released to trigger muscle contraction." },
      "anchor": [-0.4, 0.5, 0],
      "aliases": ["SER"]
    },
    {
      "id": "centrioles",
      "meshNames": ["part_centrioles"],
      "level": "neet",
      "name": { "en": "Centrioles" },
      "short": { "en": "Paired tube-like structures that organise the spindle during cell division." },
      "detail": { "en": "Each centriole is a cylinder of 9 triplet microtubule blades (9+0 arrangement, unlike ciliary axoneme 9+2). The two centrioles in a centrosome are perpendicular. Daughter centrioles form beside each parent in S-phase and separate during mitosis to form opposite spindle poles." },
      "anchor": [-0.1, 0.75, 0.15],
      "aliases": []
    },
    {
      "id": "peroxisome",
      "meshNames": ["part_peroxisome"],
      "level": "neet",
      "name": { "en": "Peroxisome" },
      "short": { "en": "An organelle that breaks down harmful hydrogen peroxide inside the cell." },
      "detail": { "en": "Single-membrane vesicle containing oxidative enzymes (amino acid oxidases, catalase). Fatty acid β-oxidation occurs here as well as in mitochondria. Catalase converts the resulting H₂O₂ → H₂O + O₂, preventing toxic build-up. Proliferates in response to lipid-rich diet." },
      "anchor": [0.7, -0.3, 0],
      "aliases": ["microbody"]
    },
    {
      "id": "cytoskeleton",
      "meshNames": ["part_cytoskeleton"],
      "level": "neet",
      "name": { "en": "Cytoskeleton" },
      "short": { "en": "A network of protein fibres that gives the cell its shape and helps it move." },
      "detail": { "en": "Three fibre types: (1) Microfilaments (actin, 7 nm) — cell shape, cortical tension, cytokinesis ring. (2) Intermediate filaments (8–12 nm) — mechanical strength, nuclear lamina. (3) Microtubules (tubulin, 25 nm) — intracellular transport highways (kinesin/dynein motors), mitotic spindle, cilia/flagella axoneme." },
      "anchor": [0, 0, 0.3],
      "aliases": ["actin", "microtubule", "intermediate filament"]
    }
  ],

  "quiz": [
    {
      "id": "q1",
      "type": "mcq",
      "level": "basic",
      "question": { "en": "Which part of the animal cell is called the 'powerhouse'?" },
      "options": [
        { "en": "Nucleus" },
        { "en": "Mitochondria" },
        { "en": "Golgi apparatus" },
        { "en": "Ribosome" }
      ],
      "answer": 1,
      "explanation": { "en": "Mitochondria produce ATP (energy) through a process called cellular respiration. Without mitochondria, the cell would have no fuel to work." }
    },
    {
      "id": "q2",
      "type": "tap-part",
      "level": "basic",
      "question": { "en": "Tap the part that controls everything the cell does." },
      "answer": "nucleus",
      "explanation": { "en": "The nucleus contains the cell's DNA — the instruction manual for all cell activities. It tells the cell which proteins to make and when to divide." }
    },
    {
      "id": "q3",
      "type": "mcq",
      "level": "neet",
      "question": { "en": "Which of the following correctly describes the nuclear pore complex?" },
      "options": [
        { "en": "A simple gap in the nuclear envelope for passive diffusion" },
        { "en": "A ~120 MDa protein complex that selectively transports macromolecules between nucleus and cytoplasm" },
        { "en": "A ribosome-studded channel for protein synthesis inside the nucleus" },
        { "en": "A microtubule ring that anchors the nucleus to the centrosome" }
      ],
      "answer": 1,
      "explanation": { "en": "Nuclear pore complexes (NPCs) are large multi-protein channels (~120 MDa) that selectively regulate the import of proteins (e.g. transcription factors) into the nucleus and export of mRNA, tRNA, and ribosomal subunits to the cytoplasm. They are not simple gaps." }
    },
    {
      "id": "q4",
      "type": "mcq",
      "level": "basic",
      "question": { "en": "What does the cell membrane do?" },
      "options": [
        { "en": "Makes energy for the cell" },
        { "en": "Controls what enters and leaves the cell" },
        { "en": "Builds proteins for the cell" },
        { "en": "Stores the cell's DNA" }
      ],
      "answer": 1,
      "explanation": { "en": "The cell membrane is a selective barrier. It lets useful things like nutrients and water in, and pushes out waste — keeping the inside of the cell safe and balanced." }
    },
    {
      "id": "q5",
      "type": "tap-part",
      "level": "basic",
      "question": { "en": "Tap the cell's 'post office' — the organelle that packages and ships proteins." },
      "answer": "golgi-apparatus",
      "explanation": { "en": "The Golgi apparatus receives proteins from the endoplasmic reticulum, adds finishing touches (like sugar tags), and sends them to their destination — either inside the cell or outside it." }
    }
  ]
}
```

---

### 7.3 i18n Shape

Every user-facing string in both JSON files is a **locale object**, e.g.:

```json
{ "en": "Cell Membrane" }
```

Adding Hindi later requires only:

```json
{ "en": "Cell Membrane", "hi": "कोशिका झिल्ली" }
```

No code change is needed in the renderer — it reads `string[currentLocale] ?? string["en"]`.

UI chrome strings (button labels, error messages, etc.) live in `src/i18n/en.json` and follow the same pattern.

### 7.4 Content Writing Rules

- Use your **own words** — NCERT and textbooks are reference only, not copy-paste sources.
- `short` text: ≤ 25 words, plain English (Simple level vocabulary for `basic` parts; accessible science language for `neet`).
- `detail` text: ≤ 80 words, technically precise, includes mechanism not just definition.
- Every label and explanation must be **verified against the textbook** before publishing.
- Simple level (Class 1–5): prefer concrete analogies ("post office", "powerhouse", "recycling bin").

---

## 8. 3D Model Pipeline & GLB Contract

### 8.1 Sourcing Checklist

Before using any model:

- [ ] Licence is **CC0**, **CC-BY**, or **CC-BY-SA**. Models with **NC** (non-commercial) or **ND** (no-derivatives) may not be suitable — confirm with the project owner before use.
- [ ] Author name, source URL, and licence are recorded in the topic JSON `model` object.
- [ ] If CC-BY: credit is displayed in the viewer footer and on `about.html`.
- [ ] If creating from scratch in Blender: record `"author": "Project Author"` and choose CC0 or CC BY-SA for the original model.

**Recommended sources:** NIH 3D Print Exchange (`3dprint.nih.gov`) — many CC0 biology models. Sketchfab — filter by licence; check each model individually.

### 8.2 Blender Workflow

1. Import the model (OBJ, FBX, STL, or native Blender).
2. **Clean up:** remove internal geometry, fix non-manifold edges, apply all modifiers.
3. **Apply transforms:** `Object → Apply → All Transforms` so scale/rotation are baked.
4. **Centre at origin:** bounding box centre of the whole model at `(0, 0, 0)`.
5. **Y-up:** ensure the model's natural "up" axis is +Y (Three.js default).
6. **Scale:** fit the whole model inside a bounding sphere of radius ≈ 1 unit (so camera defaults work across topics).
7. **Name each part:** one Blender object per logical part; name it `part_<partId>` (e.g. `part_nucleus`). For repeated instances (e.g. multiple mitochondria) use `part_mitochondria_1`, `part_mitochondria_2`, etc. — all listed in `meshNames[]`.
8. **Materials:** simple PBR materials, one per part, distinguishable colours. No baked textures on the initial version (keeps file size down). Textures ≤ 1024 × 1024 px if used.
9. **Export:** File → Export → glTF 2.0 (`.glb`), include normals, no animation (unless planned), apply modifiers.

### 8.3 Optimisation

After Blender export, run:

```bash
npx gltf-transform optimize animal-cell-raw.glb animal-cell.glb \
  --compress meshopt \
  --texture-compress webp
```

**Budgets (enforced by `validate-content.mjs`):**

| Budget | Limit |
|---|---|
| Triangle count | ≤ 100,000 per model |
| File size (target) | ≤ 1 MB per GLB |
| File size (hard limit) | 2 MB per GLB |
| Texture size | ≤ 1024 × 1024 px per image |

---

## 9. Architecture & Project Structure

### 9.1 Directory Layout

```
bio3d/
├── index.html
├── category.html
├── viewer.html
├── about.html
├── package.json
├── vite.config.js
├── SPEC.md
├── scripts/
│   └── validate-content.mjs        ← CI content validator
├── src/
│   ├── main-home.js                ← entry for index.html
│   ├── main-viewer.js              ← entry for viewer.html
│   ├── viewer/
│   │   ├── scene.js                ← Three.js scene setup, renderer, camera
│   │   ├── loader.js               ← GLTFLoader wrapper, progress, error
│   │   ├── picking.js              ← raycasting → part resolution
│   │   ├── highlight.js            ← material state (highlight, dim, restore)
│   │   └── pins.js                 ← CSS2DObject pin placement
│   ├── modes/
│   │   ├── explore.js              ← tap-to-learn mode controller
│   │   ├── label.js                ← label mode controller
│   │   └── quiz.js                 ← quiz mode controller
│   ├── data/
│   │   └── content.js              ← fetch, validate shape, filter by level
│   ├── ui/
│   │   ├── panel.js                ← info panel (bottom sheet / side panel)
│   │   ├── toast.js                ← ephemeral feedback messages
│   │   ├── levelToggle.js          ← Simple/NEET toggle component
│   │   └── search.js               ← client-side search over index.json
│   ├── store/
│   │   └── progress.js             ← localStorage read/write, try/catch
│   ├── i18n/
│   │   ├── en.json                 ← all UI chrome strings in English
│   │   └── t.js                    ← t(key) helper, currentLocale
│   └── styles/
│       ├── base.css                ← reset, variables, typography, layout
│       └── viewer.css              ← viewer-specific layout and components
├── public/
│   ├── _headers                    ← Cloudflare cache rules
│   ├── content/
│   │   ├── index.json              ← catalog of all topics
│   │   └── topics/
│   │       └── animal-cell.json    ← topic JSON (matches §7.2 schema)
│   ├── models/
│   │   └── animal-cell.glb         ← optimised GLB
│   └── thumbs/
│       └── animal-cell.webp        ← 400 × 300 px thumbnail
└── .github/
    └── workflows/
        └── validate.yml            ← GitHub Actions: runs validate-content.mjs
```

### 9.2 Data Flow

```
viewer.html?topic=animal-cell
  │
  ▼
main-viewer.js
  │  reads ?topic= param
  ├─► data/content.js  ──fetch──► public/content/topics/animal-cell.json
  │       │
  │       └─ validates shape, filters parts by current level
  │
  ├─► viewer/loader.js ──GLTFLoader──► public/models/animal-cell.glb
  │       │
  │       └─ traverses scene graph, maps mesh.name → part via meshNames[]
  │
  └─► mode controller (explore / label / quiz)
          │
          └─ operates only on part IDs (never raw mesh names)
              → no code change needed to add a new topic
```

**Key principle:** adding a new topic = one GLB + one JSON + one catalog entry. Zero new JavaScript.

### 9.3 Render-on-Demand

```js
// In scene.js — idle by default, wake on events
controls.addEventListener('change', requestRender);
renderer.domElement.addEventListener('pointerdown', requestRender);
window.addEventListener('resize', requestRender);

function requestRender() {
  if (!renderPending) {
    renderPending = true;
    requestAnimationFrame(renderFrame);
  }
}
function renderFrame() {
  renderPending = false;
  controls.update();
  renderer.render(scene, camera);
}
```

This avoids a constant 60 fps loop draining the phone battery when the user is reading the info panel.

### 9.4 Cloudflare `_headers` (Cache Policy)

```
/models/*
  Cache-Control: public, max-age=31536000, immutable

/thumbs/*
  Cache-Control: public, max-age=31536000, immutable

/content/*
  Cache-Control: public, max-age=3600
```

Models and thumbnails are content-addressed (filename includes a hash in the Vite build), so they can be cached forever. Content JSON is re-validated hourly.

---

## 10. UX & Accessibility

### Mobile-first Layout

- Base breakpoint: 320 px minimum width.
- Viewer canvas: 100 vw × 60 vh on mobile; expands on desktop.
- Mode tabs at the bottom (thumb-reachable zone).
- Info panel as a bottom sheet on mobile (slides up, draggable handle).

### Tap Targets

| Mode | Minimum tap target size |
|---|---|
| Simple (Cl. 1–5) | 56 × 56 px |
| All other modes | 48 × 48 px |

### Colour & Contrast

- WCAG AA minimum: 4.5:1 contrast for normal text, 3:1 for large text.
- Part highlight colour chosen to be distinguishable in both light and dark themes.
- Do not use colour as the only feedback signal (always pair with icon or text).

### Motion

- Respect `prefers-reduced-motion: reduce` — disable camera fly-to animations and panel slide transitions; use instant cuts instead.

### Keyboard Support

- Parts list (`<ul>` with focusable `<li>`) is fully keyboard navigable (Arrow keys, Enter to select).
- Quiz options are `<button>` elements, not `<div>`s.
- Modal/sheet traps focus while open; Escape closes it.

### Screen Reader

- `aria-live="polite"` region for the info panel content, so part name/description is announced on selection.
- `aria-live="assertive"` for quiz answer feedback (right/wrong).
- Canvas has `role="application"` and `aria-label="3D model viewer"`.
- When WebGL is unavailable, the fallback parts list is fully accessible.

---

## 11. Performance Budgets

| Asset | Budget |
|---|---|
| Home page JS (gzip) | < 30 KB |
| Viewer JS incl. Three.js (gzip) | < 250 KB |
| GLB per topic (target) | ≤ 1 MB |
| GLB per topic (hard limit) | 2 MB |
| Largest Contentful Paint (home, 4G) | < 2 s |
| Viewer interactive (slow 4G, cold) | < 4 s |
| Frame rate (mid-range Android) | ≥ 30 fps |

Three.js is code-split and loaded only on `viewer.html` via a dynamic `import()` in `main-home.js` — it never loads on the home page.

---

## 12. Quality & Validation

### `scripts/validate-content.mjs`

Runs as `npm run validate`. Validates every topic in `public/content/topics/`:

1. **JSON schema:** all required fields present; `level` values are `"basic"` or `"neet"`; `anchor` is a 3-element number array; `quiz.answer` for `mcq` is a valid option index; `quiz.answer` for `tap-part` is a valid part `id`.
2. **GLB mesh check:** every string in every part's `meshNames[]` exists as a named mesh in the GLB (uses `@gltf-transform/core`).
3. **Budget check:** GLB file size ≤ 2 MB; triangle count ≤ 100,000.
4. **Licence fields:** `model.source`, `model.sourceUrl`, `model.author`, `model.licence` all non-empty.
5. **Catalog sync:** every topic in `topics/*.json` has an entry in `index.json` (and vice versa for `"published"` status).

### GitHub Actions — `.github/workflows/validate.yml`

```yaml
name: Validate Content
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run validate
```

### Manual Test Matrix

Before publishing any topic:

| Browser | Device |
|---|---|
| Chrome (latest) | Android phone (target device) |
| Safari (latest) | iPhone (any) |
| Chrome (latest) | Desktop Windows/Mac |
| Firefox (latest) | Desktop Windows/Mac |

Test checklist per topic: rotate/zoom, tap each part (explore mode), complete label mode (all parts), complete quiz (both levels), level toggle, reset view, error state (rename GLB temporarily).

---

## 13. Hosting & Deployment

### Cloudflare Pages (primary)

1. Connect GitHub repo to Cloudflare Pages.
2. Build command: `npm run build`
3. Build output directory: `dist/`
4. Environment variables: none required for v1.
5. Preview deploys: automatically created for every branch/PR.
6. Cloudflare Web Analytics: enable in the Cloudflare dashboard (cookie-free, no banner needed).

### GitHub Pages (documented fallback)

Add to `vite.config.js`:

```js
export default {
  base: process.env.GITHUB_PAGES ? '/bio3d/' : '/',
}
```

Deploy with `gh-pages` npm package or the official `actions/deploy-pages` action.

---

## 14. Legal

### Model Licences

- All model credits are stored in the topic JSON `model` object and displayed:
  - In the viewer footer during viewing.
  - Aggregated on `about.html`.
- If a model is CC-BY, the credit line is mandatory: `"3D model by [Author] via [Source], [Licence]"`.

### Code Licence

> **Decision pending:** MIT licence recommended for the code (`src/`, `scripts/`, HTML/CSS). Confirm with project owner before first public release.

### Content Licence

> **Decision pending:** CC BY-SA 4.0 recommended for the written content (part names, short/detail text, quiz questions). This allows others to use and adapt it with attribution, and requires derivatives to use the same licence. Confirm with project owner.

### Privacy

- No personal data collected.
- Cloudflare Web Analytics is cookie-free.
- `localStorage` stores only anonymous progress data (scores); no names or emails.

---

## 15. Roadmap with Acceptance Criteria

### Phase 1 — Foundation ✓ when:
- [ ] GitHub repo created, `main` branch protected.
- [ ] Vite scaffold running (`npm run dev` serves `index.html`).
- [ ] Home page shows 4 category cards (Cells, Plants, Animals, Human Body) with correct routes.
- [ ] Deployed to Cloudflare Pages; public URL is live and loads the home page.
- [ ] Home JS bundle < 30 KB gzip.

### Phase 2 — First Topic ✓ when:
- [ ] Animal cell GLB meets the GLB contract (§8): named parts, Y-up, ≤ 1 MB, ≤ 100k tris.
- [ ] `validate-content.mjs` passes for `animal-cell`.
- [ ] Viewer page loads and renders the model; rotate and pinch-zoom work on Android Chrome.
- [ ] Loading progress bar shown; error state shown if GLB is removed.
- [ ] Reset-view button works.

### Phase 3 — Interactivity ✓ when:
- [ ] All 10 `basic` parts can be tapped; correct name and `short` text shown.
- [ ] NEET level shows all 17 parts with `detail` text.
- [ ] Label mode: all pins placed, scoring works, "show answer" works.
- [ ] Quiz mode: 5-question round, both `mcq` and `tap-part` types work, score saved to localStorage.
- [ ] Level toggle switches content in real time without page reload.
- [ ] Parts list is keyboard-navigable.

### Phase 4 — Publish ✓ when:
- [ ] GitHub Actions `validate.yml` passes on every push to `main`.
- [ ] Cloudflare Pages production deploy is live with the animal cell viewer.
- [ ] Shared with 5–10 students (via Google Form feedback link).
- [ ] At least one round of feedback collected and critical issues fixed.

### Phase 5 — Grow (after Phase 4):
- Plant cell (requires splitting nucleus from nucleolus for NEET, adding cell wall, chloroplast, large central vacuole).
- Bacteria (prokaryote — no membrane-bound organelles; introduces new conceptual contrast).
- Human heart (chambers, valves, major vessels).
- Leaf cross-section.
- Flower (reproductive organs, pollination labelling).
- Progress tracking badges on topic cards.
- Per-topic new-topic checklist (Appendix B).

### Later (not on a fixed date):
- Hindi UI (add `"hi"` keys to all locale objects; add `hi.json` chrome strings).
- Voice explanations (Web Speech API, free, no server).
- Offline PWA (service worker caching models and content JSON).
- Teacher share links (URL-encoded quiz config, no backend needed).
- Draw-and-compare mode.

---

## Appendix A — Animal Cell Content Draft

### Basic parts (Class 6–10, NEET aspirant)

| # | Part ID | Name | Mesh name(s) | Anchor (approx.) |
|---|---|---|---|---|
| 1 | `cell-membrane` | Cell Membrane | `part_cell-membrane` | `[0, 1.1, 0]` |
| 2 | `cytoplasm` | Cytoplasm | `part_cytoplasm` | `[0, 0, 0.5]` |
| 3 | `nucleus` | Nucleus | `part_nucleus` | `[0, 0, 0]` |
| 4 | `mitochondria` | Mitochondria | `part_mitochondria_1`, `_2`, `_3` | `[0.6, 0.4, 0]` |
| 5 | `endoplasmic-reticulum` | Endoplasmic Reticulum | `part_er_rough`, `part_er_smooth` | `[-0.5, 0.3, 0]` |
| 6 | `golgi-apparatus` | Golgi Apparatus | `part_golgi` | `[0.3, -0.5, 0]` |
| 7 | `ribosomes` | Ribosomes | `part_ribosomes` | `[-0.3, -0.3, 0.2]` |
| 8 | `lysosomes` | Lysosomes | `part_lysosomes` | `[-0.6, -0.2, 0]` |
| 9 | `vacuole` | Vacuole | `part_vacuole` | `[0.1, 0.5, 0.1]` |
| 10 | `centrosome` | Centrosome | `part_centrosome` | `[-0.1, 0.7, 0.1]` |

### NEET-only additional parts

| # | Part ID | Name | Mesh name(s) |
|---|---|---|---|
| 11 | `nucleolus` | Nucleolus | `part_nucleolus` |
| 12 | `nuclear-envelope` | Nuclear Envelope | `part_nuclear_envelope` |
| 13 | `er-rough` | Rough ER | `part_er_rough` |
| 14 | `er-smooth` | Smooth ER | `part_er_smooth` |
| 15 | `centrioles` | Centrioles | `part_centrioles` |
| 16 | `peroxisome` | Peroxisome | `part_peroxisome` |
| 17 | `cytoskeleton` | Cytoskeleton | `part_cytoskeleton` |

### Sample quiz items

| ID | Type | Level | Question | Answer |
|---|---|---|---|---|
| q1 | `mcq` | basic | "Which part is called the 'powerhouse'?" | Mitochondria (index 1) |
| q2 | `tap-part` | basic | "Tap the part that controls everything the cell does." | `nucleus` |
| q3 | `mcq` | neet | "Which correctly describes the nuclear pore complex?" | ~120 MDa selective transport complex (index 1) |

---

## Appendix B — New-Topic Checklist

Before a topic is merged to `main` and marked `"published"`:

- [ ] **Source:** model found at NIH 3D, Sketchfab, or created in Blender.
- [ ] **Licence:** CC0 / CC-BY / CC-BY-SA confirmed; author + URL + licence recorded in topic JSON.
- [ ] **Blender:** applied transforms, Y-up, fits in radius ≈ 1 unit, parts named `part_<id>`.
- [ ] **Optimise:** `gltf-transform optimize` run; file ≤ 1 MB; tris ≤ 100k.
- [ ] **JSON:** topic JSON written, all fields present, anchors set.
- [ ] **Validate:** `npm run validate` passes with zero errors.
- [ ] **Accuracy review:** every label and explanation checked against NCERT / standard reference.
- [ ] **Catalog:** entry added to `public/content/index.json` with `"status": "published"`.
- [ ] **Thumbnail:** 400 × 300 px WebP screenshot placed in `public/thumbs/<id>.webp`.
- [ ] **Manual test:** rotate/zoom, explore, label, quiz — tested on Android Chrome and desktop Chrome.

---

## Open Questions

> These need a decision from the project owner before the affected work starts.

| # | Question | Affects |
|---|---|---|
| 1 | What is the site name and domain? | `about.html`, Cloudflare Pages custom domain |
| 2 | Confirm code licence: **MIT**? | `LICENSE` file, `about.html` |
| 3 | Confirm content licence: **CC BY-SA 4.0**? | `about.html`, written in every topic JSON (future field) |
| 4 | Who reviews biology accuracy? (teacher, subject expert?) | Phase 2 and all future topics |
| 5 | Is "Human Body" its own home-page category, or a subcategory of Animals? | `index.html` layout, `index.json` category field |
| 6 | Should "Bacteria" be in Cells or Animals category? | `index.json` |

