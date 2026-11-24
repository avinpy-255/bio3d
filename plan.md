# Plan: Write `SPEC.md` for the Interactive 3D Biology Learning Website

## Context

The user has a high-level project plan (`Interactive 3D Biology Learning Website - Project Plan.md`) for a free, mobile-first 3D biology site (classes 1–10 + NEET). The repo is otherwise empty (greenfield, not a git repo yet). They asked for a detailed spec file. Clarified decisions:

- **Rendering:** Three.js + Vite (needed for per-part tap/highlight/hide).
- **Models:** mix of downloaded CC0/CC-BY models (NIH 3D, Sketchfab) cleaned in Blender, plus simple stylised Blender models where nothing suitable exists.
- **Levels:** one model + one JSON per topic; each part/quiz item tagged `basic` or `neet`.
- **Scope:** whole product architecture; Phases 1–4 (home + animal cell, through deploy) specified in full detail; later phases outlined. English only, but data shaped for Hindi later.

Defaults I'm choosing (noted in the spec as decisions, easy to change): vanilla JS (no UI framework), Cloudflare Pages hosting, query-param routing (`viewer.html?topic=animal-cell`), localStorage for progress, gltf-transform for model optimisation, GitHub Actions for content validation.

## Deliverable

Create **`/home/curceet/Work/bio3d/SPEC.md`** with the sections below. (No code is written in this step.)

### SPEC.md outline and key content

1. **Overview & goals** — problem, core promise (free, free tools, no paid APIs), success metrics (loads < 4 s on slow 4G, works on a ₹8–10k Android phone, 1 topic "perfect" before scaling).
2. **Non-goals (v1)** — accounts/login, backend/database, Hindi, voice, offline, teacher mode, draw-and-compare.
3. **Users** — Class 1–5 (big buttons, fewest parts), Class 6–10 (NCERT), NEET aspirants (full detail); mostly mobile, often slow data.
4. **Key decisions table** — engine, build tool, framework, hosting, routing, storage, analytics, with a one-line reason each.
5. **Site map & routes** — `index.html` (home: category cards Cells/Plants/Animals/Human Body + search), `category.html?c=cells`, `viewer.html?topic=<id>`, `about.html` (credits/licences). The viewer loads Three.js lazily so the home page stays tiny.
6. **Feature specs (each with acceptance criteria)**
   - **Viewer:** OrbitControls (rotate/pinch-zoom/pan, damping, zoom limits), reset-view button, loading progress bar, error state, pixel-ratio cap 2, render-on-demand (no constant loop when idle → battery).
   - **Explore (tap to learn):** raycast → part lookup via mesh name → highlight (emissive tint, others dimmed) → info panel (bottom sheet on mobile, side panel ≥ 768 px) with name + short text (+ detail in NEET). Scrollable **parts list** as the accessible alternative to tapping. Optional "isolate part" and "hide part" toggles.
   - **Label mode:** numbered pins at each part's `anchor`; tap a pin → choose from a label tray (tap-to-place works on touch; drag-and-drop as a desktop enhancement). Instant right/wrong feedback, "show answer", final score.
   - **Quiz mode:** question types `mcq` and `tap-part` ("Tap the part that makes energy"); 5–10 questions per round, filtered by level, shuffled; explanation after each answer; score saved.
   - **Level toggle:** Simple / NEET, persisted in localStorage; filters parts, text depth and quiz pool.
   - **Search & categories:** client-side search over `topics/index.json` (title, aliases, keywords); no server.
   - **Progress (Phase 5):** best quiz/label score per topic per level in localStorage, shown on topic cards.
7. **Content model (the core contract)**
   - `public/content/index.json` — catalog: `{ id, title, category, thumbnail, aliases[], status }`.
   - `public/content/topics/<id>.json` — full schema with example (animal cell):
     - `id, title, category, version`
     - `model: { src, sizeKB, source, sourceUrl, author, licence, credit, modifications }`
     - `camera: { position, target, minDistance, maxDistance }`
     - `parts[]: { id, meshNames[], level: "basic"|"neet", name, short, detail?, anchor:[x,y,z], aliases[] }` (one part can map to many meshes, e.g. several mitochondria)
     - `quiz[]: { id, type: "mcq"|"tap-part", level, question, options?, answer, explanation }`
   - **i18n-ready:** every user-facing string is an object `{ "en": "..." }` so `"hi"` can be added later with no code change; UI chrome strings live in `src/i18n/en.json`.
   - Writing rules: own words (NCERT used to check accuracy only), simple text ≤ 25 words, NEET detail ≤ 80 words, every part checked against the textbook.
8. **3D model pipeline & GLB contract**
   - Sourcing checklist: licence must be CC0 / CC-BY / CC-BY-SA (no NC/ND unless the user accepts the limits); record author + URL + licence in the topic JSON; credits shown in viewer and `about.html`.
   - Blender steps: clean up, apply transforms, centre at origin, Y-up, fit in ~2-unit bounding sphere, one object per part named `part_<partId>` (or `part_<partId>_<n>` for repeats), simple PBR/flat materials, export GLB.
   - Optimise: `gltf-transform optimize --compress meshopt --texture-compress webp` (or Draco); budgets ≤ 100k triangles, ≤ 1 MB target / 2 MB hard limit per topic, textures ≤ 1024 px.
9. **Architecture & project structure**
   ```
   index.html  category.html  viewer.html  about.html
   src/
     main-home.js  main-viewer.js
     viewer/  scene.js  loader.js  picking.js  highlight.js  pins.js
     modes/   explore.js  label.js  quiz.js
     data/    content.js (fetch + validate + level filter)
     ui/      panel.js  toast.js  levelToggle.js  search.js
     store/   progress.js (localStorage, try/catch)
     i18n/    en.json  t.js
     styles/  base.css  viewer.css
   public/content/  index.json  topics/*.json
   public/models/   *.glb   public/thumbs/  *.webp
   scripts/validate-content.mjs
   public/_headers  (long cache for models/thumbs)
   ```
   Data flow: `viewer.html?topic=id` → fetch topic JSON → load GLB → map meshes to parts by name → mode controller (explore/label/quiz) works only on part IDs → adding a topic = one GLB + one JSON + one catalog entry, no code.
10. **UX & accessibility** — mobile-first layout, tap targets ≥ 48 px (≥ 56 px in Simple mode), WCAG AA contrast, `prefers-reduced-motion`, keyboard support (parts list, quiz), `aria-live` for info/feedback, WebGL-unsupported fallback (2D thumbnail + parts list).
11. **Performance budgets** — home JS < 30 KB gz; viewer JS (incl. three.js) < 250 KB gz; model ≤ 1 MB; LCP home < 2 s on 4G; ≥ 30 fps on a mid-range Android phone.
12. **Quality & validation** — `scripts/validate-content.mjs` (uses `@gltf-transform/core`): JSON shape valid, every `meshNames` entry exists in the GLB, every quiz `answer` references a real part/option, licence fields present, GLB under budget. Runs as `npm run validate` and in GitHub Actions on every push. Manual test matrix: Android Chrome, iOS Safari, desktop Chrome/Firefox.
13. **Hosting & deployment** — GitHub repo → Cloudflare Pages (build `npm run build`, output `dist/`), preview deploys per branch, Cloudflare Web Analytics (cookie-free). GitHub Pages documented as fallback (`base` config in Vite).
14. **Legal** — model credits page; suggested code licence MIT and content licence CC BY-SA 4.0 (flagged for user confirmation); no personal data collected.
15. **Roadmap with acceptance criteria**
    - Phase 1 Foundation: repo, Vite scaffold, home with 4 category cards, deployed "hello" page.
    - Phase 2 First topic: animal cell GLB meeting the contract, viewer rotates/zooms on phone.
    - Phase 3 Interactivity: explore, label, quiz for animal cell, both levels.
    - Phase 4 Publish: validation in CI, Cloudflare deploy, feedback from 5–10 students (simple feedback link, e.g. a free Google Form).
    - Phase 5 Grow: plant cell → bacteria → heart → leaf → flower; progress tracking; per-topic checklist.
    - Later: Hindi, voice (Web Speech API, free), offline PWA, teacher share links (URL-encoded quiz config), draw-and-compare.
16. **Appendix A: Animal cell content draft** — part list with levels:
    - basic: cell membrane, cytoplasm, nucleus, mitochondria, endoplasmic reticulum, Golgi apparatus, ribosomes, lysosomes, vacuole, centrosome
    - neet: nucleolus, nuclear envelope/pores, rough vs smooth ER (split), centrioles, peroxisome, cytoskeleton, microvilli
    Plus 3 sample quiz items (one mcq basic, one tap-part basic, one mcq neet).
17. **Appendix B: New-topic checklist** — source → licence check → Blender naming → optimise → JSON → validate → accuracy review → add to catalog.
18. **Open questions** — site name/domain; confirm MIT + CC BY-SA licences; who reviews biology accuracy (teacher?); whether "Human body" is its own category or part of Animals (spec assumes its own card).

## Verification

- `SPEC.md` exists at the project root and renders cleanly as Markdown.
- Cross-check: every feature and phase in the original plan maps to a spec section (tap-to-learn, label, quiz, two levels, search, mobile-first, light/fast, licences, NIH/Sketchfab/Blender/GLB, JSON per topic, Cloudflare/GitHub Pages, analytics, future ideas).
- Topic JSON example in the spec is internally consistent (quiz answers reference listed part IDs, mesh names follow the `part_<id>` convention).
