#!/usr/bin/env python3
"""Generate a dependency inventory (SBOM-lite) with licences.

Usage (from repository root):  python3 scripts/sbom.py
Writes docs/sbom/rust-crates.csv, docs/sbom/npm-packages.csv and prints a licence summary.
Only *shipped* dependencies are listed: Rust normal deps of the desktop binary, npm production deps.
"""
import csv
import collections
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "docs", "sbom")
os.makedirs(OUT, exist_ok=True)


def rust():
    meta = json.loads(subprocess.check_output(
        ["cargo", "metadata", "--format-version", "1", "--locked"], cwd=ROOT))
    pkgs = {p["id"]: p for p in meta["packages"]}
    nodes = {n["id"]: n for n in meta["resolve"]["nodes"]}
    root = next(p["id"] for p in meta["packages"] if p["name"] == "flashrecovery-desktop")
    seen, stack = set(), [root]
    while stack:
        cur = stack.pop()
        if cur in seen:
            continue
        seen.add(cur)
        for d in nodes[cur]["deps"]:
            # keep normal (non-dev) dependencies; build deps are not shipped
            if any(k.get("kind") is None for k in d["dep_kinds"]):
                stack.append(d["pkg"])
    rows = sorted(
        (pkgs[i]["name"], pkgs[i]["version"], pkgs[i].get("license") or "UNKNOWN")
        for i in seen if pkgs[i]["source"])  # skip our own workspace crates
    return rows


def npm():
    app = os.path.join(ROOT, "apps", "desktop")
    tree = json.loads(subprocess.run(
        ["npm", "ls", "--omit=dev", "--all", "--json"], cwd=app, capture_output=True, text=True).stdout)
    found = {}

    def walk(deps):
        for name, info in (deps or {}).items():
            ver = info.get("version")
            if ver and (name, ver) not in found:
                lic = "UNKNOWN"
                pj = os.path.join(app, "node_modules", name, "package.json")
                if os.path.exists(pj):
                    with open(pj, encoding="utf-8") as f:
                        lic = json.load(f).get("license") or "UNKNOWN"
                found[(name, ver)] = lic if isinstance(lic, str) else json.dumps(lic)
            walk(info.get("dependencies"))

    walk(tree.get("dependencies"))
    return sorted((n, v, l) for (n, v), l in found.items())


def write(name, rows):
    with open(os.path.join(OUT, name), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["name", "version", "license"])
        w.writerows(rows)
    c = collections.Counter(r[2] for r in rows)
    print(f"{name}: {len(rows)} packages")
    for lic, n in c.most_common():
        print(f"  {n:4d}  {lic}")


if __name__ == "__main__":
    write("rust-crates.csv", rust())
    write("npm-packages.csv", npm())
    sys.exit(0)
