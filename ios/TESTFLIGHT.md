# What to test

Notes for TestFlight testers. Newest build first.

## 1.0.0 (next build): Monday super-ingredient reminder

- **A notification every Monday at 9 AM** names the week's super ingredient.
  Tapping it opens the showcase. Turn it off in Settings → Super ingredient of
  the week. It only appears if you've allowed Fridge's notifications.

## 1.0.0 (build 142): super ingredient of the week

- **Tonight → Super ingredient of the week**: a new featured ingredient every
  Monday (spinach, lentils, salmon…) with why it's good for you, nutrition per
  serving, three recipes to cook this week, and tips for buying, storing and
  getting kids to eat it. It shows if you already have some, and can add it to
  your shopping list. Recipes you open are added to Recipes.

## 1.0.0 (build 140): privacy policy

- **Settings → Claude → Privacy policy** opens the app's privacy policy: what stays
  on your phone, what's sent for AI features, and to whom.

## 1.0.0 (build 138): ask ChatGPT or Claude

- **Ask another AI**: in Chef, tap the arrow button (top right) and pick ChatGPT or
  Claude. It opens that app with your question and what's in your kitchen, using the
  plan you already pay for. It's also copied, so paste it if the app opens empty.
  When today's free AI requests run out, the error has an "Ask another AI" button too.

## 1.0.0 (build 134): faster scanning

- **Photo scanning, receipt reading and nutrition estimates** now use a smaller,
  faster Claude model. Check that receipts still come out right (abbreviations
  expanded, non-food skipped, sensible expiry dates) and tell us if anything got worse.

## 1.0.0 (build 132): shared AI server

- **No API key needed (once it's switched on)**: this build talks to the app's own
  server, so the chef, scanning, import and nutrition estimates won't need a key.
  AI isn't switched on yet, so for now they'll say "AI features aren't switched on
  yet"; a key in Settings still works. Settings shows "15 of 15 left today".

## 1.0.0 (build 126): new look, Plum & Oat

- **New colours**: warm oat and cream backgrounds with a deep plum accent, and a
  matching app icon. Check light and dark mode, and tell us if anything is hard
  to read. The freshness tags (green, yellow, red, blue) haven't changed.

## 1.0.0 (build 124): Share → Fridge

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
