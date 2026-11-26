#!/usr/bin/env python3
"""Brings recipe photos to rodmjay.com on its own (Rod 11/26: "none of the new pictures show up"; EA: no key, the git path).

Runs from a timer on Rod's computer (systemd user unit recipe-photos-sync.timer, installed by IT Guy), never by hand:

    python3 scripts/recipe-photos-sync.py [--dry-run]

1. Reads the published recipe slugs from the public-recipes feed (the same feed the site builds from).
2. For each slug with a source photo, PHOTOS_SRC/<slug>.jpg (Health Agent's 2048x1376 dish photo), compares the photo's
   sha256 with public/recipes/images/sources.json. A new photo, a changed one, or a missing site copy is (re)made with
   scripts/recipe-images.py, which re-encodes it (no EXIF, no GPS), after the slug's old copies are removed.
3. Commits only public/recipes/images/ on a fresh photos/* branch from origin/main and opens a pull request into main. It
   never merges: .github/workflows/photos-merge.yml checks every path, size and type, waits for the `build` check, merges
   and deploys (Security 11/26).

It works in its own git worktree (WORKTREE), never in anyone's checkout, runs only as committed on origin/main (it stops if
its scripts differ from origin/main), and refuses to commit anything outside public/recipes/images/. Photos only: the source folder holds dish photos (Health Agent's rule: no people, no card scans).
"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

FEED = os.environ.get("RECIPES_API", "https://ibrovaaqbddkhqsmadqk.supabase.co/functions/v1/public-recipes")
SRC = Path(os.environ.get("PHOTOS_SRC", str(Path.home() / "dev/personal/nutrition/recipe-book/images")))
REPO = Path(os.environ.get("SITE_REPO", str(Path.home() / "dev/rodmjay.github.io")))
WT = Path(os.environ.get("WORKTREE", str(Path.home() / ".local/share/recipe-photos-sync/site")))
GH_REPO = "rodmjay/rodmjay.github.io"
DRY = "--dry-run" in sys.argv


def run(*cmd, cwd=WT, check=True, capture=False):
    r = subprocess.run(cmd, cwd=cwd, check=check, text=True, capture_output=capture)
    return r.stdout.strip() if capture else r


def sha(p: Path) -> str:
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def slugs() -> list[str]:
    with urllib.request.urlopen(f"{FEED}?lang=en", timeout=30) as r:
        rows = json.load(r)
    return sorted({str(x.get("slug")) for x in rows if isinstance(x, dict) and str(x.get("slug", "")).replace("-", "").isalnum()})


def main() -> None:
    if not WT.exists():
        WT.parent.mkdir(parents=True, exist_ok=True)
        run("git", "worktree", "add", "--detach", str(WT), "origin/main", cwd=REPO)
    run("git", "fetch", "-q", "origin")
    branch = "photos/" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    run("git", "checkout", "-q", "-B", branch, "origin/main")
    # Fail closed: only the reviewed code on origin/main runs with this machine's GitHub login (Security 11/26).
    if run("git", "diff", "origin/main", "--", "scripts/", capture=True) or Path(__file__).resolve() != (WT / "scripts/recipe-photos-sync.py").resolve():
        sys.exit("recipe-photos-sync: scripts differ from origin/main (or not running from the worktree); refusing")
    out = WT / "public/recipes/images"
    manifest_path = out / "sources.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}

    # One photo PR at a time: while one is open, wait for photos-merge.yml to merge it.
    if run("gh", "pr", "list", "-R", GH_REPO, "--state", "open", "--search", "head:photos/", "--json", "number", "--jq", "length", capture=True) not in ("", "0"):
        print("recipe-photos-sync: a photo PR is still open; next run")
        return
    todo = []
    for s in slugs():
        src = SRC / f"{s}.jpg"
        if not src.is_file():
            continue
        h = sha(src)
        have = (out / f"{s}-800.jpg").exists()
        if manifest.get(s) != h or not have:
            todo.append((s, h))
    if not todo:
        print("recipe-photos-sync: nothing new")
        return
    print("recipe-photos-sync: " + ", ".join(s for s, _ in todo))
    if DRY:
        return
    for s, _ in todo:
        for old in out.glob(f"{s}-*"):
            if old.suffix in (".webp", ".jpg") and old.stem[len(s) + 1:].isdigit():
                old.unlink()
    run(sys.executable, "scripts/recipe-images.py", str(SRC), *[s for s, _ in todo])
    for s, h in todo:
        manifest[s] = h
    manifest_path.write_text(json.dumps(dict(sorted(manifest.items())), indent=2) + "\n")

    changed = [l[3:] for l in run("git", "status", "--porcelain", "--untracked-files=all", capture=True).splitlines() if l]
    if not changed:
        print("recipe-photos-sync: no file changed")
        return
    stray = [p for p in changed if not p.startswith("public/recipes/images/")]
    if stray:
        sys.exit(f"recipe-photos-sync: refusing, changes outside public/recipes/images/: {stray}")
    names = ", ".join(s for s, _ in todo)
    run("git", "add", "public/recipes/images")
    run("git", "commit", "-q", "-m", f"Recipes: photos for {names} (recipe-photos-sync)")
    run("git", "push", "-q", "-u", "origin", branch)
    body = (f"Automatic: new or changed dish photos for {names}, re-encoded by scripts/recipe-images.py (no EXIF). "
            "Images only. photos-merge.yml merges it once every path, size and type checks out and the build passes (Rod 11/26: recipes publish as they land).")
    url = run("gh", "pr", "create", "-R", GH_REPO, "--base", "main", "--head", branch,
              "--title", f"Recipe photos: {len(todo)} updated", "--body", body, capture=True)
    print(f"recipe-photos-sync: {url}")
    print("recipe-photos-sync: photos-merge.yml merges it once the checks pass")


if __name__ == "__main__":
    main()
