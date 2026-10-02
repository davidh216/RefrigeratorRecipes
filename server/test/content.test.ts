import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The server's extra editions must work with the app: valid fields, specials on Mondays,
// and every recipe referenced by id, either in the app's library or included with the edition.
const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const content = read("../content/super-ingredients.json");
const bundled: { id: string }[] = read("../../ios/RefrigeratorRecipes/Resources/SuperIngredients.json");
const libraryRecipes: { id: string; title: string }[] = read("../../ios/RefrigeratorRecipes/Resources/SampleRecipes.json");
const libraryIDs = new Set(libraryRecipes.map((r) => r.id));
const libraryTitles = new Set(libraryRecipes.map((r) => r.title));
// The app's tag and cuisine ids, read from FridgeCore so the two can't drift.
const swift = (name: string) => readFileSync(new URL(`../../ios/Packages/FridgeCore/Sources/FridgeCore/${name}`, import.meta.url), "utf8");
const TAGS = new Set([...swift("RecipeTag.swift").matchAll(/RecipeTag\("([^"]+)",/g)].map((m) => m[1]));
const CUISINES = new Set([...swift("Cuisine.swift").matchAll(/Cuisine\("([^"]+)",/g)].map((m) => m[1]).concat("other"));
const CATEGORIES = new Set(["produce", "dairy", "meat", "seafood", "bakery", "frozen", "grains", "condiments", "beverages", "snacks", "other"]);

test("editions are complete and their recipes can be opened", () => {
  for (const e of content.editions) {
    for (const field of ["id", "ingredient", "match", "headline", "intro", "choose", "store", "kidTip"]) {
      assert.ok(typeof e[field] === "string" && e[field].length > 0, `${e.id}: ${field}`);
    }
    assert.ok(CATEGORIES.has(e.category), `${e.id}: category`);
    assert.equal(e.benefits.length, 3, `${e.id}: three benefits`);
    assert.ok(e.serving.grams > 0 && e.serving.label, `${e.id}: serving`);
    assert.equal(e.recipes.length, 3, `${e.id}: three recipes`);
    const details: { id?: string; title: string; cuisine: string; tags: string[] }[] = e.recipeDetails ?? [];
    for (const r of details) {
      assert.match(r.id ?? "", /^[a-z0-9]+(-[a-z0-9]+)*$/, `${e.id}: "${r.title}" needs a slug id`);
      assert.ok(!libraryIDs.has(r.id!), `${e.id}: "${r.id}" clashes with a library recipe`);
      assert.ok(CUISINES.has(r.cuisine), `${e.id}: "${r.title}" has unknown cuisine ${r.cuisine}`);
      for (const tag of r.tags) assert.ok(TAGS.has(tag), `${e.id}: "${r.title}" has unknown tag ${tag}`);
    }
    const includedIDs = new Set(details.map((r) => r.id));
    const includedTitles = new Set(details.map((r) => r.title));
    for (const ref of e.recipes) {
      // Titles for now, so builds from before 1 October 2026 (title matching only) can open them;
      // newer builds accept either. Switch to ids once every tester has updated.
      const known = libraryIDs.has(ref) || includedIDs.has(ref) || libraryTitles.has(ref) || includedTitles.has(ref);
      assert.ok(known, `${e.id}: "${ref}" is neither a library recipe nor included (by id or title)`);
    }
  }
});

test("specials fall on Mondays and name known editions", () => {
  const ids = new Set([...bundled.map((e) => e.id), ...content.editions.map((e: { id: string }) => e.id)]);
  for (const [week, id] of Object.entries(content.special ?? {}) as [string, string][]) {
    assert.match(week, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(new Date(`${week}T12:00:00Z`).getUTCDay(), 1, `${week} is a Monday`);
    assert.ok(ids.has(id), `special ${week}: unknown edition ${id}`);
  }
  for (const id of content.rotation ?? []) assert.ok(ids.has(id), `rotation: unknown edition ${id}`);
});

// Recipe packs (GET /v1/content/recipes): every recipe must open and save in the app.
// Deeper checks (units, steps, diet tags, mood rules, calories) are ios/tools/recipe_lint.py,
// which the Server workflow also runs.
const packs: { id: string; title: string; recipes: Record<string, unknown>[] }[] = read("../content/recipe-packs.json").packs;

test("recipe packs are complete and never clash with the library", () => {
  const packIDs = new Set<string>();
  const ids = new Set(libraryIDs);
  const titles = new Set([...libraryTitles].map((t) => t.toLowerCase()));
  for (const pack of packs) {
    assert.match(pack.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `pack id ${pack.id}`);
    assert.ok(!packIDs.has(pack.id), `duplicate pack ${pack.id}`);
    packIDs.add(pack.id);
    assert.ok(typeof pack.title === "string" && pack.title.length > 0, `${pack.id}: title`);
    assert.ok(Array.isArray(pack.recipes) && pack.recipes.length > 0, `${pack.id}: recipes`);
    for (const r of pack.recipes as { id: string; title: string; summary: string; cuisine: string; tags: string[];
      prepMinutes: number; cookMinutes: number; servings: number; ingredients: unknown[]; instructions: string[] }[]) {
      const where = `${pack.id}: "${r.title}"`;
      assert.match(r.id ?? "", /^[a-z0-9]+(-[a-z0-9]+)*$/, `${where} needs a slug id`);
      assert.ok(!ids.has(r.id), `${where}: id ${r.id} is already used`);
      ids.add(r.id);
      assert.ok(!titles.has(r.title.toLowerCase()), `${where}: title is already used`);
      titles.add(r.title.toLowerCase());
      for (const key of ["summary"]) assert.ok(typeof (r as Record<string, unknown>)[key] === "string", `${where}: ${key}`);
      for (const key of ["prepMinutes", "cookMinutes", "servings"]) {
        assert.ok(Number.isInteger((r as Record<string, unknown>)[key]), `${where}: ${key}`);
      }
      assert.ok(CUISINES.has(r.cuisine), `${where}: unknown cuisine ${r.cuisine}`);
      for (const tag of r.tags) assert.ok(TAGS.has(tag), `${where}: unknown tag ${tag}`);
      assert.ok(r.ingredients.length >= 3 && r.instructions.length >= 3, `${where}: ingredients and steps`);
    }
  }
});
