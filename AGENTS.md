# Architecture rules

- Keep the Stadt Land Fluss setup experience isolated in dedicated screen components so its independent card gestures cannot interfere with the main question carousel.
- Read the setup categories from the supplied Google Sheet once on screen mount; do not poll Sheets from render loops because it is quota-limited storage.
- Keep the dev pre-bundle cache in its own folder and list the app's runtime libraries in optimizeDeps.include, so React is never split into two copies by late re-bundling or stale browser caches.
- Define setup-page backgrounds and slider-family gradients as semantic CSS tokens so each slider keeps one stable palette across all of its cards.
