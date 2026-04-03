#!/usr/bin/env python3
"""
download_kanton_aargau.py — Download Baudokumentationen PDFs from Kanton Aargau
(Immobilien Aargau, Departement Finanzen und Ressourcen).

Source: https://www.ag.ch/de/themen/planen-bauen/immobilien/immobilienprojekte
PDFs:   https://www.ag.ch/media/kanton-aargau/dfr/dokumente/immobilien/projekte/baudokumentationen/

These are numbered brochures (No 033–046+) documenting completed cantonal
construction projects with cost data (BKP-based Anlagekosten).

Usage:
    python scripts/download_kanton_aargau.py               # download all known PDFs
    python scripts/download_kanton_aargau.py --dry-run      # preview only
    python scripts/download_kanton_aargau.py --force        # re-download existing
    python scripts/download_kanton_aargau.py --discover     # try to discover new PDFs from web page
"""

import argparse
import hashlib
import re
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

BASE_URL = "https://www.ag.ch/media/kanton-aargau/dfr/dokumente/immobilien/projekte/baudokumentationen"
OUTPUT_DIR = Path("data/pdfs")

# -----------------------------------------------------------------
# Known PDFs — compiled from web research (April 2026).
# Format: (number, short_name, relative_url_path)
#
# The numbering corresponds to the "Nº" printed on each brochure.
# Filenames on the server are inconsistent (some have the number
# prefix, some don't), so we map them explicitly.
# -----------------------------------------------------------------
KNOWN_PDFS = [
    # Numbering verified from back-cover project lists in multiple PDFs.
    # Numbers 033-046 confirmed; filenames on server are inconsistent.
    (
        "033",
        "campus-fhnw-brugg-windisch",
        "doku-campus-fhnw-brugg-windisch.pdf",
    ),
    # 034: Anbau Bezirksgericht Rheinfelden, 2013 — URL not yet found
    # 035: JVA Produktionsgebäude, Lenzburg, 2013 — URL not yet found
    # 036: Strassenverkehrsamt Schafisheim, 2014 — URL not yet found
    (
        "037",
        "verwaltungsgebaeude-rheinfelden",
        "kohlplatz-rheinfelden-neubau/2015-037-baudoku-verwaltungsgeb-rheinfelden-neubau.pdf",
    ),
    (
        "038",
        "landwirtschaftliches-zentrum-liebegg",
        "landwirtschaftliches-zentrum-liebegg-neubau-multifunktionshalle.pdf",
    ),
    # 039: Instandsetzung Fünfstern, JVA, Lenzburg, 2016 — URL not yet found
    # 040: Erweiterung Zentralgefängnis, Lenzburg, 2017 — URL not yet found
    (
        "041",
        "kantonale-notrufzentrale-aarau",
        "041-knz-efi-dokumentation.pdf",
    ),
    (
        "042",
        "werkhof-wohlen",
        "ag17-werkhof-wohlen.pdf",
    ),
    # 043: Dreifachsporthalle Kantonsschule Wettingen, 2018 — URL not yet found
    (
        "044",
        "forstwerkhof-maiholz-muri",
        "044-forstwaldhof-maiholz.pdf",
    ),
    # 045: Zivilschutzausbildungszentrum Eiken — URL not yet found
    (
        "046",
        "amt-fuer-verbraucherschutz",
        "brosch-re-amtfuerverbraucherschutz.pdf",
    ),
]

# Additional PDFs in the same directory that are related but may not be
# numbered brochures (project descriptions, jury reports, plans, etc.)
EXTRA_PDFS = [
    # Older un-numbered brochures and supplementary documents found in the
    # same directory. These predate the current numbering or are variants.
    (
        "pre033a",
        "fachhochschule-nw-windisch",
        "fachhochschule-nw-windisch.pdf",
    ),
    (
        "pre033b",
        "sportausbildungszentrum-muelimatt",
        "neubau-muelimatt.pdf",
    ),
    (
        "pre038",
        "kantonsschule-wohlen-sanierung",
        "sanierung-kantonsschule-wohlen.pdf",
    ),
    (
        "042alt",
        "werkhof-wohlen-projektbeschrieb",
        "projektbeschrieb-werkhof-wohlen.pdf",
    ),
    (
        "041f",
        "kantonale-notrufzentrale-efi-folder",
        "kantonale-notrufzentrale-und-fuehrungsinfrastruktur/041-knz-efi-folder.pdf",
    ),
    (
        "xxx",
        "kantonsschule-fricktal-stein-jurybericht",
        "firstspirit-1680162164273neue-kantonsschule-fricktal-in-stein-jurybericht-m-rz-2023.pdf",
    ),
    (
        "xxx2",
        "kantonsschule-stein-plansatz",
        "kantonsschule-stein-im-fricktal-plansatz-ksst-32-ar-pln-x20-01.pdf",
    ),
]

# Alternative URL base (older server layout with underscores)
ALT_BASE_URL = "https://www.ag.ch/media/kanton_aargau/dfr/dokumente_3/immobilien_1/projekte_1/baudokumentationen"


def make_local_name(number: str, short_name: str) -> str:
    """Generate local filename following project convention: kanton-aargau_hochbau_[number]_[name].pdf"""
    return f"kanton-aargau_hochbau_{number}_{short_name}.pdf"


def download_pdf(url: str, dest: Path, dry_run: bool = False) -> bool:
    """Download a single PDF. Returns True on success."""
    if dry_run:
        print(f"  [DRY-RUN] Would download: {url}")
        print(f"            -> {dest}")
        return True

    try:
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (kennwerte-db research; +https://github.com)",
            "Accept": "application/pdf,*/*",
        })
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = resp.read()

        # Sanity check: should be a PDF
        if not data[:5].startswith(b"%PDF"):
            print(f"  WARNING: Response does not look like a PDF ({len(data)} bytes)")
            # Still save it — might be a redirect page
            # return False

        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)

        size_mb = len(data) / (1024 * 1024)
        md5 = hashlib.md5(data).hexdigest()[:8]
        print(f"  OK  {size_mb:6.1f} MB  md5:{md5}  {dest.name}")
        return True

    except urllib.error.HTTPError as e:
        print(f"  FAIL  HTTP {e.code}: {url}")
        return False
    except Exception as e:
        print(f"  FAIL  {e}: {url}")
        return False


def try_discover_from_page() -> list[tuple[str, str, str]]:
    """Try to scrape the main page or directory listing for additional PDF links."""
    discovered = []
    urls_to_try = [
        "https://www.ag.ch/de/themen/planen-bauen/immobilien/immobilienprojekte",
        f"{BASE_URL}/",
    ]

    for page_url in urls_to_try:
        try:
            req = urllib.request.Request(page_url, headers={
                "User-Agent": "Mozilla/5.0 (kennwerte-db research)",
            })
            with urllib.request.urlopen(req, timeout=30) as resp:
                html = resp.read().decode("utf-8", errors="replace")

            # Find PDF links in the baudokumentationen path
            pattern = r'href="([^"]*baudokumentationen/[^"]*\.pdf)"'
            for match in re.finditer(pattern, html, re.IGNORECASE):
                href = match.group(1)
                # Normalize to relative path
                for prefix in [BASE_URL + "/", ALT_BASE_URL + "/"]:
                    if href.startswith(prefix):
                        href = href[len(prefix):]
                        break
                if href.startswith("http"):
                    # Full URL we can't normalize — skip
                    continue

                # Check if we already know this one
                known_paths = {p[2] for p in KNOWN_PDFS + EXTRA_PDFS}
                if href not in known_paths:
                    name = Path(href).stem.lower().replace(" ", "-")
                    discovered.append(("new", name, href))
                    print(f"  DISCOVERED: {href}")

        except Exception as e:
            print(f"  Could not fetch {page_url}: {e}")

    return discovered


def main():
    parser = argparse.ArgumentParser(
        description="Download Kanton Aargau Baudokumentationen PDFs"
    )
    parser.add_argument("--dry-run", action="store_true", help="Preview without downloading")
    parser.add_argument("--force", action="store_true", help="Re-download existing files")
    parser.add_argument("--extras", action="store_true", help="Also download extra/supplementary PDFs")
    parser.add_argument("--discover", action="store_true", help="Try to discover additional PDFs from the web page")
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR, help="Output directory")
    args = parser.parse_args()

    out = args.output_dir
    out.mkdir(parents=True, exist_ok=True)

    pdfs = list(KNOWN_PDFS)
    if args.extras:
        pdfs.extend(EXTRA_PDFS)

    if args.discover:
        print("Discovering additional PDFs from web pages...")
        extra = try_discover_from_page()
        pdfs.extend(extra)
        print(f"  Found {len(extra)} new PDFs\n")

    print(f"Kanton Aargau Baudokumentationen Downloader")
    print(f"  Known brochures: {len(KNOWN_PDFS)} (Nº 033–046)")
    print(f"  To download:     {len(pdfs)}")
    print(f"  Output:          {out.resolve()}")
    print()

    success, skipped, failed = 0, 0, 0
    start = time.time()

    for number, short_name, rel_path in pdfs:
        local_name = make_local_name(number, short_name)
        dest = out / local_name
        url = f"{BASE_URL}/{rel_path}"

        print(f"[{number}] {short_name}")

        if dest.exists() and not args.force:
            size_mb = dest.stat().st_size / (1024 * 1024)
            print(f"  SKIP  {size_mb:.1f} MB already exists: {dest.name}")
            skipped += 1
            continue

        ok = download_pdf(url, dest, dry_run=args.dry_run)
        if ok:
            success += 1
        else:
            # Try alternative URL base
            alt_url = f"{ALT_BASE_URL}/{rel_path}"
            print(f"  Trying alternate URL...")
            ok = download_pdf(alt_url, dest, dry_run=args.dry_run)
            if ok:
                success += 1
            else:
                failed += 1

        # Be polite: small delay between downloads
        if not args.dry_run:
            time.sleep(0.5)

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"Done in {elapsed:.0f}s")
    print(f"  Downloaded: {success}")
    print(f"  Skipped:    {skipped}")
    print(f"  Failed:     {failed}")
    print(f"  Total:      {len(pdfs)}")

    if failed > 0:
        print(f"\nNote: {failed} PDF(s) failed to download.")
        print("Some numbers (034-036, 039-040, 043, 045) may not be published online")
        print("or may use different filenames. Run with --discover to try")
        print("finding them automatically.")
        sys.exit(1)


if __name__ == "__main__":
    main()
