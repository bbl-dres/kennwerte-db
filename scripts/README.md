# scripts/

Extraction pipeline and download scripts for kennwerte-db.

## Pipeline

The extraction pipeline converts PDF Bautendokumentationen into structured database records in two stages:

```
PDF  -->  pdf_to_markdown.py  -->  .md file  -->  extract.py  -->  SQLite DB
              (Stage 1)                             (Stage 2)
```

| Script | Purpose |
|---|---|
| `pdf_to_markdown.py` | **Stage 1**: Convert PDFs to Markdown. Uses PyMuPDF4LLM (fast) with Docling fallback (for scanned pages). Supports parallel processing (`--workers 6`). |
| `extract_from_markdown.py` | **Stage 2 core**: Parse markdown tables and text to extract BKP costs, SIA 416 quantities, metadata, timeline. Can run standalone for testing. |
| `extract.py` | **Full pipeline**: Runs Stage 1 + Stage 2 + image extraction + geocoding + DB upsert for a single PDF. |
| `extract_all.py` | **Batch wrapper**: Runs `extract.py` on all PDFs via subprocess (isolates memory per PDF). |
| `extract_v1.py` | **Legacy**: Original regex-on-raw-text pipeline (kept for reference). |

### Quick start

```bash
# Convert all PDFs to markdown (parallel)
python scripts/pdf_to_markdown.py --all --workers 6

# Extract single PDF into DB
python scripts/extract.py data/pdfs/bbl_verwaltung_sample.pdf --verbose

# Extract all PDFs into DB
python scripts/extract_all.py --force

# Test markdown extraction without DB writes
python scripts/extract_from_markdown.py data/markdown/sample.md
```

### Options

```
--force       Re-process even if PDF hash unchanged
--verbose     Show detailed extraction output
--dry-run     Preview without writing to DB
--workers N   Parallel workers for pdf_to_markdown.py (default: 1)
--source X    Filter by source prefix (bbl, armasuisse, etc.)
```

## Download Scripts

Each source has a download script that fetches PDFs into `data/pdfs/`.

| Script | Source | Format | Documents |
|---|---|---|---|
| `download_bbl.sh` | BBL (federal civil buildings) | Bash/curl | ~144 |
| `download_armasuisse.sh` | armasuisse (military buildings) | Bash/curl | ~53 |
| `download_stadt_zuerich.sh` | Stadt Zurich | Bash/curl | ~36 |
| `download_stadt_bern.py` | Stadt Bern | Python | ~55 |
| `download_stadt_stgallen.py` | Stadt St. Gallen | Python | ~78 |
| `download_kanton_aargau.py` | Kanton Aargau | Python | ~7 |

### File naming convention

All PDFs are saved flat in `data/pdfs/` with the pattern:

```
{source}_{category}_{original-name}.pdf
```

Examples:
- `bbl_verwaltung_20210101_Zollikofen_Neubau.pdf`
- `stadt-stgallen_hochbau_142_movenstr14.pdf`
- `kanton-aargau_hochbau_033_campus-fhnw.pdf`

## Dependencies

```bash
# Core
pip install pymupdf pillow

# Stage 1 (markdown conversion)
pip install pymupdf4llm docling

# OCR (optional, for scanned pages)
pip install pytesseract
# + Tesseract binary with deu/fra/ita language packs
```
