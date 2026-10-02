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

// Menus (GET /v1/content/menus): every recipe must open in the app, and windows must parse.
// Included recipes are linted by ios/tools/recipe_lint.py in the Server workflow.
type Menu = {
  id: string; title: string; intro: string; kind: string; slot?: string; mood?: string; draft?: boolean;
  window?: { from: string; to: string }; windows?: { from: string; to: string }[]; recipes: string[]; recipeDetails?: { id: string; title: string; cuisine: string; tags: string[] }[];
};
const menuContent: { rotation: string[]; menus: Menu[] } = read("../content/menus.json");
const packIDs = new Set(packs.flatMap((p) => p.recipes.map((r) => r.id as string)));

const FULL_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;
const YEARLY_DAY = /^(\d{2})-(\d{2})$/;
function realDay(year: number, month: number, day: number) {
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

test("menus are complete and their recipes can be opened", () => {
  const allIncluded = new Set(menuContent.menus.flatMap((m) => (m.recipeDetails ?? []).map((r) => r.id)));
  const seen = new Set<string>();
  const extraIDs = new Set<string>();
  for (const m of menuContent.menus) {
    assert.match(m.id, /^[a-z0-9]+(-[a-z0-9]+)*$/, `menu id ${m.id}`);
    assert.ok(!seen.has(m.id), `duplicate menu ${m.id}`);
    seen.add(m.id);
    for (const key of ["title", "intro"] as const) assert.ok(typeof m[key] === "string" && m[key].length > 0, `${m.id}: ${key}`);
    assert.ok(["weekly", "occasion", "mood"].includes(m.kind), `${m.id}: kind ${m.kind}`);
    assert.ok(m.slot === undefined || ["dinner", "lunch"].includes(m.slot), `${m.id}: slot ${m.slot}`);
    if (m.mood !== undefined) assert.ok(TAGS.has(m.mood), `${m.id}: unknown mood ${m.mood}`);
    if (m.kind === "occasion") assert.ok(m.window || m.windows?.length, `${m.id}: an occasion needs a window or windows`);
    assert.ok(!(m.window && m.windows), `${m.id}: use window or windows, not both`);
    if (m.windows) {
      for (const w of m.windows) {
        assert.ok(FULL_DAY.test(w.from) && FULL_DAY.test(w.to), `${m.id}: windows use full YYYY-MM-DD dates`);
      }
      for (let i = 1; i < m.windows.length; i++) {
        assert.ok(m.windows[i - 1].to < m.windows[i].from, `${m.id}: windows must be in order and not overlap`);
      }
      const last = m.windows[m.windows.length - 1].to;
      const nextYear = new Date(Date.now() + 365 * 86400_000).toISOString().slice(0, 10);
      if (last < nextYear) console.warn(`warning: ${m.id}: its windows end ${last}; add the next years' dates`);
    }
    assert.ok(m.recipes.length >= 3 && m.recipes.length <= 7, `${m.id}: 3 to 7 recipes`);
    assert.equal(new Set(m.recipes).size, m.recipes.length, `${m.id}: a recipe is listed twice`);
    const details = m.recipeDetails ?? [];
    for (const r of details) {
      assert.match(r.id ?? "", /^[a-z0-9]+(-[a-z0-9]+)*$/, `${m.id}: "${r.title}" needs a slug id`);
      assert.ok(!libraryIDs.has(r.id) && !packIDs.has(r.id), `${m.id}: "${r.id}" clashes with a library or pack recipe`);
      assert.ok(!extraIDs.has(r.id), `${m.id}: "${r.id}" is included by another menu too`);
      extraIDs.add(r.id);
      assert.ok(CUISINES.has(r.cuisine), `${m.id}: "${r.title}" has unknown cuisine ${r.cuisine}`);
      for (const tag of r.tags) assert.ok(TAGS.has(tag), `${m.id}: "${r.title}" has unknown tag ${tag}`);
    }
    for (const ref of m.recipes) {
      // Another menu's included recipe can be shared (the same rice on two tables).
      assert.ok(libraryIDs.has(ref) || packIDs.has(ref) || allIncluded.has(ref), `${m.id}: unknown recipe ${ref}`);
    }
    for (const window of m.window ? [m.window] : m.windows ?? []) {
      const { from, to } = window;
      const full = [from, to].map((d) => FULL_DAY.exec(d));
      const yearly = [from, to].map((d) => YEARLY_DAY.exec(d));
      if (full[0] && full[1]) {
        for (const f of full) assert.ok(realDay(+f![1], +f![2], +f![3]), `${m.id}: ${f![0]} is not a date`);
        assert.ok(from <= to, `${m.id}: window ends before it starts`);
      } else {
        assert.ok(yearly[0] && yearly[1], `${m.id}: window must be two YYYY-MM-DD or two MM-DD dates`);
        for (const y of yearly) assert.ok(realDay(2028, +y![1], +y![2]), `${m.id}: ${y![0]} is not a date`);
      }
    }
  }
  assert.ok(menuContent.rotation.length > 0, "rotation");
  // "Add all to plan" spreads a weekly or mood menu's mains (recipes tagged for its meal, or with no
  // course tag) over the week and puts sides and desserts with the first, so it needs enough mains.
  const tagsByID = new Map<string, string[]>();
  for (const r of [...libraryRecipes, ...packs.flatMap((p) => p.recipes)] as { id: string; tags: string[] }[]) tagsByID.set(r.id, r.tags);
  for (const m of menuContent.menus) for (const r of m.recipeDetails ?? []) tagsByID.set(r.id, r.tags);
  for (const m of menuContent.menus.filter((m) => m.kind !== "occasion")) {
    const meal = m.slot ?? "dinner";
    const mains = m.recipes.filter((id) => {
      const tags = tagsByID.get(id) ?? [];
      return tags.includes(meal) || !tags.some((t) => ["side", "dessert", "snack"].includes(t));
    });
    assert.ok(mains.length >= 3, `${m.id}: needs at least 3 ${meal} mains (has ${mains.length})`);
  }
  for (const id of menuContent.rotation) {
    const menu = menuContent.menus.find((m) => m.id === id);
    assert.ok(menu, `rotation: unknown menu ${id}`);
    assert.ok(!menu!.draft, `rotation: ${id} is a draft`);
    assert.equal(menu!.kind, "weekly", `rotation: ${id} isn't a weekly menu`);
  }
});

test("older builds get the current or next window of a moving holiday", async () => {
  const { servedMenus } = await import("../src/menus.ts");
  const served = (day: string) => servedMenus(menuContent as never, day).menus as unknown as Menu[];
  for (const m of menuContent.menus.filter((m) => m.windows?.length && !m.draft)) {
    const first = m.windows![0];
    const before = served(first.from).find((x) => x.id === m.id)!;
    assert.deepEqual(before.window, first, `${m.id}: first window`);
    if (m.windows!.length > 1) {
      const dayAfter = new Date(new Date(`${first.to}T12:00:00Z`).getTime() + 86400_000).toISOString().slice(0, 10);
      assert.deepEqual(served(dayAfter).find((x) => x.id === m.id)!.window, m.windows![1], `${m.id}: next window`);
    }
  }
  assert.ok(!served("2026-10-02").some((m) => m.draft), "no drafts served");
  assert.ok(!served("2026-10-02").some((m) => "reviewNotes" in m), "review notes stay on the server");
});

// Spanish (ios/RefrigeratorRecipes/Resources/Recipes.es.json): every library, pack and menu recipe has a
// translation the app can line up with it, the same number of ingredients and steps in the same order.
test("every recipe has a complete Spanish translation", () => {
  type Shown = { title: string; summary: string; ingredients: { name: string; note: string }[]; instructions: string[] };
  const spanish: Record<string, Shown> = read("../../ios/RefrigeratorRecipes/Resources/Recipes.es.json");
  type Full = { id: string; title: string; ingredients: unknown[]; instructions: string[] };
  const all = [
    ...(libraryRecipes as unknown as Full[]),
    ...(packs.flatMap((p) => p.recipes) as unknown as Full[]),
    ...(menuContent.menus.flatMap((m) => m.recipeDetails ?? []) as unknown as Full[]),
  ];
  for (const r of all) {
    const es = spanish[r.id];
    assert.ok(es, `"${r.title}" (${r.id}) has no Spanish translation`);
    assert.ok(es.title && es.summary, `${r.id}: Spanish title and summary`);
    assert.equal(es.ingredients.length, r.ingredients.length, `${r.id}: Spanish ingredients line up`);
    assert.equal(es.instructions.length, r.instructions.length, `${r.id}: Spanish steps line up`);
  }
});
