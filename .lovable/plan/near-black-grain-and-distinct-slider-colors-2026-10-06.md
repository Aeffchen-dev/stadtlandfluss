# Near-black grain and distinct slider colors

## Changes
- Replace the visible green page image treatment with an almost-black background and fine film grain.
- Give Stadt, Land, and Fluss separate gradient palettes inspired by the reference: warm orange/red, fresh green, and cyan/blue.
- Keep every card inside each slider visually consistent by removing per-card photo, crop, and gradient-rotation variation.
- Retain the current glass blending, gestures, layout, typography, and card spacing.

## Validation
- Check the setup at the current mobile viewport.
- Confirm each slider stays one consistent color while swiping and that text remains readable.
- Confirm the preview reports no build or runtime errors.

## Technical details
- Define the page and slider treatments with semantic CSS tokens.
- Use one fixed gradient per slider family plus shared grain overlays.