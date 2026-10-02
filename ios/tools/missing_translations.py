#!/usr/bin/env python3
"""Lists the app's strings that have no translation yet, from `xcodebuild -exportLocalizations`.

Usage: python3 ios/tools/missing_translations.py <path to es.xcloc>

Prints a summary, then every untranslated string as one JSON object per line between
BEGIN/END markers, so the list can be copied out of the CI log and translated.
"""
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

NS = {"x": "urn:oasis:names:tc:xliff:document:1.2"}


def main():
    xcloc = Path(sys.argv[1])
    xliffs = list(xcloc.glob("Localized Contents/*.xliff"))
    if not xliffs:
        print(f"no xliff in {xcloc}")
        return
    missing, total = [], 0
    for xliff in xliffs:
        root = ET.parse(xliff).getroot()
        for file in root.findall("x:file", NS):
            original = file.get("original", "")
            for unit in file.iter(f"{{{NS['x']}}}trans-unit"):
                total += 1
                target = unit.find("x:target", NS)
                if target is not None and (target.text or "").strip():
                    continue
                source = unit.find("x:source", NS)
                note = unit.find("x:note", NS)
                missing.append({
                    "file": original,
                    "key": unit.get("id", ""),
                    "source": source.text if source is not None else "",
                    "note": note.text if note is not None else "",
                })
    print(f"{len(missing)} of {total} strings have no translation")
    print("BEGIN MISSING TRANSLATIONS")
    for item in missing:
        print(json.dumps(item, ensure_ascii=False))
    print("END MISSING TRANSLATIONS")


if __name__ == "__main__":
    main()
