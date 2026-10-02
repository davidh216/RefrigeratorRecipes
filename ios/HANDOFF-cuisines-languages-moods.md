# Handoff: cuisines, menus, languages and mood tags

Scope and plan for the next big content push in the Fridge iOS app, written 1 October 2026.
Read this before starting; it records what exists today, what to build, in what order, and
the decisions still open.

**Status (1 October 2026):** Phase 1 is built: `RecipeTag`, `Cuisine` and `MoodRules` in FridgeCore,
stable `id`s on every library recipe (`Recipe.libraryID` in the app), the cleaned and mood-tagged library
(193 recipes, linted with zero errors), mood chips on Recipes and Tonight, and the chef taking a mood.
Phases 2–4 are not started. From the second priority, the first-run welcome is built
(`Features/Welcome/WelcomeView.swift`), and the public TestFlight copy and checklist are in
`ios/PUBLIC-BETA.md`; the App Store Connect steps there need the account owner.

**Priority order**

1. **This document's scope:** cuisines and menus, mood tags, then languages (phases 1–4 below).
2. **Second priority, after phase 1:** a first-run welcome and public TestFlight prep
   (see "Second priority" at the end).

---

## Where things stand today

Measured from `ios/RefrigeratorRecipes/Resources/SampleRecipes.json` and the code.

| Area | Today | Problem |
|---|---|---|
| Library | 181 recipes, linted by `ios/tools/recipe_lint.py` | Good base. |
| Cuisines | 27 free-text values. American 40, Italian 25, Mexican 15, Chinese 14, Thai 12, Indian 10, Japanese 10, Korean 9, Greek 8, Middle-Eastern 8, then 17 with 1–4 each. | Not a real taxonomy: "healthy", "modern", "asian" aren't cuisines. Many families of cooking are missing or have one recipe (French 1, Ethiopian 1, Vietnamese 2, no Caribbean, West African, Persian, Brazilian, Peruvian, Polish…). |
| Tags | 52 free-text tags, e.g. dinner 147, quick 84, vegetarian 82, spicy 23, comfort-food 10, healing 1 | No fixed list: near-duplicates ("high-protein" / "protein-rich", "asian" / "asian-inspired"), cuisines used as tags ("italian"), one-offs ("cookies", "elegant"). Moods barely exist. |
| Browsing | Recipes tab has Can make / All / Trending / Favorites, plus a search box that also matches tags | No way to browse by cuisine, mood or occasion. |
| Recipe identity | Recipes are matched by **title** (sample import, super-ingredient editions, server content) | Breaks as soon as a title is translated. Needs stable IDs first. |
| Language | All UI strings are hard-coded English; there's no String Catalog. Ingredient matching (`IngredientName`), allergy and diet rules (`DietRules`), the nutrition table and receipt reading are all keyed on English words. Units are US customary. | Translating only the screens would leave allergy warnings, "can make" matching and nutrition silently wrong for translated recipes. Language has to go through the data, not just the UI. |
| Server content | `server/content/super-ingredients.json` already delivers editions and recipes without an app update | Reuse this pipeline for menus and new recipe packs. |

---

## Goals

1. **Cuisines people recognize,** organised by region, with real depth: at least 6 good recipes
   in every cuisine we show.
2. **Menus:** curated sets for an occasion or a week ("Taco Tuesday", "Lunar New Year",
   "Lunchbox week"), delivered from the server like super ingredients.
3. **Mood tags:** browse by how you feel. The four you asked for: **Comfort food**,
   **Feeling spicy**, **Under the weather** and **Easy to stomach**. Plus a few more (proposed below).
4. **Languages:** the app and recipes in more than English, without breaking allergy warnings,
   ingredient matching or nutrition.

---

## 1. Tag and cuisine system (foundation; do first)

### 1.1 A fixed tag vocabulary

Replace free-text tags with a vocabulary in FridgeCore (`RecipeTag.swift`). Each tag has an id,
a kind, a display name, an SF Symbol, and aliases that map old or imported spellings onto it.

| Kind | Tags |
|---|---|
| Meal | breakfast, brunch, lunch, dinner, snack, side, dessert |
| Diet (checked by `DietRules`, never hand-set wrongly) | vegetarian, vegan, pescatarian, gluten-free, dairy-free |
| Effort and method | quick (≤30 min), one-pot, sheet-pan, slow-cooker, grill, no-cook, meal-prep, freezer-friendly, make-ahead |
| Audience and budget | kid-friendly, picky-eaters, budget, crowd-pleaser |
| Nutrition | high-protein, high-fiber, lighter |
| **Mood** (new) | comfort-food, feeling-spicy, under-the-weather, easy-to-stomach, cozy-night-in, light-and-fresh, hot-day, date-night, lazy-sunday |
| Discovery | viral, seasonal, new |

**Aliases to merge:**
- protein-rich → high-protein
- healthy → lighter
- spicy → feeling-spicy
- healing → under-the-weather
- asian-inspired, asian, italian and other cuisine names → moved to `cuisine`, removed from tags
- one-offs (cookies, elegant, cheesy, creamy, trendy, authentic, pizza, soup, curry, classic) → dropped or folded into a real tag

The linter enforces the vocabulary: an unknown tag is an error. Imports and AI-generated recipes
are normalised through the aliases.

### 1.2 Mood tag definitions

Moods need clear rules so they mean something. The linter checks the hard rules and a person
reviews the rest.

| Mood | Means | Hard rules (linter) | Guidance |
|---|---|---|---|
| **Comfort food** | Warm, rich, familiar; the bowl-on-the-couch dinner | Served warm (not a salad or no-cook) | Pasta bakes, stews, soups, pot pies, mac and cheese, curries, congee |
| **Feeling spicy** | Real heat, on purpose | Has a chili ingredient (fresh chili, chili flakes or powder, gochujang, chipotle, curry paste, hot sauce, Sichuan pepper) | Say how hot in the summary. Point to milder alternatives. |
| **Under the weather** | Easy to make when you feel rough, and soothing to eat | Warm; ≤ 15 min hands-on; ≤ 8 ingredients excluding staples | Brothy soups, congee, ginger, lemon, honey. **No health claims**: "comforting", never "cures" or "boosts immunity". |
| **Easy to stomach** | Gentle, plain food | No chili or hot spice, nothing deep-fried, no alcohol; fat and fibre below a per-serving cap set from the nutrition table (fat ≤ 18 g, raised from 15 g on 2 October 2026; fibre ≤ 6 g) | Rice, broth, plain chicken, eggs, toast, banana, oats. Same no-claims rule. |
| Cozy night in | Slow, rewarding weekend cooking | ≥ 45 min total | Braises, bakes, homemade pasta |
| Light & fresh | Bright, not heavy | ≤ 500 kcal per serving (estimated) | Salads, bowls, grilled fish |
| Hot day | Little or no stove | no-cook, grill, or ≤ 15 min of cooking | Cold noodles, salads, wraps |
| Date night | A bit special, still doable | — | Kept short and curated |
| Lazy Sunday | Brunch and big-batch | — | Pancakes, frittatas, bakes |

The Under the weather and Easy to stomach pages get a footer: "Ideas for gentle, comforting
meals. Not medical advice; follow your doctor's guidance." The wording follows the same rule as
the super ingredient benefits: facts and comfort, no promises.

### 1.3 A cuisine taxonomy

`Cuisine.swift` in FridgeCore holds a fixed list with a display name, region and aliases.
`cuisine` stays a string on `Recipe`, so CloudKit doesn't need to change, but only known ids are allowed.

| Region | Cuisines |
|---|---|
| North America | American, Southern & Soul, Cajun & Creole, Tex-Mex, Canadian |
| Latin America & Caribbean | Mexican, Caribbean (Jamaican, Cuban, Puerto Rican), Brazilian, Peruvian, Argentinian, Colombian |
| Europe | Italian, French, Spanish, Greek, British & Irish, German & Austrian, Polish & Eastern European, Scandinavian, Portuguese |
| Middle East & North Africa | Lebanese & Levantine, Turkish, Persian, Moroccan & North African, Israeli |
| Africa | Ethiopian, West African (Nigerian, Ghanaian), South African |
| South Asia | Indian (North and South), Pakistani, Sri Lankan |
| East Asia | Chinese (Cantonese, Sichuan, home-style), Japanese, Korean, Taiwanese |
| Southeast Asia | Thai, Vietnamese, Filipino, Indonesian & Malaysian |

**Cleanup of today's values:**
- "healthy" and "modern" → their actual cuisine
- "asian" → the specific cuisine
- "middle-eastern" → Lebanese & Levantine, unless it's clearly something else

### 1.4 Stable recipe IDs (required before languages and menus)

- Add an `id` slug to every library recipe, e.g. `"red-lentil-dal-with-spinach"`.
- Add `libraryID: String = ""` to the SwiftData `Recipe` model. Give it a default, so CloudKit is fine.
- Switch sample import, super-ingredient editions and server content from titles to ids. Accept
  titles as a fallback for one release so cached server content keeps working.
- Backfill `libraryID` on saved recipes by matching titles once at launch.

---

## 2. Cuisines in the app

- **Recipes tab → "Explore":** a new mode with
  - a mood row ("What are you in the mood for?"), using big chips;
  - cuisines grouped by region, each showing its recipe count;
  - this week's menu.
- **A cuisine page:** a header with a one-line intro, the cuisine's recipes (with "can make"
  matches first), and a "Plan 3 of these" button that hands them to the existing week planner.
- **Tonight:** below the super ingredient, show a mood chip row on the "Nothing grabbing you?"
  card. Tapping a mood filters tonight's picks, or asks the chef with that mood. Wire it through
  `TonightPlanner` as a filter.
- **Chef:** pass the chosen mood and cuisine into the prompt ("I'm feeling spicy, Korean please"),
  and make `generateRecipe` return tags and a cuisine from the fixed lists. Add them as an enum
  to the JSON schema, so the model can only pick valid values.
- **Imports:** run imported recipes through the alias maps; unknown cuisines become "Other".

### 2.1 Library expansion

Fill the gaps so every cuisine we show has at least 6 recipes. Rough target: **+150 recipes**,
to about 330. Written the same way as the current 181, then linted and reviewed:

- **First wave (biggest gaps for US families):** Caribbean 8, Vietnamese 6, French 6, Persian 6,
  Brazilian 6, Peruvian 6, Filipino 4 more, West African 6, Turkish 6, Southern & Soul 8,
  Pakistani 6, Taiwanese 6.
- **Mood coverage:** at least 20 recipes each for Comfort food, Feeling spicy and Easy to stomach,
  and 12 for Under the weather. Many come from re-tagging the existing library.
- Each new recipe is checked by the linter's tag rules and calorie estimate, and keeps the current
  bar: weeknight-friendly, everyday supermarket ingredients, and a "find it at" note for anything
  specialist.

Ship new recipes as **server recipe packs** (same pipeline as `server/content`), so they arrive
without an app update and can be refined after testers try them.

---

## 3. Menus (curated collections)

A menu is a named set of 3–7 recipes, with a short intro and optional date window.

- **Weekly menus:** "Taco Tuesday", "Meatless Monday", "Lunchbox week", "Sheet-pan week", "$50 week".
- **Occasions and holidays:** Lunar New Year, Ramadan iftar, Passover, Easter, Cinco de Mayo,
  4th of July cookout, Diwali, Thanksgiving, Hanukkah, Christmas, New Year's.
- **Mood menus:** "Sick-day soups", "Cozy Sunday", "Feeling spicy".

How it works:
- `server/content/menus.json`, served at `GET /v1/content/menus`. It uses the same patterns as
  super ingredients: optional date windows, recipes by id or embedded in full, content tests on
  the server, and caching in the app.
- **App:**
  - menus appear in Explore;
  - menus that are currently in season appear on Tonight;
  - each menu has "Add all to plan", which uses `WeekPlanner` to spread the recipes over open days;
  - and "Shop for this menu", which reuses the shopping list.
- **Cultural care:** holiday menus need someone who cooks that food to review them, and the copy
  shouldn't flatten traditions ("Lunar New Year dishes many families make", not "the" menu).

---

## 4. Languages

There are two separate needs. Do them in this order.

### 4.1 The app in another language (UI)

- Move every user-facing string into a **String Catalog** (`Localizable.xcstrings`); SwiftUI `Text`
  literals are picked up automatically. Notifications, quick actions, the share extension and
  `Info.plist` permission prompts need explicit keys.
- **First language: Spanish (US).** It's the largest second language among US parents. Then
  decide on the next ones from tester demand: likely Simplified Chinese, Vietnamese, Tagalog,
  Korean and French.
- **Units:** add a Metric / US setting (default from the region). `QuantityFormatter` converts for
  display only; recipes keep their original quantities.
- **Claude features** reply in the app's language: the chef, imports and new recipes. Add
  "Respond in {language}" to the prompts; JSON keys stay English.

### 4.2 Recipes in another language (content)

**The core rule: keep ingredient identity language-neutral.** Matching, allergy checks and
nutrition use canonical English ingredient keys. Only what's shown on screen is translated.

- **Library recipes:** add translations per language in
  `Resources/Recipes.<lang>.json` (or as a server pack), keyed by recipe id. Each translation has
  the title, summary, steps and ingredient display names; quantities and units stay in the base
  recipe. Translate with Claude in batches, then have a native speaker review the first 50.
- **Ingredients:** give `RecipeIngredient` an optional `canonicalName`, filled from the English
  library or by normalising imports. `DietRules`, `NutritionTable` and `IngredientName` keep using
  the canonical name, so a Spanish recipe with "camarones" still warns about shellfish.
- **Allergen keywords per language:** `DietRules` gets keyword lists for each supported
  language, as a safety net for user-typed and imported recipes. A recipe in a language we have
  no keywords for gets a visible "allergy check not available in this language" note rather than
  a silent pass.
- **Imported or user recipes in other languages:**
  - keep the original text;
  - offer **"Translate"**, using Apple's on-device Translation framework (`TranslationSession`;
    check availability on iOS 18). It's free and private;
  - fall back to Claude when that isn't available.
- **Receipts in other languages:** the receipt prompt already lets Claude read anything. Ask it
  for canonical English item names plus the original text.
- **Authentic original-language recipes** (e.g. a Korean recipe written in Korean): support it
  later, by importing with the original kept and a translated view. Not phase 1.

---

## Phases and rough effort

"Session" = one focused working session like the ones that built super ingredients.

| Phase | What | Effort | Ships as |
|---|---|---|---|
| **1. Foundation + moods** | Tag vocabulary and aliases, cuisine taxonomy, linter rules, stable recipe ids, re-tag and clean the 181, mood row in Recipes and on Tonight, chef mood and cuisine | 2–3 sessions | App build + linted library |
| **2. Explore + cuisines** | Explore screen, cuisine pages, "Plan 3 of these", recipe packs from the server, first wave of ~75 recipes | 3–4 sessions | App build + server packs |
| **3. Menus** | `menus.json` pipeline, Explore and Tonight placement, add-all-to-plan, shop-for-menu, first 10 menus | 2 sessions | Mostly server content |
| **4. Languages** | String Catalog + Spanish UI, units setting, Claude replies in the user's language, canonical ingredients, Spanish library translations, allergen keywords in Spanish, on-device Translate for imports | 4–6 sessions | App build + translation files |
| 2b | Second wave of ~75 recipes and more mood coverage | 2 sessions | Server packs |

Phase 1 is a prerequisite for the rest, and phase 4 depends on the stable ids from 1.4.

---

## Decisions needed (from David)

1. **Which languages after Spanish?** Or Spanish only for now.
2. **Mood list:** keep the 9 above, or trim to your 4 plus 2–3 more.
3. **Where moods live:** Recipes Explore only, or also on Tonight. I recommend both.
4. **Recipe pack review:** are you happy for new recipes to ship as server packs after lint and
   my review, with your thumbs-up on a sample? Or do you want to read every one?
5. **Holiday menus:** which holidays matter most to your testers?

---

## Second priority: first-run welcome and public TestFlight prep

Do this after phase 1, before inviting people outside the household.

### First-run welcome

A new tester currently lands on an empty fridge with no recipes; the 181 starter recipes only appear
through Settings → Add sample recipes.

- 3–4 screens, shown once:
  1. What Fridge does.
  2. Household: names, allergies and diets, with the existing editor in a lighter form.
  3. "Add 180+ starter recipes?" (on by default), plus reminder permission, with the reason given.
  4. "Fill your fridge": scan your last grocery receipt, add items by hand, or skip.
- Ask for permissions only at that point, not at launch.
- Skippable; reachable later from Settings.
- When the welcome finishes, schedule the Monday reminders and super-ingredient refresh.

### Public TestFlight prep

- **Tester-facing copy:** the beta app description, "what to test", feedback email, and a
  privacy policy link (already live at `/privacy`).
- **Beta App Review notes:**
  - AI features use the shared server, with no login required;
  - App Attest is active;
  - there's nothing behind a paywall.
- **App Store Connect steps:** create an external group, add the build, submit for Beta App
  Review, then turn on the public link with a tester limit.
- **Before opening the link:**
  - switch App Attest to `require` (once the usage page shows ~100% verified);
  - consider raising `GLOBAL_DAILY_LIMIT`;
  - add the `FRIDGE_ADMIN_TOKEN` secret so usage can be watched.

---

## Useful references in the repo

- `ios/tools/recipe_lint.py`: recipe checks. Extend it with the tag vocabulary, cuisine list and mood rules.
- `ios/Packages/FridgeCore`: put `RecipeTag`, `Cuisine` and the mood rules here, with XCTests.
- `server/content/` and `server/test/content.test.ts`: the content pipeline to copy for menus and recipe packs.
- `ios/RefrigeratorRecipes/Services/SuperIngredient.swift`: the server-content store pattern (fetch, cache, fall back).
- `ios/DESIGN.md`: Plum & Oat tokens and component rules for the new screens.
- `ios/NUTRITION.md`: nutrition phases and the no-medical-claims rule the mood tags follow.
