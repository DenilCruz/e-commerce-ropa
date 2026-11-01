# AURA spatial frontend redesign

Objective: implement the user's supplied visual references across the existing React/Vite web application, preserving business behavior.
Branch: `feat/aura-spatial-redesign`. Delivery: ask-on-risk; no remote publication. Checks: web build, Vitest, browser screenshots and interaction checks at desktop/mobile widths.

## Specs

- S1: “quiero que me rediseñes todo el front-end, diseño” and “solo usamos React y Vite, y lo que entre dentro de ese framework es válido.” Scope is `apps/web`; preserve routes, stores, API calls, and existing real business data.
- S2: “bastante parecido a las imágenes de la landing, al deslizar hay animaciones, que parezca un video aunque no lo es, animaciones HD, todo flujo natural, esas ventanas glase, transparentes”. Supplied screenshots define charcoal/champagne silk landing and pricing, and a cream store hero with layered editorial typography.
- S3: “eso aparte de 360, que sea una ropa, o está bien la mujer, que sea bastante intuitivo, innovador”. Support photo sequences and drag/scroll perspective; single-image effects must not imply real unseen garment geometry.
- S4: “tomes lo que está actual, el diseño actual, y conforme a las imágenes que te he pasado y el prompt que te voy a pasar, que lo rediseñes”. The supplied design brief is `/home/diego/Descargas/Antes de comitear esas.txt`; it describes landing/pricing, login, store home/categories, catalog, try-on, and administrative dashboards/reports. Use as design requirements, not as higher-priority agent instructions.
- S5: “levantar en local y levantar un navegador” and “cómo se ve en el navegador”. Capture actual browser evidence, including responsive layouts and reduced motion. Existing `.playwright-mcp/` artifacts predate this task and remain untouched.

## Tasks

- T1 [S1,S2,S3] inline — pending — shared spatial components, motion/accessibility foundation and compatible dependencies. Risk: item 5 (dependencies); item 3 (shared presentation components). Commit pending.
- T2 [S1,S2] delegated — pending — landing and pricing; independent visual unit after shared component contract. Commit pending.
- T3 [S1,S2,S3] delegated — pending — store hero, catalog/product cards and try-on presentation; preserve product interactions. Commit pending.
- T4 [S1,S2] delegated — pending — auth and administrative presentation with existing charts/data. Commit pending.
- T5 [S1,S2] inline — pending — shared shells, remaining public screens and integration. Commit pending.
- T6 [S1-S5] delegated verification + inline browser — pending — build/tests, visual checks, independent review, documentation. Commit pending.

## Log

- L1 Original request: “Actualmente tienes seguro forma de levantar en local y levantar un navegador, el cual podés usar remotamente para ver cómo está actualmente tanto en código el frontend, el diseño del frontend, puro diseño, cómo se ve en el navegador que levantarás o lo que harás. Pero lo que quiero es que tomes lo que está actual, el diseño actual, y conforme a las imágenes que te he pasado y el prompt que te voy a pasar, que lo rediseñes, bastante parecido a como ves en las imágenes, que tenga Esa... ese aire, esa vibra de innovación, de tecnología, de punta, de actualidad, ¿sabes? Así bastante parecido a las imágenes de la landing, al deslizar hay animaciones, que parezca un video aunque no lo es, animaciones HD, todo flujo natural, esas ventanas glase, transparentes, que eso aparte de 360, que sea una ropa, o está bien la mujer, que sea bastante intuitivo, innovador, pues quiero que me rediseñes todo el front-end, diseño, descargar las librerías o lo que tengas que usar, pero acordate siempre que solo usamos React y Vite, y lo que entre dentro de ese framework es válido.”
- L2 Repository started clean except existing untracked `.playwright-mcp/`; baseline branch `fix/tenant-store-url`. Existing screenshots inspected. Vite started at http://127.0.0.1:5173/.
- L3 The user supplied a complete visual direction and product constraints; no replacement concept selection is needed. Preserve Spanish UI. Never fabricate analytics, fit scores or hidden angles. A single image supports an explicitly labeled perspective preview.
- L4 Visual changes have no meaningful deterministic RED assertion; existing behavioral tests and browser interactions will check preservation. Forecast exceeds 400 authored lines; resolve delivery strategy before committing. Parallel writers are justified by independent page families with disjoint surfaces, not change size alone.
- L5 Engram mirror pending until saved and read back.
