#!/usr/bin/env python3
"""Adds translations to the app's String Catalog (RefrigeratorRecipes/Resources/Localizable.xcstrings).

Usage:
    python3 ios/tools/strings_catalog.py add es translations.json
        translations.json is {"English key": "translation", ...}. Existing translations are replaced.
    python3 ios/tools/strings_catalog.py vocabulary
        Prints the English vocabulary text the app looks up at runtime (tag, cuisine and region names,
        cuisine intros, from FridgeCore), one JSON string per line, so it can be translated too.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "RefrigeratorRecipes/Resources/Localizable.xcstrings"
CORE = ROOT / "Packages/FridgeCore/Sources/FridgeCore"


def load():
    return json.loads(CATALOG.read_text())


def save(catalog):
    catalog["strings"] = dict(sorted(catalog["strings"].items()))
    CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2, separators=(",", " : ")) + "\n")


def add(language, path):
    catalog = load()
    translations = json.loads(Path(path).read_text())
    for key, value in translations.items():
        entry = catalog["strings"].setdefault(key, {})
        entry.setdefault("localizations", {})[language] = {
            "stringUnit": {"state": "translated", "value": value}
        }
    save(catalog)
    print(f"{len(translations)} {language} strings in {CATALOG.name}")


def vocabulary():
    texts = []
    tags = (CORE / "RecipeTag.swift").read_text()
    texts += re.findall(r'RecipeTag\("[^"]+", \.\w+, "([^"]+)"', tags)
    cuisine = (CORE / "Cuisine.swift").read_text()
    texts += re.findall(r'Cuisine\("[^"]+", "([^"]+)"', cuisine)
    texts += re.findall(r'case \.\w+: "([^"]+)"', cuisine)          # region titles
    texts += re.findall(r'^\s*"[a-z-]+": "([^"]+)",?$', cuisine, re.M)  # intros
    for text in dict.fromkeys(texts):
        print(json.dumps(text, ensure_ascii=False))


if __name__ == "__main__":
    if sys.argv[1:2] == ["add"]:
        add(sys.argv[2], sys.argv[3])
    elif sys.argv[1:2] == ["vocabulary"]:
        vocabulary()
    else:
        print(__doc__)
