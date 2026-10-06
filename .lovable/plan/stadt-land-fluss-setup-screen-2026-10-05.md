# Stadt Land Fluss setup screen

## What will change
- Keep the title screen as the first screen.
- Remove the current explanatory second screen from the horizontal card sequence.
- Add a new setup screen directly after the title with four cards stacked vertically and 16 px spacing.
- Make the first three cards independently swipeable. They will cycle through the non-empty entries in columns A, B, and C of the provided Google Sheet.
- Color the three category cards using the existing Info yellow, terracotta, and Regeln pink styles.
- Make the fourth card a random-letter button. Each tap chooses and displays a new letter from A–Z.
- Change the top-right button so it opens the former second-screen explanation in a full-screen overlay instead of opening category filters.

## Interaction details
- Swiping one category card will not move the other cards or the main screen.
- A short horizontal swipe or desktop drag changes that card by one item; the category list wraps at both ends.
- Vertical movement remains available for normal touch handling, while the overall setup screen stays within the phone viewport.
- The random-letter result stays visible until the button is tapped again or the page reloads.

## Data and fallbacks
- Read the three category lists from the sheet named `Tabellenblatt1` in the supplied spreadsheet.
- Ignore empty cells and support future additions without code changes.
- Show a quiet empty-state label for a column until it contains entries or if the sheet cannot be reached.

## Technical details
- Add a dedicated setup-screen component containing three isolated swipe states and the letter picker.
- Reuse the existing full-screen dialog foundation for the explanation overlay and existing semantic color tokens for the cards.
- Keep the existing question-card ordering and filtering behavior unchanged after the setup screen.
- Fetch the sheet on initial load only; do not poll or refetch during rendering.
- Update the app metadata from the previous product name to Stadt Land Fluss.
