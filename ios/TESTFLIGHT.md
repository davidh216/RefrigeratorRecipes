# What to test

Notes for TestFlight testers. Newest build first.

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
