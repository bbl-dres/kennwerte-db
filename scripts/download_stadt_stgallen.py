"""
download_stadt_stgallen.py — Scrape and download Baudokumentationen PDFs from
Stadt St. Gallen Hochbauamt.

Source page:
    https://www.stadt.sg.ch/home/raum-umwelt/staedtische-projekte/
    realisierte-projekte/baudokumentationen.html

The page uses an accordion layout served by Adobe AEM / JCR.  Each accordion
section can contain one or more PDF download links whose URLs end with
``.ocFile/<filename>.pdf``.

Usage:
    # Dry-run: list discovered PDFs without downloading
    python scripts/download_stadt_stgallen.py --dry-run

    # Download all PDFs
    python scripts/download_stadt_stgallen.py

    # Download only a sample (first N)
    python scripts/download_stadt_stgallen.py --limit 5

    # Force re-download even if file exists
    python scripts/download_stadt_stgallen.py --force
"""

import argparse
import re
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import unquote, urljoin

import requests
from bs4 import BeautifulSoup

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
BASE_URL = (
    "https://www.stadt.sg.ch/home/raum-umwelt/staedtische-projekte/"
    "realisierte-projekte/baudokumentationen.html"
)
OUT_DIR = Path("data/pdfs")
PREFIX = "stadt-stgallen_hochbau"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    )
}
DELAY = 1.0  # seconds between downloads (be polite)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def slugify(text: str) -> str:
    """Turn arbitrary text into a filesystem-safe slug."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower())
    text = re.sub(r"[-\s]+", "-", text).strip("-")
    return text


def extract_number_and_name(filename: str, link_text: str) -> tuple[str | None, str]:
    """
    Try to extract the Baudokumentation number and a short name from the
    PDF filename or surrounding link text.

    Returns (number_str | None, slug_name).
    """
    # Many filenames start with the number, e.g. "192_2018_web.pdf"
    m = re.match(r"(\d{1,3})[\s_-]", filename)
    if m:
        number = m.group(1)
    else:
        # Fall back to link text: "Baudokumentation Nº 192, 2018"
        m2 = re.search(r"N[ºo°]?\s*(\d{1,3})", link_text)
        number = m2.group(1) if m2 else None

    # Derive human-readable name primarily from the FILENAME (more reliable
    # than the accordion section title which is often generic).
    stem = Path(filename).stem  # e.g. "192_2018_web" or "154_baudoku_rorschacherStr_107"

    # Strip leading number, year, "baudoku/baudok" prefix, trailing "web/webprint/kl/klein"
    name = stem
    name = re.sub(r"^\d{1,3}[\s_-]*", "", name)            # leading number
    name = re.sub(r"^\d{4}[\s_-]*", "", name)               # leading year
    name = re.sub(r"^[Bb]audok[u]?[\s_-]*", "", name)       # baudoku prefix
    name = re.sub(r"[\s_-]*(web|webprint|internet|klein|kl|f[uü]r[\s_]publ|nachdruck|neu)[\s_]*$",
                  "", name, flags=re.IGNORECASE)             # trailing qualifiers
    name = re.sub(r"[\s_-]*_$", "", name)                    # trailing underscores
    name = name.strip(" _-")

    # If name is empty after stripping, fall back to link text
    if not name or name.lower() in ("web", "a4h"):
        # Try link text
        lt = link_text
        for pat in [r"Baudokumentation\s*", r"Baudoku\s*",
                    r"N[ºo°]?\s*\d+[,\s]*\d*\s*", r"Textalternative.*"]:
            lt = re.sub(pat, "", lt, flags=re.IGNORECASE)
        lt = lt.strip(" ,/⁄–-")
        if lt:
            name = lt

    return number, slugify(name) or "unknown"


def scrape_pdf_links(session: requests.Session) -> list[dict]:
    """
    Fetch the Baudokumentationen page and return a list of dicts:
        [{"url": ..., "number": ..., "name": ..., "orig_filename": ...}, ...]
    """
    print(f"Fetching {BASE_URL} ...")
    resp = session.get(BASE_URL, headers=HEADERS, timeout=30)
    resp.raise_for_status()

    soup = BeautifulSoup(resp.text, "html.parser")
    results: list[dict] = []
    seen_urls: set[str] = set()

    # Find all <a> tags whose href ends with .pdf (case insensitive)
    for a_tag in soup.find_all("a", href=True):
        href = a_tag["href"]
        if not href.lower().endswith(".pdf"):
            continue
        full_url = urljoin(BASE_URL, href)
        if full_url in seen_urls:
            continue
        seen_urls.add(full_url)

        # Only keep links that live under the baudokumentationen path
        if "baudokumentationen" not in full_url:
            continue

        orig_filename = unquote(full_url.rsplit("/", 1)[-1])
        # Gather surrounding text for context
        link_text = a_tag.get_text(strip=True)
        # Also look at parent elements for richer context (accordion titles)
        parent_text = ""
        for parent in a_tag.parents:
            cls = " ".join(parent.get("class", []))
            if "accordion" in cls.lower():
                header = parent.find(re.compile(r"^h[2-5]$|^button$|^span$"))
                if header:
                    parent_text = header.get_text(strip=True)
                    break

        context = parent_text or link_text or orig_filename
        number, name = extract_number_and_name(orig_filename, context)

        results.append(
            {
                "url": full_url,
                "number": number,
                "name": name,
                "orig_filename": orig_filename,
                "context": context,
            }
        )

    # Sort by number (numeric) where available
    def sort_key(d):
        try:
            return int(d["number"])
        except (TypeError, ValueError):
            return 9999

    results.sort(key=sort_key)
    return results


def target_filename(entry: dict) -> str:
    """Build the canonical local filename."""
    num = entry["number"] or "000"
    return f"{PREFIX}_{int(num):03d}_{entry['name']}.pdf"


def download_pdf(
    session: requests.Session, url: str, dest: Path, force: bool = False
) -> bool:
    """Download a single PDF. Returns True if downloaded, False if skipped."""
    if dest.exists() and not force:
        print(f"  SKIP (exists): {dest.name}")
        return False
    print(f"  GET  {url[:120]}...")
    resp = session.get(url, headers=HEADERS, timeout=60, stream=True)
    resp.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    with open(dest, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    size_kb = dest.stat().st_size / 1024
    print(f"  OK   {dest.name}  ({size_kb:.0f} kB)")
    return True


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(
        description="Download Stadt St. Gallen Baudokumentationen PDFs"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Only list discovered PDFs; do not download.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Download at most N PDFs (0 = all).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if local file exists.",
    )
    parser.add_argument(
        "--out-dir",
        type=str,
        default=str(OUT_DIR),
        help=f"Output directory (default: {OUT_DIR}).",
    )
    args = parser.parse_args()
    out = Path(args.out_dir)

    session = requests.Session()

    entries = scrape_pdf_links(session)
    if not entries:
        print("ERROR: No PDF links found on the page. The page structure may have changed.")
        sys.exit(1)

    print(f"\nDiscovered {len(entries)} Baudokumentationen PDFs:\n")
    for i, e in enumerate(entries, 1):
        num_str = f"Nº {e['number']:>3s}" if e["number"] else "Nº  ?"
        print(f"  {i:3d}. {num_str}  {e['name']:<50s}  {e['orig_filename']}")

    if args.dry_run:
        print("\n(dry-run — nothing downloaded)")
        return

    # Download
    out.mkdir(parents=True, exist_ok=True)
    to_download = entries
    if args.limit:
        to_download = entries[: args.limit]

    downloaded, skipped, errors = 0, 0, 0
    for e in to_download:
        dest = out / target_filename(e)
        try:
            if download_pdf(session, e["url"], dest, force=args.force):
                downloaded += 1
                time.sleep(DELAY)
            else:
                skipped += 1
        except Exception as exc:
            print(f"  ERR  {e['orig_filename']}: {exc}")
            errors += 1

    print(
        f"\nDone. Downloaded: {downloaded}, Skipped: {skipped}, Errors: {errors}"
    )


if __name__ == "__main__":
    main()
