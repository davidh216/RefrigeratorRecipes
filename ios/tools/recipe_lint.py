#!/usr/bin/env python3
"""Checks starter recipes before they ship, and reports library coverage.

Usage:
    python3 ios/tools/recipe_lint.py [file.json ...]      # default: the bundled SampleRecipes.json
    python3 ios/tools/recipe_lint.py --coverage           # also print the coverage report

Checks each recipe for schema, sane quantities and units, times, tags that match the
ingredients (a "vegetarian" recipe with chicken fails), and a rough per-serving calorie
estimate using the same nutrition table as the app (FridgeCore/NutritionTable.swift).
Exits non-zero on any error.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "RefrigeratorRecipes/Resources/SampleRecipes.json"
TABLE_SWIFT = ROOT / "Packages/FridgeCore/Sources/FridgeCore/NutritionTable.swift"

UNITS = {
    "": 1, "tsp": 4.929, "tbsp": 14.787, "cup": 236.6, "fl oz": 29.57, "ml": 1, "l": 1000,
    "pint": 473.2, "quart": 946.4, "g": 1, "kg": 1000, "oz": 28.35, "lb": 453.6,
}
VOLUME = {"tsp", "tbsp", "cup", "fl oz", "ml", "l", "pint", "quart"}
WEIGHT = {"g", "kg", "oz", "lb"}
ALIASES = {"teaspoon": "tsp", "tablespoon": "tbsp", "cups": "cup", "lbs": "lb", "pound": "lb",
           "ounce": "oz", "gram": "g", "piece": "", "pieces": "", "whole": ""}
COUNT_UNITS = {"clove", "can", "slice", "bunch", "head", "stalk", "inch", "sprig", "pinch", "handful",
               "leaf", "fillet", "stick", "jar", "packet", "block", "ear", "bag", "carton", "ball", "bun",
               "loaf", "dash", "rib", "crown"}
MEAL_TAGS = {"breakfast", "lunch", "dinner", "snack", "dessert", "side"}
DIET_TAGS = {"vegetarian", "vegan", "gluten-free", "dairy-free", "pescatarian"}

DESCRIPTORS = set("""fresh freshly large small medium chopped diced minced sliced grated shredded ground whole ripe
raw cooked boneless skinless organic frozen dried canned extra virgin finely roughly thinly softened melted room
temperature optional to taste of a an the and""".split())
MEAT = ["chicken", "beef", "pork", "bacon", "ham", "sausage", "turkey", "lamb", "veal", "prosciutto", "salami",
        "pepperoni", "chorizo", "pancetta", "duck", "steak", "gelatin", "lard", "brisket"]
SEAFOOD = ["fish", "salmon", "tuna", "cod", "tilapia", "shrimp", "prawn", "crab", "lobster", "scallop", "clam",
           "mussel", "oyster", "anchovy", "anchovies", "sardine", "halibut", "trout", "fish sauce", "worcestershire",
           "squid", "calamari", "mackerel"]
DAIRY = ["milk", "butter", "cream", "cheese", "yogurt", "ghee", "parmesan", "mozzarella", "cheddar", "feta",
         "ricotta", "mascarpone", "halloumi", "paneer", "buttermilk", "sour cream", "gruyere", "pecorino"]
NON_DAIRY = ["coconut milk", "almond milk", "oat milk", "soy milk", "peanut butter", "almond butter",
             "coconut cream", "vegan", "dairy-free", "cream of tartar", "cocoa butter", "butter lettuce",
             "butter bean"]
GLUTEN = ["flour", "bread", "pasta", "spaghetti", "penne", "linguine", "noodle", "tortilla", "couscous", "bulgur",
          "breadcrumb", "panko", "soy sauce", "pita", "bun", "croissant", "orzo", "udon", "ramen", "gnocchi",
          "barley", "beer", "baguette", "naan", "lasagna", "macaroni", "fettuccine", "rigatoni", "pastry", "dough",
          "cracker", "wonton", "semolina", "farro"]
GLUTEN_OK = ["rice flour", "almond flour", "coconut flour", "corn tortilla", "rice noodle", "gluten-free",
             "chickpea flour", "cornflour", "tamari", "glass noodle"]


def tokens(name):
    head = re.split(r"[,(]", name.lower())[0]
    out = []
    for w in re.split(r"[^a-z]+", head):
        if not w or w in DESCRIPTORS:
            continue
        if len(w) > 3 and w.endswith("ies"):
            w = w[:-3] + "y"
        elif len(w) > 3 and w.endswith("oes"):
            w = w[:-2]
        elif len(w) > 3 and w.endswith("s") and not w.endswith("ss") and not w.endswith("us") and w not in {
                "hummus", "couscous", "asparagus", "swiss", "molasses", "lettuce", "cheese", "rice"}:
            w = w[:-1]
        out.append(w)
    return out


def canonical_unit(unit):
    u = unit.lower().strip().rstrip(".")
    if u in ALIASES:
        return ALIASES[u]
    if u in UNITS:
        return u
    if u.endswith("s") and u[:-1] in UNITS:
        return u[:-1]
    if u.endswith("es") and u[:-2] in COUNT_UNITS:
        return u[:-2]
    if u.endswith("s") and u[:-1] in COUNT_UNITS:
        return u[:-1]
    return u


def load_table():
    text = TABLE_SWIFT.read_text()
    data = text.split('static let standardData = """')[1].split('"""')[0]
    foods = []
    for line in data.strip().splitlines():
        cols = [c.strip() for c in line.split("|")]
        if len(cols) != 8:
            continue
        units = {}
        for pair in cols[7].split(","):
            if "=" in pair:
                k, v = pair.split("=")
                units[canonical_unit(k)] = float(v)
        foods.append({
            "names": [n.strip() for n in cols[0].split("/")],
            "keys": [set(tokens(n)) for n in cols[0].split("/")],
            "kcal": float(cols[1]), "protein": float(cols[2]),
            "cup": float(cols[6]) if cols[6] else None, "units": units,
        })
    return foods


def lookup(foods, name):
    t = set(tokens(name))
    if not t:
        return None
    best, score = None, 0
    for f in foods:
        for k in f["keys"]:
            if not k:
                continue
            if k == t:
                s = 1000
            elif k <= t:
                s = len(k)
            else:
                continue
            if s > score:
                best, score = f, s
    return best


def grams(q, unit, food):
    if q <= 0:
        return 0.0
    u = canonical_unit(unit)
    if u in food["units"]:
        return q * food["units"][u]
    if u in WEIGHT:
        return q * UNITS[u]
    if u in VOLUME:
        ml = q * UNITS[u]
        return ml * (food["cup"] or 236.6) / 236.6
    return None


def contains(name, words, exceptions=()):
    low = name.lower()
    if any(e in low for e in exceptions):
        return False
    t = set(tokens(name))
    for w in words:
        wt = set(tokens(w))
        if wt and wt <= t:
            return True
    return False


def lint(recipes, foods):
    errors, warnings = [], []
    titles = Counter(r.get("title", "").strip().lower() for r in recipes)
    for i, r in enumerate(recipes):
        where = f"#{i} {r.get('title', '?')!r}"
        def err(msg): errors.append(f"{where}: {msg}")
        def warn(msg): warnings.append(f"{where}: {msg}")

        for key, typ in [("title", str), ("summary", str), ("cuisine", str), ("prepMinutes", int),
                         ("cookMinutes", int), ("servings", int), ("tags", list), ("ingredients", list),
                         ("instructions", list)]:
            if not isinstance(r.get(key), typ):
                err(f"missing or wrong type: {key}")
        if errors and errors[-1].startswith(where):
            continue
        if titles[r["title"].strip().lower()] > 1:
            err("duplicate title")
        if not (1 <= r["servings"] <= 36):
            err(f"servings {r['servings']}")
        if r["prepMinutes"] < 0 or r["cookMinutes"] < 0 or r["prepMinutes"] + r["cookMinutes"] > 600:
            err("bad times")
        if r["prepMinutes"] + r["cookMinutes"] == 0:
            warn("no time given")
        if not (20 <= len(r["summary"]) <= 220):
            warn("summary length")
        if not (3 <= len(r["instructions"]) <= 12):
            err(f"{len(r['instructions'])} steps")
        if any(len(s) < 15 for s in r["instructions"]):
            warn("very short step")
        tags = {t.lower() for t in r["tags"]}
        if not tags & MEAL_TAGS:
            err("no meal tag (breakfast/lunch/dinner/snack/dessert/side)")
        if r["cuisine"] != r["cuisine"].lower() or not r["cuisine"]:
            err("cuisine should be lowercase and non-empty")
        if not (3 <= len(r["ingredients"]) <= 20):
            err(f"{len(r['ingredients'])} ingredients")

        names = []
        kcal = protein = 0.0
        known = 0
        required = 0
        for ing in r["ingredients"]:
            for key, typ in [("name", str), ("quantity", (int, float)), ("unit", str), ("isOptional", bool), ("note", str)]:
                if not isinstance(ing.get(key), typ):
                    err(f"ingredient {ing.get('name')!r}: bad {key}")
            name = ing.get("name", "")
            names.append(name)
            if ing.get("quantity", 0) < 0 or ing.get("quantity", 0) > 5000:
                err(f"{name}: quantity {ing.get('quantity')}")
            u = canonical_unit(ing.get("unit", ""))
            if u not in UNITS and u not in COUNT_UNITS:
                err(f"{name}: unknown unit {ing.get('unit')!r}")
            if re.search(r"\d", name):
                err(f"{name}: put amounts in quantity, not the name")
            if ing.get("isOptional"):
                continue
            required += 1
            food = lookup(foods, name)
            g = grams(float(ing.get("quantity", 0)), ing.get("unit", ""), food) if food else None
            if food is not None and g is not None:
                known += 1
                kcal += food["kcal"] * g / 100
                protein += food["protein"] * g / 100
        coverage = known / required if required else 0
        per = kcal / max(r["servings"], 1)
        floor = 40 if tags & {"side", "snack", "dessert"} else 120
        if coverage >= 0.8 and not (floor <= per <= 1400):
            warn(f"≈{per:.0f} kcal per serving looks off")
        r["_kcal"], r["_protein"], r["_coverage"] = per, protein / max(r["servings"], 1), coverage

        veg = "vegetarian" in tags or "vegan" in tags
        if veg and any(contains(n, MEAT + SEAFOOD, ["vegan", "plant-based", "vegetable broth"]) for n in names):
            err("tagged vegetarian/vegan but has meat or seafood")
        if "vegan" in tags and any(contains(n, DAIRY + ["egg", "honey"], NON_DAIRY) for n in names):
            err("tagged vegan but has dairy, eggs or honey")
        if "dairy-free" in tags and any(contains(n, DAIRY, NON_DAIRY) for n in names):
            err("tagged dairy-free but has dairy")
        if "gluten-free" in tags and any(contains(n, GLUTEN, GLUTEN_OK) for n in names):
            err("tagged gluten-free but has gluten")
        if not veg and not any(contains(n, MEAT + SEAFOOD) for n in names) and "dinner" in tags:
            warn("no meat or seafood: add a vegetarian tag?")
    return errors, warnings


def coverage_report(recipes):
    ing = Counter()
    for r in recipes:
        for i in r["ingredients"]:
            ing[" ".join(tokens(i["name"]))] += 1
    tags = Counter(t.lower() for r in recipes for t in r["tags"])
    quick = sum(1 for r in recipes if r["prepMinutes"] + r["cookMinutes"] <= 30)
    cuisines = Counter(r["cuisine"] for r in recipes)
    print(f"\n{len(recipes)} recipes · {quick} ready in 30 min or less")
    print("meals:", {t: tags[t] for t in sorted(MEAL_TAGS)})
    print("diets:", {t: tags[t] for t in sorted(DIET_TAGS)})
    print("cuisines:", dict(cuisines.most_common()))
    staples = ["chicken", "chicken breast", "chicken thigh", "beef", "pork", "salmon", "shrimp", "tofu", "egg",
               "spinach", "broccoli", "bell pepper", "zucchini", "mushroom", "carrot", "potato", "sweet potato",
               "tomato", "onion", "rice", "pasta", "black bean", "chickpea", "lentil", "cheddar", "yogurt",
               "avocado", "cabbage", "kale", "cauliflower", "ground beef", "sausage", "bacon", "tortilla"]
    thin = []
    for s in staples:
        key = set(tokens(s))
        n = sum(1 for r in recipes if any(key <= set(tokens(i["name"])) for i in r["ingredients"]))
        if n < 3:
            thin.append(f"{s} ({n})")
    print("common ingredients in fewer than 3 recipes:", ", ".join(thin) or "none")
    kc = sorted(r["_kcal"] for r in recipes if r["_coverage"] >= 0.8)
    if kc:
        print(f"kcal/serving (reliable estimates, n={len(kc)}): min {kc[0]:.0f}, median {kc[len(kc)//2]:.0f}, max {kc[-1]:.0f}")
    low = [r["title"] for r in recipes if r["_coverage"] < 0.8]
    print(f"partial nutrition estimates: {len(low)}")


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    files = [Path(a) for a in args] or [DEFAULT]
    recipes = []
    for f in files:
        recipes += json.loads(Path(f).read_text())
    foods = load_table()
    errors, warnings = lint(recipes, foods)
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    if "--coverage" in sys.argv:
        coverage_report(recipes)
    print(f"\n{len(recipes)} recipes, {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
