#!/usr/bin/env python3
"""Builds the single-file Safari preview: injects the iOS app's sample recipes
into the template. Usage: python3 preview/build.py [output_path]"""
import json, pathlib, sys

root = pathlib.Path(__file__).resolve().parent
template = (root / "fridge-preview.template.html").read_text()
recipes = json.loads((root.parent / "ios/RefrigeratorRecipes/Resources/SampleRecipes.json").read_text())
payload = json.dumps(recipes, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
assert "__RECIPES__" in template
out = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else root / "dist/fridge-preview.html"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(template.replace("__RECIPES__", payload))
print(f"wrote {out} ({out.stat().st_size // 1024} KB)")
