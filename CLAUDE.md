# Perde Perde Anadolu

A free, Turkish-language browser adventure game for children (about 7–12) set in Türkiye's ancient cities. Each city is one "perde" (act), playable on its own. The player follows **Deniz**, a young woman who solves the puzzles. Her grandfather left her an old book of lost coins; each ancient city hides one coin and has its own guide animal (Efes: **Melissa** the bee; Hattuşa: stag; Göbeklitepe: fox; Çatalhöyük: leopard; Troya: horse; Assos: owl; Afrodisias: dove; Bergama: snake; Sardes: lion; Nemrut: eagle; Zeugma: Pegasus; Hierapolis: Kerberos as a friendly puppy; Patara: caretta caretta; Gordion: donkey; Phaselis: dolphin). Every act teaches real history through play.

The look is a **layered papercut lightbox crossed with Karagöz shadow theatre**: stacked cut-paper layers, backlit, with parallax depth, perforated details that glow, and puppet-like characters.

## Acts (planned order)

1. Efes (done: `src/acts/efes/`)
2. Hattuşa (done: `src/acts/hattusa/`; guide stag **Kurunta**, named after the Hittite stag god; four scenes: Aslanlı Kapı raking light, Yerkapı tunnel, clay-tablet archive, Yazılıkaya with the Kadesh treaty)
3. Göbeklitepe
4. Çatalhöyük
5. Troya
6. Assos
7. Afrodisias
8. Bergama
9. Sardes
10. Nemrut
11. Zeugma
12. Hierapolis
13. Patara
14. Gordion
15. Phaselis

Aspendos, Side and Sagalassos are out. Order after Efes is not final.

## Deniz and her tools

Deniz is 18 (an adult, never a child): a young woman, stylised but not childlike, head about 1/7 of her height, legs about half of it, fuller hips and thighs, friendly mature face. She is curious, brave and kind, from the Aegean coast. She carries a different tool in each city, and the tool is that city's core mechanic:

- Efes: flashlight (light and shadow reveal secrets; shadows assemble shapes)
- Hierapolis: water jug (steer water across the travertine terraces)
- Zeugma: pouch of mosaic tiles (rebuild mosaics)
- Troya: archaeologist's brush (dig down through the layered cities)
- Göbeklitepe: star map (match carved animals to the sky)
- Others: to be decided later

Melissa (bee, saffron and indigo stripes, translucent perforated wings) guides Deniz in Efes only. Every other city has its own animal, pictured on its plate in the old book (assets in public/assets/book/).

## Story frame

- Main page (`/`) is a papercut map of Türkiye with the cities on top (projection in `src/hub/map-bounds.json`, cities in `src/hub/cities.json`).
- `/baslangic/` is the opening scene: Deniz finds the old book in her grandfather’s study with her flashlight. Until then no city opens.
- Progress is kept in localStorage (`src/engine/progress.ts`); finishing an act calls `markDone(id)`. The book (`src/engine/book.ts`, pages in `src/story/book-content.ts`) shows the coins found.
- Deniz carries a flashlight (soft cone follows the pointer), not a lamp, in every act unless a city’s tool says otherwise.

## Tech

- Vite, vanilla TypeScript, Canvas 2D. No UI framework.
- One shared engine in `src/engine/` (layer renderer, parallax, lamp/pointer light, dialogue, goal tag, hint, fact cards, coin/collectible HUD, curtain transitions, Web Audio, input incl. keyboard and touch).
- Each act lives in `src/acts/<city>/` with its scenes, puzzles, Turkish text and asset manifest. Acts must not reach into each other.
- Each act builds to its own static page (`/efes/`, `/hierapolis/`, ...) plus a small index page listing the acts. Output is static files deployable to Cloudflare Pages.
- Local checks: `npm run dev`, `npm run build`, and Playwright screenshot/play-through tests in `tests/`.

## Assets: Higgsfield for every image

All raster art comes from the Higgsfield MCP. Do not hotlink Higgsfield URLs; download every result into the repo.

Pipeline:

1. Generate with Higgsfield. Default model `gpt_image_2_5`. For anything showing Deniz or Melissa, use their saved Higgsfield reference elements (`<<<element_id>>>` in the prompt) with a model that supports elements (e.g. `nano_banana_pro`, `gpt_image_2`), so they look the same everywhere.
2. Save originals to `assets-src/<act>/` (git-ignored if large) and record every generation in `assets-src/<act>/manifest.json`: file, prompt, model, job id, date, purpose.
3. Cut-outs (paper layers, props, puppet parts): run Higgsfield `remove_background`, then download the transparent PNG.
4. Process with a script (`scripts/process-assets.mjs`, using `sharp`): trim, resize to the sizes actually used, export WebP (alpha kept), write to `public/assets/<act>/`.
5. Budget: aim for under ~8 MB of images per act. Lazy-load the next scene's assets.
6. Before any batch that costs credits, check the balance, state the expected cost and how many images, and generate few variants (1–2) unless asked.

What Higgsfield is for: painted skies and backdrops, paper-layer scenery, props, the title illustration, Deniz and Melissa (character sheets, expressions, puppet parts), dialogue portraits, collectible icons and the lamp.
What stays in code: anything a puzzle or the light/shadow mechanic depends on precisely (hit areas, shadow-casting shapes, inscriptions revealed by light), UI chrome, and animation.

## Art direction (put this in every image prompt)

- Layered cut paper in a backlit lightbox. Visible paper fibre, clean knife-cut edges, soft glow at edges, tiny perforations that let light through.
- Karagöz influence: translucent coloured hide, jointed puppet figures, ornament made of punched holes.
- Palette: deep indigo night, lapis, İznik turquoise, madder red, saffron, warm gold. Far layers lighter and hazier, near layers darker and saturated.
- Flat, readable silhouettes. No photorealism, no 3D render look, no text or letters baked into images, no watermarks.
- Generate scenery layers separately (far / mid / near / foreground) at a wide aspect (16:9 or 21:9), so the engine can parallax them.

## Deniz as a puppet

Deniz is a jointed cut-paper puppet rigged in code: head, torso, upper arm, forearm with hand, legs/skirt as separate transparent parts, rotated at pivots like a Karagöz figure. She is always shown in side profile (no front view). Her moods are side poses (stand, talk nod, idle glance, cheer with the tool arm up and a hop) plus the dialogue portrait expressions. She walks along the ground line of each scene and reaches toward the player's pointer with the arm holding her tool. Generate the parts from her approved character sheet so the colours and outlines match.

## Writing and content rules

- All player-facing text is Turkish, warm and simple for children; sentence case; typographic apostrophes and quotes (’ “ ”).
- History must be accurate. Hedge uncertain claims ("…olduğu düşünülür", "…anlatılır"). Each act ends scenes with a short "Efes Defteri"-style fact card (2–3 facts).
- The city’s guide animal talks to Deniz by name (Melissa in Efes). Deniz has her own short lines too.
- Be careful with copyrighted characters or recognisable modern artworks; everything is original.

## Quality floor

- 60 fps on a mid-range phone; cap device pixel ratio; free canvases when leaving a scene.
- Works with mouse, touch and keyboard (arrow keys move the tool; Enter/Space advance dialogue; number keys where a puzzle has choices).
- `prefers-reduced-motion` respected; text contrast readable; focus rings visible.
- Landscape phones supported; portrait shows a gentle "yan çevir" hint.
- Sound is fully synthesized or generated; a mute button is always visible.

## Working rules

- The user handles all git operations himself. Never run git add, commit, stash, checkout, push, or similar; just say what changed.
- Stop for the user's approval at the checkpoints named in a task (e.g. character sheet before generating anything else with Deniz).
- After visual changes, take Playwright screenshots and look at them before saying a step is done.

## Cinematics (whole game and every act)

One visual grammar: papercut lightbox look, layered paper with parallax,
backlit glow, perforated details, Karagöz-style puppet motion, and the curtain
as the bookend (curtains open into a film, close at the end of one).

Game-level cinematics:
G1. Opening film "Dedenin Gölge Oyunu" (Remotion, 20–25 s, before the
    prologue): a Karagöz shadow screen; Deniz's grandfather, as a silhouette
    puppet, opens the old book; 15 animals leap out of its pages as paper
    shadows, scatter over a paper map of Anatolia and each becomes a coin in its
    city. The screen darkens, lightning flashes in the window, the power cuts,
    and Deniz's flashlight clicks on: hand over straight into the prologue room.
G2. Book discovery (in-engine): when the light first touches the book, dust
    motes swirl, the 15 coins on the cover glint one by one in a ring, the clasp
    clicks open, the book lifts off the desk and moves toward the camera.
G3. Book UI animation (in-engine): the cover opens in 3D; pages turn with a
    paper curl and sound; the grandfather's letter writes itself in ink; locked
    pages carry a wax seal that cracks open when that city's coin is found; on
    the Efes page the bee briefly lifts off the page and settles back.
G4. Room to map transition (in-engine): Deniz puts the book in her satchel; the
    camera pushes into the old wall map, which unfolds pop-up style into the
    game's paper map; a dotted path draws from the house in Selçuk to Efes.
    No hard page reload between prologue and map.
G5. City selection (in-engine): the city's coin flips to show its animal, the
    animal flies/runs/glides into the city and the camera follows, then the
    act's title card.
G6. Return to the map after an act: the new coin lands in its place, the city
    lights up, and its book page's seal cracks.

Per-act cinematics:
1. Act opening (optional, 8–15 s): the place and mood as the curtain opens.
2. Animal debut (required, 4–8 s): the first time the act's animal appears.
3. Story beats (optional, 0–2 per act, 3–8 s): a big discovery or payoff.
4. Act ending (required, 20–25 s): coin pieces gather into the city's coin,
   it spins, Deniz holds it up with the animal, the coin settles on the paper
   map, the city lights up, curtains close, the next act's name appears.
   One shared template for every act.

Which tool for which:
- Remotion (in /video) for non-interactive films (G1, act openings, act
  endings, beats that don't depend on the player). Shared components in
  /video/src/components; each film is data-driven by props (city, coin pieces,
  colours, map position, animal, next act).
- In-engine (src/engine/cinematic) for anything that continues straight from
  gameplay or reacts to game state (G2–G6, animal debuts): input locked,
  gentle letterbox, camera push/pan, scripted puppet moves.
- New images and motion clips come from Higgsfield: check my balance and the
  expected cost, list what you'll generate, and wait for my OK.

Every film: skippable ("Geç" button, tap or Enter); under prefers-reduced-motion
show a key frame instead; 1920×1080 WebM (VP9) plus MP4 fallback for the game,
1080×1920 vertical for social media; ≤ 2 MB per short clip, ≤ 5 MB per act
ending or opening film; audio from our chimes and ambience; lazy-load only the
next film. G1 plays once; afterwards it is available from the map.

Each act keeps src/acts/<city>/cinematics.ts listing its films (type, beat,
duration, tool, assets). When starting a new act, propose that list first and
wait for my approval before building.
