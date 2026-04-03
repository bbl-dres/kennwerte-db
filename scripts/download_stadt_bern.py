#!/usr/bin/env python3
"""
download_stadt_bern.py — Download Bauflyer and Baujahr PDFs from
Hochbau Stadt Bern publications page.

Usage:
    python scripts/download_stadt_bern.py [--dry-run] [--sample N] [--verbose]

Options:
    --dry-run   List URLs without downloading
    --sample N  Download only N sample PDFs (for validation)
    --verbose   Print detailed progress
"""

import argparse
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BASE_URL = "https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/prd/hochbau-stadt-bern/publikationen"
OUTPUT_DIR = Path(__file__).resolve().parent.parent / "data" / "pdfs"
PREFIX = "stadt-bern_hochbau_"

# Known sub-page slugs that contain Bauflyer PDFs (year folders)
BAUFLYER_YEAR_SLUGS = [
    "bauflyer-2015",
    "bauflyer-2016",
    "bauflyer-2017",
    "2018",           # Note: 2018 uses a different slug
    "bauflyer-2019",
    "bauflyer-2020",
    "bauflyer-2021",
    "bauflyer-2022",
    "bauflyer-2023",
    "bauflyer-2024",
]

# Known Baujahr (annual report) PDF URL patterns
# These sit directly on the publications page via ftw-simplelayout-filelistingblock
BAUJAHR_YEARS = list(range(2014, 2025))  # 2014-2024

# User-Agent to avoid being blocked
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
}


# ---------------------------------------------------------------------------
# HTML link extractor
# ---------------------------------------------------------------------------

class LinkExtractor(HTMLParser):
    """Extract all href attributes from HTML."""

    def __init__(self):
        super().__init__()
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "a":
            for name, value in attrs:
                if name == "href" and value:
                    self.links.append(value)


def fetch_page(url: str, verbose: bool = False) -> str:
    """Fetch a URL and return its HTML content."""
    if verbose:
        print(f"  Fetching: {url}")
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read().decode("utf-8", errors="replace")
    except Exception as e:
        print(f"  WARNING: Failed to fetch {url}: {e}", file=sys.stderr)
        return ""


def extract_pdf_links(html: str, page_url: str) -> list[str]:
    """Extract all PDF links from HTML, resolving relative URLs."""
    parser = LinkExtractor()
    parser.feed(html)

    pdf_urls = []
    for href in parser.links:
        # Match .pdf links (including @@download variants)
        if ".pdf" in href.lower():
            # Resolve relative URLs
            full_url = urllib.parse.urljoin(page_url, href)
            pdf_urls.append(full_url)

    return list(set(pdf_urls))  # deduplicate


def normalize_download_url(url: str) -> str:
    """Ensure we use the @@download variant for direct file access."""
    # If URL ends with /view or /download, convert to @@download
    if url.endswith("/view"):
        url = url.rsplit("/view", 1)[0] + "/@@download/file"
    elif url.endswith("/download"):
        url = url.rsplit("/download", 1)[0] + "/@@download/file"
    # If URL already has @@download, keep it
    # If URL ends with .pdf and has no /@@download, add it
    if ".pdf" in url and "/@@download/" not in url:
        # Find the .pdf part and append @@download
        pdf_idx = url.lower().rfind(".pdf")
        pdf_path = url[:pdf_idx + 4]
        url = pdf_path + "/@@download/file"
    return url


def make_output_filename(url: str, year_slug: str = "") -> str:
    """Create a clean output filename with the project prefix."""
    # Try to extract meaningful name from URL
    # Get the last meaningful PDF filename from the URL
    parsed = urllib.parse.urlparse(url)
    path = urllib.parse.unquote(parsed.path)

    # Try to get filename from the path
    # Patterns: .../something.pdf/@@download/file/ActualName.pdf
    #           .../something.pdf/@@download/file
    #           .../something.pdf
    parts = path.split("/")

    # Look for a .pdf filename in the path
    pdf_name = None
    for part in reversed(parts):
        if part.lower().endswith(".pdf"):
            pdf_name = part
            break
        # Also check the segment before @@download
    if not pdf_name:
        for i, part in enumerate(parts):
            if ".pdf" in part.lower():
                pdf_name = part.split(".pdf")[0] + ".pdf"
                break

    if not pdf_name:
        pdf_name = "unknown.pdf"

    # Clean up the filename
    pdf_name = pdf_name.replace("%20", "_").replace(" ", "_")
    pdf_name = re.sub(r"[^\w\-._]", "_", pdf_name)
    pdf_name = re.sub(r"_+", "_", pdf_name).strip("_")

    # Ensure it ends with .pdf
    if not pdf_name.lower().endswith(".pdf"):
        pdf_name += ".pdf"

    # Build final name
    clean_name = pdf_name.lower()
    return f"{PREFIX}{clean_name}"


# ---------------------------------------------------------------------------
# Discovery: find all PDF URLs
# ---------------------------------------------------------------------------

def discover_bauflyer_pdfs(verbose: bool = False) -> list[dict]:
    """Crawl year sub-pages to discover Bauflyer PDFs."""
    results = []

    # First, scan the main publications page for PDFs in /downloads/ folder
    # (older Bauflyer from 2014 era)
    if verbose:
        print("\nScanning main publications page for older Bauflyer...")
    html = fetch_page(BASE_URL, verbose)
    if html:
        pdf_links = extract_pdf_links(html, BASE_URL)
        for url in pdf_links:
            norm = normalize_download_url(url)
            # Keep links in /downloads/ or /bauflyer- or /ftw-simplelayout
            if "hochbau-stadt-bern/publikationen/" in norm:
                # Exclude baujahr links (handled separately)
                if "baujahr" not in norm.lower():
                    results.append({
                        "url": norm,
                        "type": "bauflyer",
                        "year_slug": "main",
                    })

    for slug in BAUFLYER_YEAR_SLUGS:
        page_url = f"{BASE_URL}/{slug}"
        if verbose:
            print(f"\nScanning Bauflyer folder: {slug}")

        html = fetch_page(page_url, verbose)
        if not html:
            continue

        pdf_links = extract_pdf_links(html, page_url)

        # IMPORTANT: Only keep links whose URL actually contains this slug
        # (each sub-page also shows shared navigation links to other folders)
        matched = 0
        for url in pdf_links:
            norm = normalize_download_url(url)
            if f"/{slug}/" in norm:
                results.append({
                    "url": norm,
                    "type": "bauflyer",
                    "year_slug": slug,
                })
                matched += 1

        if verbose:
            print(f"  Found {len(pdf_links)} total link(s), {matched} in /{slug}/")

        # Be polite: small delay between requests
        time.sleep(0.5)

    return results


def discover_baujahr_pdfs(verbose: bool = False) -> list[dict]:
    """Discover Baujahr annual report PDFs from the main publications page."""
    results = []

    if verbose:
        print("\nScanning main publications page for Baujahr reports...")

    html = fetch_page(BASE_URL, verbose)
    if not html:
        return results

    pdf_links = extract_pdf_links(html, BASE_URL)

    for url in pdf_links:
        url_lower = url.lower()
        if "baujahr" in url_lower:
            results.append({
                "url": normalize_download_url(url),
                "type": "baujahr",
                "year_slug": "",
            })

    # Also try known URL patterns for Baujahr reports
    for year in BAUJAHR_YEARS:
        # Pattern observed from search: .../ftw-simplelayout-filelistingblock/Baujahr_YYYY.pdf
        candidate_urls = [
            f"{BASE_URL}/ftw-simplelayout-filelistingblock/Baujahr_{year}.pdf/@@download/file/Baujahr_{year}.pdf",
            f"{BASE_URL}/ftw-simplelayout-filelistingblock/baujahr-{year}.pdf/@@download/file/Baujahr_{year}.pdf",
            f"{BASE_URL}/ftw-simplelayout-filelistingblock/baujahr-{year}-lowres-100dpi.pdf/@@download/file/baujahr-{year}-lowres-100dpi.pdf",
        ]
        # Also the old URL pattern (pre-2016)
        if year <= 2014:
            candidate_urls.append(
                f"https://www.bern.ch/stadtverwaltung/prd/hochbauamt/publikationen/publikationen-2014/baujahr-2014.pdf"
            )

        for url in candidate_urls:
            already = any(r["url"] == url for r in results)
            if not already:
                results.append({
                    "url": url,
                    "type": "baujahr",
                    "year_slug": str(year),
                })

    return results


# ---------------------------------------------------------------------------
# Download
# ---------------------------------------------------------------------------

def download_pdf(url: str, output_path: Path, verbose: bool = False) -> bool:
    """Download a single PDF. Returns True on success."""
    if output_path.exists():
        if verbose:
            print(f"  SKIP (exists): {output_path.name}")
        return True

    if verbose:
        print(f"  Downloading: {url}")
        print(f"         -> {output_path.name}")

    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            content_type = resp.headers.get("Content-Type", "")
            data = resp.read()

            # Verify we got a PDF (not an error page)
            if len(data) < 1000:
                if verbose:
                    print(f"  WARNING: Very small response ({len(data)} bytes), skipping")
                return False

            if data[:4] != b"%PDF" and "pdf" not in content_type.lower():
                if verbose:
                    print(f"  WARNING: Response is not a PDF (Content-Type: {content_type}), skipping")
                return False

            output_path.parent.mkdir(parents=True, exist_ok=True)
            output_path.write_bytes(data)

            size_kb = len(data) / 1024
            if verbose:
                print(f"  OK: {size_kb:.0f} KB")
            return True

    except Exception as e:
        if verbose:
            print(f"  FAILED: {e}")
        return False


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Download Bauflyer and Baujahr PDFs from Hochbau Stadt Bern"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="List URLs without downloading")
    parser.add_argument("--sample", type=int, default=0,
                        help="Download only N sample PDFs (for validation)")
    parser.add_argument("--verbose", action="store_true",
                        help="Print detailed progress")
    parser.add_argument("--bauflyer-only", action="store_true",
                        help="Only download Bauflyer PDFs")
    parser.add_argument("--baujahr-only", action="store_true",
                        help="Only download Baujahr annual reports")
    args = parser.parse_args()

    print("=" * 60)
    print("Hochbau Stadt Bern — PDF Downloader")
    print("=" * 60)

    # Phase 1: Discover PDFs
    all_pdfs = []

    if not args.baujahr_only:
        print("\n[1/2] Discovering Bauflyer PDFs...")
        bauflyer = discover_bauflyer_pdfs(verbose=args.verbose)
        all_pdfs.extend(bauflyer)
        print(f"  Found {len(bauflyer)} Bauflyer PDF(s)")

    if not args.bauflyer_only:
        print("\n[2/2] Discovering Baujahr annual report PDFs...")
        baujahr = discover_baujahr_pdfs(verbose=args.verbose)
        all_pdfs.extend(baujahr)
        print(f"  Found {len(baujahr)} Baujahr candidate URL(s)")

    # Deduplicate by output filename (first URL wins)
    seen_filenames = set()
    seen_urls = set()
    unique_pdfs = []
    for pdf in all_pdfs:
        fname = make_output_filename(pdf["url"], pdf["year_slug"])
        if fname not in seen_filenames and pdf["url"] not in seen_urls:
            seen_filenames.add(fname)
            seen_urls.add(pdf["url"])
            unique_pdfs.append(pdf)
    all_pdfs = unique_pdfs

    print(f"\nTotal unique PDF URLs: {len(all_pdfs)}")

    if args.sample > 0:
        # Take a mix of types for sampling
        bauflyer_sample = [p for p in all_pdfs if p["type"] == "bauflyer"][:args.sample]
        baujahr_sample = [p for p in all_pdfs if p["type"] == "baujahr"][:max(1, args.sample // 3)]
        all_pdfs = (bauflyer_sample + baujahr_sample)[:args.sample]
        print(f"Sampling {len(all_pdfs)} PDF(s)")

    # Phase 2: Download (or dry-run)
    if args.dry_run:
        print("\n--- DRY RUN: URLs that would be downloaded ---")
        for pdf in all_pdfs:
            fname = make_output_filename(pdf["url"], pdf["year_slug"])
            print(f"  [{pdf['type']:>9}] {fname}")
            print(f"            {pdf['url']}")
        print(f"\nTotal: {len(all_pdfs)} PDFs")
        return

    print(f"\nDownloading to: {OUTPUT_DIR}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    failed = 0
    skipped = 0

    for i, pdf in enumerate(all_pdfs, 1):
        fname = make_output_filename(pdf["url"], pdf["year_slug"])
        output_path = OUTPUT_DIR / fname

        print(f"[{i}/{len(all_pdfs)}] {fname}")

        if output_path.exists():
            skipped += 1
            print(f"  SKIP (exists)")
            continue

        ok = download_pdf(pdf["url"], output_path, verbose=args.verbose)
        if ok:
            success += 1
        else:
            failed += 1

        # Polite delay
        time.sleep(0.3)

    print("\n" + "=" * 60)
    print(f"Done: {success} downloaded, {skipped} skipped, {failed} failed")
    print(f"Output directory: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
