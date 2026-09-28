# Nutrition phase: plan

Goal: know what's in the food you plan and cook, keep unsafe food out of every
suggestion, and let "Plan my week" aim at a goal ("high protein, ~2,000 kcal, no
peanuts") instead of only at what's expiring.

Status: Phases A and B are built. C is next. D (tracking) is out of scope for now.

## Decisions (Sep 2026)

- **Profiles are per person.** Everyone in the household gets a profile, and shared
  meals respect everyone's restrictions merged. Targets (Phase C) are also per
  person, and a shared dinner is judged against each person's portion.
- **Allergies: the core set first.** That's the nine major allergens plus gluten,
  three diets, and free-text "foods to avoid". More (for example nightshades or
  low-FODMAP) get added as needed.
- **Planning-level nutrition only.** No food diary or Apple Health for now, so
  Phase D is parked.

## Principles

1. **Allergies are safety, macros are guidance.** An allergy is a hard filter
   everywhere (Tonight, Plan my week, recipe search, the Chef, receipt import
   warnings). Macros are estimates and are always shown as such ("≈ 540 kcal").
2. **Never claim "allergen-free".** Detection is keyword-based and can miss things,
   so the app says "contains milk" when it finds something. It never says "safe".
   Each recipe can be marked "I've checked this" by the user.
3. **Zero typing for the common case.** Nutrition is computed from the ingredients
   a recipe already has. Goals come from a short setup, not a spreadsheet.
4. **Local-first, like the rest of the app.** Nutrition data ships with the app or
   is cached per ingredient. It syncs through iCloud with everything else.

## Phases

### Phase A: Allergies and diets (safety first). Built

What shipped:
- **Settings → Household**: one profile per person (name, allergies, diet, foods to
  avoid).
- **FridgeCore `DietRules`**: allergen and diet detection, the merged household
  restrictions, and conflict summaries, all with unit tests.
- **Where it's enforced**:
  - Tonight and Plan my week/Swap skip recipes that conflict.
  - The add-meal picker flags them ("Contains milk").
  - Recipe detail shows "Not for Sam: milk (Parmesan)".
  - The Chef and recipe generation get everyone's needs in their instructions.

The original plan follows.

- **Profile**: allergies to the FDA's nine major allergens (milk, eggs, fish,
  crustacean shellfish, tree nuts, peanuts, wheat, soy, sesame) plus gluten, and
  any custom ingredient ("cilantro"). Diets: vegetarian, vegan, pescatarian,
  dairy-free, gluten-free, low-carb/keto. Settings has a "Household" section so
  one person's peanut allergy applies to every plan.
- **FridgeCore `Allergens`**: maps ingredient names to allergens with the same
  token matching as `IngredientName`. For example, parmesan/butter/yogurt map to
  milk, soy sauce maps to soy and wheat, and pesto maps to tree nuts and milk. It
  has unit tests for tricky cases: coconut milk isn't milk, and peanut butter is
  peanuts.
- **Where it applies**:
  - Tonight and Plan my week skip conflicting recipes.
  - Recipe detail shows a "Contains milk, wheat" strip.
  - The recipe list has a "Fits my diet" filter.
  - The Chef's system prompt includes the restrictions, and generated recipes are
    re-checked.
  - Barcode items use Open Food Facts' `allergens_tags`.
  - Receipt import warns about items that conflict.
- **Model**: `DietProfile` (a single synced record holding allergies, diets and
  custom exclusions) and `Recipe.checkedSafe: Bool`.

### Phase B: Nutrition per recipe. Built

What shipped:
- **FridgeCore `NutritionTable`**: about 190 everyday ingredients per 100 g (rounded
  USDA values), with densities and per-item weights. It finds the most specific
  match, so "chicken breasts" finds chicken breast and "chicken broth" never finds
  chicken.
- **`NutritionCalculator`**: per-serving calories, protein, carbs, fat and fiber,
  plus a coverage score. Optional ingredients are left out, and "to taste"
  counts as 0 g.
- **Recipe pages** have a "Per serving" card showing "Partial estimate" when
  coverage is under 80%, and list what's left out. **"Estimate the rest with
  Claude"** fills the gaps once. The answers are cached per ingredient
  (`IngredientNutrition`) and synced.
- **The add-meal list** shows ≈ kcal per serving.
- **Plan day headers** show the per-person total for the day ("≈ 1,850 kcal · 96 g
  protein").

The original plan follows.

- **Ingredient nutrition**, per 100 g, in order of preference:
  1. A bundled table of the ~600 most common ingredients (a USDA FoodData Central
     subset, public domain), shipped as JSON in the app.
  2. Open Food Facts nutriments for barcode-scanned items (already looked up for
     names today).
  3. For anything unknown, one Claude call returns an estimate. It's cached per
     normalized ingredient name, so each ingredient is only looked up once.
- **Quantities to grams**: `KitchenUnit` already converts units, and
  `gramsPerCup` densities cover baking staples. It needs extending with
  typical weights for count items ("1 egg ≈ 50 g", "1 onion ≈ 110 g").
- **FridgeCore `NutritionCalculator`**: takes ingredients and servings and returns
  calories, protein, carbs, fat and fiber per serving, plus a *coverage* score
  (the share of ingredient weight with known data). Below 80% coverage the UI
  shows "partial estimate".
- **UI**:
  - A macro strip on recipe detail: kcal · P · C · F.
  - A small "≈ 540 kcal · 38 g protein" line on picker rows and planned meals.
  - Per-day totals in the Plan tab's day headers.
- **Model**: cached fields on `Recipe` (`kcalPerServing`, `proteinG`, `carbsG`,
  `fatG`, `fiberG`, `nutritionCoverage`, `nutritionUpdatedAt`). They're
  recomputed when ingredients change. `IngredientNutrition` holds the cache for
  lookups from Open Food Facts and Claude.

### Phase C: Goals and goal-aware planning

- **Goal setup** takes about 30 seconds:
  - Pick a goal: lose, maintain or gain, or "just eat more protein".
  - Optional details (age, height, weight, activity) suggest a calorie target
    using Mifflin-St Jeor. The user can override every number.
  - Targets cover calories, protein, carbs, fat and fiber (plus optional sodium
    and sugar).
- **Split by meal**: in dinners-only planning, dinner gets about 35% of the day
  (adjustable). With breakfast and lunch on, there's a per-meal split.
- **WeekPlanner gets nutrition scoring**:
  - Recipes that break the Phase A filters are excluded.
  - Recipes score higher the closer they land to the per-meal target, alongside
    the existing expiry and coverage scoring.
  - A week-level pass evens out totals so one heavy night is balanced by a
    lighter one.
- **"Plan my week" options**: a chip row with *Balanced · High protein · Lighter ·
  Budget*. Each one sets the weights; the default is Balanced.
- **Plan tab**:
  - A week summary card: "Avg 1,950 kcal · 128 g protein / day, on target".
  - Day headers show a thin bar against the target.
- **The Chef can "fill the gap"**. For example: "Make me a 600 kcal, 45 g protein
  dinner with the chicken and spinach". It uses the structured-output recipe
  generator with a nutrition block.

### Phase D: Tracking (optional depth)

- **Logging what you cook**: marking a meal Cooked (`CookedSheet`) also logs
  the servings you ate as a `FoodLogEntry`. Recipes cooked from the plan are
  logged in one tap.
- **Quick add**: a barcode scan (Open Food Facts nutriments) or a search in the
  bundled table covers snacks and anything eaten away from home.
- **Today card** on Tonight: remaining calories and protein ("≈ 700 kcal, 42 g
  protein left"). It feeds the Tonight ranking in the evening.
- **Apple Health**, opt-in:
  - It writes dietary energy, protein, carbs, fat and fiber.
  - It reads body weight, to show progress against the goal.
- **Weekly check-in**: the waste summary adds "you averaged 128 g protein
  (target 140)".

## Data model (all additive, so iCloud-safe)

| Model | Fields | Phase |
|---|---|---|
| `DietProfile` | allergies `[String]`, diets `[String]`, excluded `[String]`, targets (kcal, P, C, F, fiber), dinnerShare, goal | A, C |
| `Recipe` (new fields) | checkedSafe, kcalPerServing, proteinG, carbsG, fatG, fiberG, nutritionCoverage, nutritionUpdatedAt | A, B |
| `IngredientNutrition` | normalizedName, per100g macros, source (bundled/off/claude), updatedAt | B |
| `FoodLogEntry` | date, slot, recipe?, name, servings, kcal, P, C, F | D |

All properties get defaults, and relationships stay optional, as CloudKit
requires.

## FridgeCore additions (pure, unit-tested)

- `Allergens`: ingredient to allergen set, and recipe to conflicts with a profile.
- `DietRules`: vegetarian, vegan and similar checks from ingredient names.
- `NutritionCalculator`: grams conversion, per-serving totals and coverage.
- `NutritionTargets`: Mifflin-St Jeor, goal adjustments and the per-meal split.
- `WeekPlanner`: a scoring hook (`NutritionObjective`) and week balancing.

## Risks

- **Accuracy**: estimates can be off by 10–20%. Every number is labelled "≈", and
  a partial-coverage badge shows when data is missing.
- **Allergen false negatives**: the "contains" wording, a checked-by-you flag, and
  a one-line disclaimer in the profile and on the Chef.
- **App Store (guideline 1.4.1)**: no medical claims. Targets are framed as
  personal goals, and the app links to nothing clinical.
- **Scope creep into a calorie-counting app**: tracking (Phase D) stays optional.
  The core loop is still fridge → plan → cook.

## Suggested order

A → B → C, then D if wanted. Phase A is small and protects the household
right away. Phase B makes the numbers visible. Phase C is the "goal-oriented
meal plans" payoff.
