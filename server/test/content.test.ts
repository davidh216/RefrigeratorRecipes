import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// The server's extra editions must work with the app: valid fields, specials on Mondays,
// and every recipe either in the app's library or included with the edition.
const read = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const content = read("../content/super-ingredients.json");
const bundled: { id: string }[] = read("../../ios/RefrigeratorRecipes/Resources/SuperIngredients.json");
const library = new Set((read("../../ios/RefrigeratorRecipes/Resources/SampleRecipes.json") as { title: string }[]).map((r) => r.title));
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
    const included = new Set((e.recipeDetails ?? []).map((r: { title: string }) => r.title));
    for (const title of e.recipes) {
      assert.ok(library.has(title) || included.has(title), `${e.id}: "${title}" is neither in the library nor included`);
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
