# What to test

Notes for TestFlight testers. Newest build first.

## 1.0.0 (next build): Share → Fridge

- **Share a recipe into Fridge**: in TikTok, YouTube, Instagram or Safari, tap
  Share → Fridge (it may be under "More" the first time). Then open Fridge: the
  importer opens with that link. Try a caption with a link in it too.
- **Coming soon, AI without a key**: once the shared server is live, the chef,
  scanning, import and nutrition estimates will work with no API key, up to 15
  AI requests a day per phone. Settings will show how many are left.

## 1.0.0 (build 119): recipe import and a bigger library

- **Import from a link**: Recipes → + → Import from a link or video. Paste a
  recipe-site, YouTube, TikTok or Instagram link (the Paste button skips the
  clipboard prompt). Check that site recipes come in exactly as written, and that
  video ones show "From @creator · View original".
- **Import from a saved video**: pick a saved or screen-recorded cooking video.
  It asks for Speech Recognition the first time.
- **181 starter recipes**: Recipes → + → Add sample recipes adds the new ones.
  Try the **Trending** filter, and flag anything that reads wrong.

## 1.0.0 (build 115): shopping mode

- **Plan my week → "I'm shopping this week"**: with it on, Plan my week can pick
  any recipe, even ones you'd mostly have to buy for. It still uses up expiring
  food first, and **Shop for this week** adds what's missing. With it off, plans
  stick to recipes you're at most 4 ingredients short of, as before.

## 1.0.0 (build 107): meal planning, household, nutrition

- **Plan tab**: dinners only by default. Try **Plan my week**, then long-press a
  meal to swap it, move it, or drag it to another day. The add sheet stays open,
  so tap several recipes in a row.
- **Nutrition**: recipe pages show calories and macros per serving. The Plan tab
  shows each day's per-person total. Recipes with unknown ingredients say what's
  left out and offer "Estimate the rest with Claude".
- **Household**: Settings → Household → add people with allergies and diets.
  Check that Tonight and Plan my week stop suggesting recipes that conflict, and
  that recipe pages show "Not for …".

## 1.0.0 (build 106)

- **Home Screen quick actions**: long-press the app icon for Scan receipt, What's for dinner?, Add to shopping list and Fridge check-in (open the app once first).
- **Receipt scan**: Fridge → ＋ → Scan receipt. Photograph a real receipt (long ones in pages). Check the item names, the estimated dates, and that matching shopping-list items get checked off.
- **Tonight**: the three dinner picks should lean on food that expires soonest. Cook one and check the Fridge amounts go down.
- **Weekly check-in**: Fridge → check-in card. Still have it / Used it / Tossed it.
- **Look and feel**: light and dark mode, larger text sizes, Increase Contrast, VoiceOver.
- **AI features** need a Claude API key: Fridge → ⚙ → Settings.

Report anything odd with a screenshot (TestFlight → Send Beta Feedback).
