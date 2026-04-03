"""
extract_all.py — Batch wrapper: runs extract.py on all PDFs via subprocess.

Usage:
    python scripts/extract_all.py                    # process all
    python scripts/extract_all.py --force             # re-extract everything
    python scripts/extract_all.py --source bbl        # only one source
    python scripts/extract_all.py --dry-run           # preview only
    python scripts/extract_all.py --verbose           # verbose per PDF
"""

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

PDF_DIR = Path("data/pdfs")
SCRIPT = Path("scripts/extract.py")


def main():
    parser = argparse.ArgumentParser(description="Batch extract all PDFs into kennwerte-db")
    parser.add_argument("--source", help="Filter by source prefix (bbl, armasuisse, stadt-zuerich)")
    parser.add_argument("--force", action="store_true", help="Re-extract all")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose per PDF")
    parser.add_argument("--dry-run", action="store_true", help="Preview only")
    args = parser.parse_args()

    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if args.source:
        pdfs = [p for p in pdfs if p.name.startswith(args.source + "_")]

    print(f"Found {len(pdfs)} PDFs" + (f" (source={args.source})" if args.source else ""))
    print(f"Script: {SCRIPT}")
    print()

    if not pdfs:
        print("No PDFs to process.")
        return

    extra_args = []
    if args.force:
        extra_args.append("--force")
    if args.verbose:
        extra_args.append("--verbose")
    if args.dry_run:
        extra_args.append("--dry-run")

    start = time.time()
    success, failed, skipped = 0, 0, 0

    for i, pdf in enumerate(pdfs):
        prefix = f"[{i+1}/{len(pdfs)}]"

        try:
            result = subprocess.run(
                [sys.executable, str(SCRIPT), str(pdf)] + extra_args,
                capture_output=not args.verbose,
                text=True,
                timeout=120,
                env={**os.environ, "PYTHONIOENCODING": "utf-8"},
            )
            if result.returncode == 0:
                success += 1
                if not args.verbose and result.stdout:
                    # Print last line (summary)
                    lines = [l for l in result.stdout.strip().split("\n") if l.strip()]
                    if lines:
                        print(f"{prefix} {lines[-1]}")
            else:
                failed += 1
                print(f"{prefix} FAILED: {pdf.name[:50]}")
                if result.stderr:
                    print(f"         {result.stderr[:200]}")
        except subprocess.TimeoutExpired:
            failed += 1
            print(f"{prefix} TIMEOUT: {pdf.name[:50]}")
        except Exception as e:
            failed += 1
            print(f"{prefix} ERROR: {pdf.name[:50]} — {e}")

    elapsed = time.time() - start
    print(f"\n{'='*60}")
    print(f"Done in {elapsed:.0f}s ({elapsed/len(pdfs):.1f}s/PDF)")
    print(f"  Success: {success}")
    print(f"  Failed:  {failed}")
    print(f"  Total:   {len(pdfs)}")


if __name__ == "__main__":
    main()
