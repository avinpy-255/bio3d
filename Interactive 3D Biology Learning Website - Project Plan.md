# Interactive 3D Biology Learning Website - Project Plan

## 1. The Idea

A free, interactive 3D website where students from class 1 to 10, plus NEET and other biology learners, can explore biology visually instead of struggling with flat textbook diagrams.

Students often find it hard to understand and draw biological diagrams: the heart, its chambers, plant cells, animal cells, and so on. On this website they can rotate, zoom, tap any part to see its name and a short explanation, and then test themselves by labelling the diagram on their own.

**Core promise:** everything is free to use, free to host, and built with free tools. No paid APIs, no credits.

## 2. What the Website Will Cover

- **Cells:** animal cell, plant cell, bacteria, and later more.
- **Plants:** whole plant parts, flower, leaf, root, seed, and plant species.
- **Animals:** animal body parts and organ systems.
- **Human body:** heart, lungs, brain, kidney, digestive system, and more.

## 3. Main Features

1. **3D viewer:** rotate, zoom, and move around every model.
2. **Tap to learn:** tap a part and see its name plus a short, simple explanation.
3. **Label mode:** parts are hidden and students drag or choose the correct label.
4. **Quiz mode:** quick questions like "Which part pumps blood to the body?"
5. **Two levels:** a simple mode for classes 1 to 10 and a detailed mode for NEET.
6. **Search and categories:** a home page with Cells, Plants, and Animals.
7. **Works on phones:** many students will use a mobile, so the design must be mobile first.
8. **Light and fast:** small model files so it loads quickly on slow internet.

## 4. Complete Toolkit (All Free)

### Building the site

- **VS Code:** free code editor.
- **HTML, CSS, JavaScript:** the pages and interactivity.
- **Three.js:** free open-source library for 3D scenes. Full control.
- **Google model-viewer:** free, simpler option for showing 3D models with clickable hotspots. A great way to start fast.
- **Vite (optional):** organizes and bundles code as the project grows.

### 3D models

- **NIH 3D:** free portal of science and medical models, over 13,900 of them, including cells, viruses, and DNA.
- **Sketchfab:** many biology models are free to download. Each has its own licence, so always check it. Some require credit to the creator.
- **Blender:** free 3D software to clean up models, name each part separately, and reduce file size.
- **glTF or GLB format:** the standard web 3D format. Convert all models to this.

### Content

- **JSON files:** one per topic, holding each part's name, explanation, and position. This feeds the labels and quizzes.
- **Textbooks (NCERT and class books):** use them to check accuracy, but write explanations in your own words.

### Hosting and workflow

- **Git and GitHub:** free account to store the code.
- **Cloudflare Pages:** free hosting with unlimited bandwidth on the free plan. Best if many students visit.
- **GitHub Pages:** the simplest option: push your code to a repository and the site is live.
- **Free analytics:** Cloudflare's built-in analytics to see visitor numbers.

## 5. How It Works Technically

1. Each biology topic has one 3D model file (GLB) with every part as a separate named piece.
2. Each topic also has a JSON file listing the parts, their explanations, and quiz questions.
3. One shared viewer page template loads any topic by reading its model and JSON.
4. Adding a new topic later means adding one model and one JSON file, with no new code.

This is the key idea: **build the template once, then grow by adding content.**

## 6. Build Order (Step by Step)

**Phase 1: Foundation**

1. Install VS Code and Git, and create a GitHub account.
2. Make a simple home page with three category cards: Cells, Plants, Animals.

**Phase 2: First working topic** 3. Pick one topic as the test: the animal cell. 4. Download a suitable model from NIH 3D or Sketchfab and check its licence. 5. Clean it up in Blender, name the parts, and export as GLB. 6. Show it in the viewer with rotate and zoom.

**Phase 3: Interactivity** 7. Add tap-to-label: tap a part to see its name and explanation. 8. Create the JSON file for the animal cell. 9. Add label mode and a short quiz.

**Phase 4: Publish** 10. Push the code to GitHub. 11. Deploy free on Cloudflare Pages or GitHub Pages. 12. Share it with a few students and collect feedback.

**Phase 5: Grow** 13. Add plant cell, heart, leaf, flower, and more, one topic at a time. 14. Add the NEET detailed mode. 15. Add progress tracking, such as saving quiz scores in the browser.

## 7. Important Things to Remember

- **Licences matter:** always check each model's licence and credit the creator where required.
- **Keep files small:** compress models so the site loads fast on mobile data.
- **Start small:** finish one topic perfectly before adding ten half-done ones.
- **Accuracy first:** check every label and explanation against the textbook.
- **Make it simple for young kids:** class 1 to 5 need big buttons, simple words, and fewer parts.

## 8. Future Ideas

- Hindi and regional language support.
- Voice explanations for each part.
- Draw-and-compare mode where students sketch a diagram and check it.
- Teacher mode with shareable quiz links.
- Offline support so it works without internet.

## 9. First Next Step

Start with the **animal cell**: find the model, check the licence, and get it rotating in a browser. Once that works, everything else is repeating the same pattern.
