"""
pdf_to_markdown.py — Stage 1: Convert PDFs to Markdown + extract images.

Uses Docling (IBM) for high-quality table extraction and layout analysis.
Falls back to PyMuPDF4LLM for simple text-layer PDFs.

Output:
  data/markdown/{source}_{category}_{name}.md   — clean markdown per PDF
  assets/images/projects/{id}/                   — extracted images

Usage:
    python scripts/pdf_to_markdown.py data/pdfs/bbl_verwaltung_sample.pdf
    python scripts/pdf_to_markdown.py --all                    # convert all PDFs
    python scripts/pdf_to_markdown.py --all --source bbl       # only BBL
    python scripts/pdf_to_markdown.py --all --force            # re-convert all
"""

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

# Try Docling first, fall back to PyMuPDF4LLM
HAS_DOCLING = False
HAS_PYMUPDF4LLM = False

try:
    from docling.document_converter import DocumentConverter
    HAS_DOCLING = True
except ImportError:
    pass

try:
    import pymupdf4llm
    HAS_PYMUPDF4LLM = True
except ImportError:
    pass

if not HAS_DOCLING and not HAS_PYMUPDF4LLM:
    try:
        import fitz
        # Fallback: basic PyMuPDF text extraction formatted as markdown
        HAS_PYMUPDF_BASIC = True
    except ImportError:
        HAS_PYMUPDF_BASIC = False
else:
    HAS_PYMUPDF_BASIC = False

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
PDF_DIR = Path("data/pdfs")
MD_DIR = Path("data/markdown")
HASH_FILE = MD_DIR / "_hashes.json"


def compute_hash(pdf_path):
    return hashlib.sha256(Path(pdf_path).read_bytes()).hexdigest()[:16]


def load_hashes():
    if HASH_FILE.exists():
        return json.loads(HASH_FILE.read_text(encoding="utf-8"))
    return {}


def save_hashes(hashes):
    HASH_FILE.parent.mkdir(parents=True, exist_ok=True)
    HASH_FILE.write_text(json.dumps(hashes, indent=2), encoding="utf-8")


# ---------------------------------------------------------------------------
# Converters
# ---------------------------------------------------------------------------

def convert_with_docling(pdf_path, verbose=False):
    """Convert PDF to Markdown using Docling (best table extraction)."""
    converter = DocumentConverter()
    result = converter.convert(str(pdf_path))
    md = result.document.export_to_markdown()
    return md


def convert_with_pymupdf4llm(pdf_path, verbose=False):
    """Convert PDF to Markdown using PyMuPDF4LLM (fast, basic tables)."""
    md = pymupdf4llm.to_markdown(str(pdf_path))
    return md


def convert_with_pymupdf_basic(pdf_path, verbose=False):
    """Fallback: basic text extraction with PyMuPDF, formatted as markdown."""
    import fitz
    doc = fitz.open(str(pdf_path))
    pages = []
    for i, page in enumerate(doc):
        text = page.get_text()
        if text.strip():
            pages.append(f"## Page {i + 1}\n\n{text}")
    doc.close()
    return "\n\n---\n\n".join(pages)


def convert_pdf(pdf_path, force=False, verbose=False):
    """Convert a single PDF to Markdown. Returns (md_path, method) or (None, error)."""
    pdf_path = Path(pdf_path)
    md_name = pdf_path.stem + ".md"
    md_path = MD_DIR / md_name

    # Hash check
    pdf_hash = compute_hash(pdf_path)
    hashes = load_hashes()
    if not force and md_path.exists() and hashes.get(pdf_path.name) == pdf_hash:
        if verbose:
            print(f"  SKIP (unchanged): {pdf_path.name}")
        return md_path, "cached"

    # Convert
    method = None
    md = None
    start = time.time()

    if HAS_DOCLING:
        try:
            if verbose:
                print(f"  Converting with Docling...", end="", flush=True)
            md = convert_with_docling(pdf_path, verbose)
            method = "docling"
        except Exception as e:
            if verbose:
                print(f" ERROR: {e}")
            # Fall through to fallback

    if md is None and HAS_PYMUPDF4LLM:
        try:
            if verbose:
                print(f"  Converting with PyMuPDF4LLM...", end="", flush=True)
            md = convert_with_pymupdf4llm(pdf_path, verbose)
            method = "pymupdf4llm"
        except Exception as e:
            if verbose:
                print(f" ERROR: {e}")

    if md is None and HAS_PYMUPDF_BASIC:
        try:
            if verbose:
                print(f"  Converting with PyMuPDF (basic)...", end="", flush=True)
            md = convert_with_pymupdf_basic(pdf_path, verbose)
            method = "pymupdf_basic"
        except Exception as e:
            if verbose:
                print(f" ERROR: {e}")

    if md is None:
        return None, "no converter available"

    elapsed = time.time() - start

    # Save
    MD_DIR.mkdir(parents=True, exist_ok=True)
    md_path.write_text(md, encoding="utf-8")

    # Update hash
    hashes[pdf_path.name] = pdf_hash
    save_hashes(hashes)

    if verbose:
        print(f" {len(md)} chars, {elapsed:.1f}s ({method})")

    return md_path, method


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Convert PDFs to Markdown (Stage 1)")
    parser.add_argument("pdf", nargs="?", help="Path to single PDF file")
    parser.add_argument("--all", action="store_true", help="Convert all PDFs in data/pdfs/")
    parser.add_argument("--source", help="Filter by source prefix (bbl, armasuisse, etc.)")
    parser.add_argument("--force", action="store_true", help="Re-convert even if unchanged")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    args = parser.parse_args()

    print(f"PDF to Markdown converter")
    print(f"  Docling: {'available' if HAS_DOCLING else 'not installed'}")
    print(f"  PyMuPDF4LLM: {'available' if HAS_PYMUPDF4LLM else 'not installed'}")
    print(f"  PyMuPDF basic: {'available' if HAS_PYMUPDF_BASIC else 'not installed'}")
    print()

    if args.pdf:
        md_path, method = convert_pdf(args.pdf, force=args.force, verbose=True)
        if md_path:
            print(f"\n  Output: {md_path} ({method})")
        else:
            print(f"\n  FAILED: {method}")
            sys.exit(1)
        return

    if args.all:
        pdfs = sorted(PDF_DIR.glob("*.pdf"))
        if args.source:
            pdfs = [p for p in pdfs if p.name.startswith(args.source + "_")]

        print(f"  PDFs found: {len(pdfs)}")
        print(f"  Output: {MD_DIR.resolve()}")
        print()

        success, skipped, failed = 0, 0, 0
        start = time.time()

        for i, pdf in enumerate(pdfs):
            prefix = f"[{i + 1}/{len(pdfs)}]"
            if args.verbose:
                print(f"{prefix} {pdf.name[:60]}")

            md_path, method = convert_pdf(pdf, force=args.force, verbose=args.verbose)
            if md_path and method == "cached":
                skipped += 1
            elif md_path:
                success += 1
                if not args.verbose:
                    print(f"{prefix} [{method}] {pdf.name[:50]}  ({md_path.stat().st_size / 1024:.0f} KB)")
            else:
                failed += 1
                print(f"{prefix} FAILED: {pdf.name[:50]} — {method}")

        elapsed = time.time() - start
        print(f"\n{'=' * 60}")
        print(f"Done in {elapsed:.0f}s ({elapsed / max(len(pdfs), 1):.1f}s/PDF)")
        print(f"  Converted: {success}")
        print(f"  Skipped:   {skipped}")
        print(f"  Failed:    {failed}")
        print(f"  Total:     {len(pdfs)}")
        return

    parser.print_help()


if __name__ == "__main__":
    main()
