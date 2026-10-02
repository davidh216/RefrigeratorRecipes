#!/usr/bin/env python3
"""Checks starter recipes before they ship, and reports library coverage.

Usage:
    python3 ios/tools/recipe_lint.py [file.json ...]      # default: the bundled SampleRecipes.json
    python3 ios/tools/recipe_lint.py --coverage           # also print the coverage report

Checks each recipe for schema, a unique slug `id`, sane quantities and units, times, tags that
match the ingredients (a "vegetarian" recipe with chicken fails), and a rough per-serving calorie
estimate using the same nutrition table as the app (FridgeCore/NutritionTable.swift).

Tags and cuisines must come from the fixed lists in FridgeCore (RecipeTag.swift, Cuisine.swift,
read straight from the Swift source), and mood tags must pass the hard rules in MoodRules.swift
(mirrored below). --coverage also prints counts by mood and cuisine.
Exits non-zero on any error.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT = ROOT / "RefrigeratorRecipes/Resources/SampleRecipes.json"
CORE = ROOT / "Packages/FridgeCore/Sources/FridgeCore"
TABLE_SWIFT = CORE / "NutritionTable.swift"

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


def load_vocabulary():
    """Tag ids, kinds and aliases from RecipeTag.swift; cuisine ids and aliases from Cuisine.swift."""
    def key(raw):
        return re.sub(r"[^a-z0-9]+", "-", raw.lower().replace("&", " and ")).strip("-")
    tag_src = (CORE / "RecipeTag.swift").read_text()
    tags, tag_alias = {}, {}
    for m in re.finditer(r'RecipeTag\("([^"]+)",\s*\.(\w+),\s*"([^"]+)",\s*symbol:\s*"[^"]+"(?:,\s*aliases:\s*\[([^\]]*)\])?\)', tag_src):
        tags[m.group(1)] = m.group(2)
        for alias in [m.group(3)] + re.findall(r'"([^"]+)"', m.group(4) or ""):
            tag_alias[key(alias)] = m.group(1)
    cuisine_src = (CORE / "Cuisine.swift").read_text()
    cuisines, cuisine_alias = {}, {}
    for m in re.finditer(r'Cuisine\((?:"([^"]+)"|otherID),\s*"([^"]+)",\s*\.(\w+)(?:,\s*aliases:\s*\[([^\]]*)\])?\)', cuisine_src):
        cid = m.group(1) or "other"
        cuisines[cid] = m.group(2)
        for alias in [m.group(2)] + re.findall(r'"([^"]+)"', m.group(4) or ""):
            cuisine_alias[key(alias)] = cid
    if len(tags) < 30 or len(cuisines) < 30:
        sys.exit("couldn't read the tag or cuisine list from FridgeCore")
    return tags, tag_alias, cuisines, cuisine_alias


# Mirrors FridgeCore/MoodRules.swift. Keep the two in step.
GENTLE_MAX_FAT, GENTLE_MAX_FIBER, LIGHT_MAX_KCAL = 15, 6, 500
UNDER_WEATHER_MAX_PREP, UNDER_WEATHER_MAX_INGREDIENTS = 15, 8
COZY_MIN_MINUTES, HOT_DAY_MAX_COOK = 45, 15
CHILI = ["chili", "chile", "chilli", "chilies", "chiles", "jalapeno", "jalapeño", "serrano", "habanero",
         "scotch bonnet", "thai chili", "bird eye", "cayenne", "chipotle", "red pepper flake",
         "crushed red pepper", "chili flake", "chili powder", "gochujang", "gochugaru", "sriracha",
         "hot sauce", "curry paste", "sichuan pepper", "sichuan peppercorn", "szechuan peppercorn",
         "harissa", "sambal", "chili oil", "chili crisp", "doubanjiang", "aleppo pepper", "piri piri",
         "peri peri", "buffalo sauce", "tabasco", "berbere", "nduja", "ancho", "guajillo",
         "pepper jack", "kimchi"]
MILD_CHILI = ["sweet chili"]
ALCOHOL = ["wine", "beer", "ale", "lager", "stout", "sake", "mirin", "shaoxing", "vodka", "rum", "bourbon",
           "whiskey", "whisky", "brandy", "cognac", "sherry", "marsala", "tequila", "mezcal", "liqueur",
           "vermouth", "port", "prosecco", "champagne", "cider", "gin"]
ALCOHOL_FREE = ["vinegar", "ginger ale", "ginger beer", "root beer", "apple cider", "non alcoholic", "alcohol free",
                "cider vinegar", "port wine cheese", "sherry vinegar", "wine vinegar"]
DEEP_FRIED = ["deep-fr", "deep fr", "for frying", "oil for deep"]
STAPLES = ["salt", "black pepper", "pepper", "water", "olive oil", "vegetable oil", "oil"]


def has_words(name, words):
    t = set(tokens(name))
    return bool(t) and any(set(tokens(w)) and set(tokens(w)) <= t for w in words)


def is_chili(name):
    if has_words(name, MILD_CHILI):
        return False
    # Canned "chili beans" are mild; "chili bean paste" or "sauce" (doubanjiang) is not.
    if has_words(name, ["chili bean"]) and not set(tokens(name)) & {"paste", "sauce"}:
        return False
    return has_words(name, CHILI)


def is_alcohol(name):
    return not has_words(name, ALCOHOL_FREE) and has_words(name, ALCOHOL)


def served_warm(r, tags):
    title = r["title"].lower()
    return r["cookMinutes"] > 0 and "no-cook" not in tags and "salad" not in title


def mood_violations(mood, r, tags):
    """Why a recipe can't carry a mood (empty = fine). r must already have _fat/_fiber/_kcal/_coverage."""
    names = [i["name"] for i in r["ingredients"] if not i["isOptional"]]
    reliable = r["_coverage"] >= 0.8
    out = []
    if mood == "comfort-food" and not served_warm(r, tags):
        out.append("comfort food is served warm (not a salad or no-cook)")
    elif mood == "feeling-spicy" and not any(is_chili(n) for n in names):
        out.append("feeling spicy needs a chili ingredient")
    elif mood == "under-the-weather":
        if not served_warm(r, tags):
            out.append("under the weather is served warm")
        if r["prepMinutes"] > UNDER_WEATHER_MAX_PREP:
            out.append(f"under the weather needs <= {UNDER_WEATHER_MAX_PREP} min hands-on (has {r['prepMinutes']})")
        staples = {" ".join(tokens(s)) for s in STAPLES}
        n = sum(1 for x in names if " ".join(tokens(x)) not in staples)
        if n > UNDER_WEATHER_MAX_INGREDIENTS:
            out.append(f"under the weather needs <= {UNDER_WEATHER_MAX_INGREDIENTS} ingredients besides staples (has {n})")
    elif mood == "easy-to-stomach":
        chili = [n for n in names if is_chili(n)]
        if chili:
            out.append(f"easy to stomach can't have chili ({chili[0]})")
        # Optional ingredients count here, as in MoodRules.isDeepFried.
        text = " ".join(r["instructions"] + [i["name"] for i in r["ingredients"]]).lower()
        if any(w in text for w in DEEP_FRIED):
            out.append("easy to stomach can't be deep-fried")
        booze = [n for n in names if is_alcohol(n)]
        if booze:
            out.append(f"easy to stomach can't have alcohol ({booze[0]})")
        if not reliable:
            out.append("easy to stomach needs a reliable nutrition estimate")
        else:
            if r["_fat"] > GENTLE_MAX_FAT:
                out.append(f"easy to stomach needs <= {GENTLE_MAX_FAT} g fat per serving (~{r['_fat']:.0f} g)")
            if r["_fiber"] > GENTLE_MAX_FIBER:
                out.append(f"easy to stomach needs <= {GENTLE_MAX_FIBER} g fibre per serving (~{r['_fiber']:.0f} g)")
    elif mood == "cozy-night-in" and r["prepMinutes"] + r["cookMinutes"] < COZY_MIN_MINUTES:
        out.append(f"cozy night in needs >= {COZY_MIN_MINUTES} min in total")
    elif mood == "light-and-fresh":
        if not reliable:
            out.append("light & fresh needs a reliable nutrition estimate")
        elif r["_kcal"] > LIGHT_MAX_KCAL:
            out.append(f"light & fresh needs <= {LIGHT_MAX_KCAL} kcal per serving (~{r['_kcal']:.0f})")
    elif mood == "hot-day" and not tags & {"no-cook", "grill"} and r["cookMinutes"] > HOT_DAY_MAX_COOK:
        out.append(f"hot day needs no-cook, grill, or <= {HOT_DAY_MAX_COOK} min of cooking")
    return out


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
            "fat": float(cols[4] or 0), "fiber": float(cols[5] or 0),
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


def lint(recipes, foods, vocab):
    tag_kinds, tag_alias, cuisines, cuisine_alias = vocab
    errors, warnings = [], []
    titles = Counter(r.get("title", "").strip().lower() for r in recipes)
    ids = Counter(r.get("id") for r in recipes)
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
        rid = r.get("id")
        if not isinstance(rid, str) or not rid:
            err("missing id")
        elif not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", rid):
            err(f"id {rid!r} should be a lowercase slug")
        elif ids[rid] > 1:
            err(f"duplicate id {rid!r}")
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
        tags = set(r["tags"])
        for t in r["tags"]:
            if t not in tag_kinds:
                k = re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")
                hint = f" (use {tag_alias[k]!r})" if k in tag_alias else (
                    f" (a cuisine: set cuisine to {cuisine_alias[k]!r})" if k in cuisine_alias else "")
                err(f"unknown tag {t!r}{hint}")
        if len(r["tags"]) != len(tags):
            err("duplicate tag")
        if not tags & MEAL_TAGS:
            err("no meal tag (breakfast/lunch/dinner/snack/dessert/side)")
        if r["cuisine"] not in cuisines:
            k = re.sub(r"[^a-z0-9]+", "-", r["cuisine"].lower()).strip("-")
            hint = f" (use {cuisine_alias[k]!r})" if k in cuisine_alias else ""
            err(f"unknown cuisine {r['cuisine']!r}{hint}")
        if not (3 <= len(r["ingredients"]) <= 20):
            err(f"{len(r['ingredients'])} ingredients")

        names = []
        kcal = protein = fat = fiber = 0.0
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
                fat += food["fat"] * g / 100
                fiber += food["fiber"] * g / 100
        coverage = known / required if required else 0
        per = kcal / max(r["servings"], 1)
        floor = 40 if tags & {"side", "snack", "dessert"} else 120
        if coverage >= 0.8 and not (floor <= per <= 1400):
            warn(f"≈{per:.0f} kcal per serving looks off")
        servings = max(r["servings"], 1)
        r["_kcal"], r["_protein"], r["_coverage"] = per, protein / servings, coverage
        r["_fat"], r["_fiber"] = fat / servings, fiber / servings

        for mood in sorted(t for t in tags if tag_kinds.get(t) == "mood"):
            for reason in mood_violations(mood, r, tags):
                err(reason)

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


def coverage_report(recipes, vocab):
    tag_kinds, _, cuisines, _ = vocab
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
    moods = [t for t, k in tag_kinds.items() if k == "mood"]
    print("moods:", {m: tags[m] for m in moods})
    print("other tags:", {t: tags[t] for t, k in tag_kinds.items() if k not in ("mood", "meal", "diet")})
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
    vocab = load_vocabulary()
    errors, warnings = lint(recipes, foods, vocab)
    for w in warnings:
        print("warning:", w)
    for e in errors:
        print("ERROR:", e)
    if "--coverage" in sys.argv:
        coverage_report(recipes, vocab)
    print(f"\n{len(recipes)} recipes, {len(errors)} errors, {len(warnings)} warnings")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
