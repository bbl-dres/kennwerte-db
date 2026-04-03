# kennwerte-db — Extraction Pipeline

## Project Context

**kennwerte-db** is an open-source construction cost benchmark database for Swiss public buildings. It collects, structures, and presents cost Kennwerte (CHF/m² GF, CHF/m³ GV, BKP/eBKP-H breakdowns) from realised Bauprojekte to support early-stage cost estimation (Kostenschätzung, Kostenvoranschlag) and portfolio-level cost analysis.

**Related documents**: [SOURCES.md](SOURCES.md) (data source inventory) · [REQUIREMENTS.md](REQUIREMENTS.md) · [DATAMODEL.md](DATAMODEL.md)

---

## Current Pipeline (v1 — Regex-based)

The current pipeline extracts text directly from PDFs using PyMuPDF (with Tesseract OCR fallback for scanned pages), then applies regex patterns to extract structured fields. This works well for BBL PDFs (~80% extraction rate) but struggles with layout variance in armasuisse and Stadt Zürich documents.

### Architecture

```
PDF Input (data/pdfs/)
    │
    ├── 1. Text extraction ─── PyMuPDF get_text() ──┐
    │                          Tesseract OCR (300dpi) ┤
    │                          Language: DE/FR/IT     │
    │                                                  ▼
    ├── 2. Text normalization ── Ligature fix (ﬂ→fl) ─┐
    │                            Multi-line BKP merge  │
    │                            Unicode quote fix     │
    │                                                  ▼
    ├── 3. Regex extraction ──── Metadata (DE/FR/IT) ──┐
    │                            Quantities (GF/GV)    │
    │                            BKP/eBKP-H costs      │
    │                            Benchmarks, Timeline  │
    │                            Description           │
    │                                                  ▼
    ├── 4. Image extraction ──── Thumbnails (400px) ───┐
    │                            All embedded images   │
    │                                                  ▼
    ├── 5. Geocoding ─────────── geo.admin.ch (CH) ────┐
    │                            Geoapify (foreign)    │
    │                                                  ▼
    └── 6. DB upsert ─────────── SQLite (kennwerte.db)
                                  extraction_log
                                  quality grade A-E
```

### Results (v1)

| Source | Documents | With Costs | With GF | Extraction Rate |
|---|---|---|---|---|
| BBL | 144 | 113 (78%) | 86 (60%) | Good |
| armasuisse | 53 | 26 (49%) | 17 (32%) | Moderate |
| Stadt Zürich | 36 | 0 (0%) | 0 (0%) | Poor |
| **Total** | **233** | **139 (60%)** | **103 (44%)** | |

### Limitations

- **Layout-dependent**: regex breaks when PDF layouts change (different table structures, prose vs. tables)
- **OCR quality varies**: Tesseract struggles with design-heavy brochures
- **Per-source maintenance**: each new source may need custom regex patterns
- **No table structure preservation**: raw text extraction loses table column alignment
- **Stadt Zürich unprocessable**: costs embedded in prose paragraphs, not structured tables

---

## Planned Pipeline (v2 — Markdown-first)

### Problem Statement

The v1 regex approach fails when:
1. Cost tables use different column layouts across sources
2. Values span multiple lines (armasuisse)
3. Costs are embedded in prose (Stadt Zürich)
4. OCR produces noisy text that regex can't match
5. New sources have unforeseen formats

### Approaches Evaluated

| Approach | Pros | Cons | Verdict |
|---|---|---|---|
| **A. More regex patterns** | No new dependencies, fast | O(n) patterns per source, still brittle | Exhausted |
| **B. PDF → Markdown → Regex** | Cleaner input for regex | Tables still lost in markdown from bad parsers | Partial solution |
| **C. PDF → Markdown → LLM** | Handles any layout, any language | API costs, requires schema prompting | **Recommended** |
| **D. Vision LLM on page images** | Handles scans natively | Expensive per page, slow | Overkill for text PDFs |
| **E. Fine-tuned extraction model** | Best accuracy | Needs training data, maintenance burden | Future option |

### Tool Comparison (PDF → Markdown)

Evaluated in April 2026:

| Tool | Table Quality | OCR | CPU Speed | License | Best For |
|---|---|---|---|---|---|
| **Docling** (IBM) | **Best** (97.9% cell accuracy) | Good (pluggable backends) | 3.1s/page | MIT | Complex tables |
| **Marker** (Datalab) | Good | Good (Surya, 90+ langs) | 16s/page | GPL + CC-BY-NC-SA | Multi-column layouts |
| **MinerU** (OpenDataLab) | Good | Good (84 langs) | 3.3s/page | Apache 2.0 | General purpose |
| **PyMuPDF4LLM** | Basic (rule-based) | Via Tesseract | **<0.5s/page** | AGPL | Fast pre-filter |
| **Nougat** (Meta) | Academic only | Trained on arXiv | 30+s/page | MIT | Not suitable |
| **olmOCR** (Allen AI) | Good | **Best** (82.4 benchmark) | GPU required | Apache 2.0 | Bulk OCR |

### Selected Architecture (v2)

```
PDF Input
    │
    ▼
┌─ Stage 1: PDF → Markdown + Images ─────────────────┐
│                                                      │
│  PyMuPDF4LLM (fast pre-check: has text layer?)      │
│       │                    │                         │
│       ▼                    ▼                         │
│  Native text PDFs     Scanned/image pages            │
│       │                    │                         │
│       ▼                    ▼                         │
│  Docling               Docling + OCR                 │
│       │                    │                         │
│       └────────┬───────────┘                         │
│                ▼                                     │
│  Clean Markdown per PDF (data/markdown/{id}.md)      │
│  Extracted images (assets/images/projects/{id}/)     │
│                                                      │
└──────────────────────────────────────────────────────┘
    │
    ▼
┌─ Stage 2: Markdown → Structured JSON ───────────────┐
│                                                      │
│  Option A: LLM extraction (Claude API)               │
│    - Schema-based prompting                          │
│    - Handles any layout, DE/FR/IT natively           │
│    - ~$0.01-0.05 per PDF                             │
│                                                      │
│  Option B: Enhanced regex on clean markdown           │
│    - Tables preserved as markdown tables              │
│    - Better than raw text regex                       │
│    - Zero API cost                                   │
│                                                      │
│  Option C: Hybrid (regex first, LLM fallback)        │
│    - Regex for well-structured BBL/Bern PDFs         │
│    - LLM for difficult armasuisse/ZH PDFs            │
│    - Cost-optimized                                  │
│                                                      │
└──────────────────────────────────────────────────────┘
    │
    ▼
  Structured JSON → DB upsert (same as v1)
```

### Why Docling

1. **Table extraction is critical** — BKP cost tables are the core data. Docling's TableFormer model achieves 97.9% cell accuracy, far ahead of regex on raw text.
2. **Runs on CPU** — 3.1s/page without GPU, viable for laptop processing of ~400 PDFs.
3. **MIT license** — no commercial restrictions, unlike Marker (GPL) or PyMuPDF (AGPL).
4. **Active development** — IBM's Granite-Docling-258M model (Jan 2026) is optimized for exactly this use case.
5. **Pluggable OCR** — can use Tesseract (already installed) or Surya for better multilingual accuracy.

### Why Markdown as Intermediate Format

1. **Tables preserved** — cost breakdowns render as markdown tables with aligned columns
2. **LLM-native** — Claude/GPT-4o are fluent in markdown; extraction prompts produce better results
3. **Human-debuggable** — `data/markdown/123.md` is readable, inspectable, diffable
4. **Cacheable** — markdown can be regenerated only when PDF changes (hash-based)
5. **Lighter than HTML/JSON** — more token-efficient for LLM context windows

### Benchmark Results (tested April 2026)

Tested on the same St. Gallen PDF (4 pages, structured cost table):

| Converter | Time | Chars | Table Quality |
|---|---|---|---|
| **PyMuPDF4LLM** | **1.8s** | 5,917 | Good — markdown tables with `\|` separators |
| **Docling** | 187s | 7,947 | Excellent — cleaner column alignment |

Both produce parseable markdown tables from BKP cost breakdowns. PyMuPDF4LLM is **100x faster** and sufficient for text-layer PDFs. Docling reserved for scanned/image-only pages.

Example markdown output (St. Gallen cost table):
```markdown
|**Baukosten**|Vorbereitungsarbeiten|CHF|11 000|
||Gebäude|CHF|457 000|
||Gesamtkosten|CHF|700 000|
|**m3 nach SIA 416**|Gebäudevolumen|m3|2159|
|**CHF/m3 nach SIA 416**|Gebäudekosten (BKP 2)|CHF/m3|212|
```

### Implementation Status

| Phase | Task | Status |
|---|---|---|
| **2a** | Install PyMuPDF4LLM + Docling, `pdf_to_markdown.py` | Done |
| **2b** | Batch convert all 373 PDFs to markdown | In progress |
| **2c** | Stage 2: markdown to structured JSON extraction | Next |
| **2d** | LLM fallback for remaining failures | Planned |

---

## File Layout

```
scripts/
├── download_bbl.sh               ← BBL download script
├── download_armasuisse.sh        ← armasuisse download script
├── download_stadt_zuerich.sh     ← Stadt Zürich download script
├── download_stadt_bern.py        ← Stadt Bern download script
├── download_stadt_stgallen.py    ← Stadt St. Gallen download script
├── download_kanton_aargau.py     ← Kanton Aargau download script
├── pdf_to_markdown.py            ← Stage 1: PDF → Markdown (PyMuPDF4LLM / Docling)
├── extract.py                    ← single PDF → DB upsert (v1 regex)
└── extract_all.py                ← batch wrapper (v1)
data/
├── pdfs/                         ← downloaded PDFs (flat, gitignored)
│   ├── bbl_verwaltung_2023_Zollikofen.pdf
│   ├── armasuisse_militaer_UUID.pdf
│   ├── stadt-zuerich_hochbau_schulanlage.pdf
│   ├── stadt-bern_hochbau_bauflyer.pdf
│   ├── stadt-stgallen_hochbau_142_name.pdf
│   └── kanton-aargau_hochbau_033_name.pdf
├── markdown/                     ← (v2) converted markdown per PDF
├── kennwerte.db                  ← SQLite database
└── pdf_texts.json                ← legacy text cache (deprecated)
assets/
├── images/
│   ├── thumbnails/               ← page-1 JPEG per project (400px wide)
│   └── projects/                 ← all extracted photos per project
```

### File Naming Convention

PDFs stored flat: `{source}_{category}_{original-filename}.pdf`

| Source prefix | Organisation |
|---|---|
| `bbl` | Bundesamt für Bauten und Logistik |
| `armasuisse` | armasuisse Immobilien (VBS) |
| `stadt-zuerich` | Stadt Zürich Hochbaudepartement |
| `stadt-bern` | Hochbau Stadt Bern |
| `stadt-stgallen` | Stadt St. Gallen Hochbauamt |
| `kanton-aargau` | Immobilien Aargau |

---

## Running the Pipeline

### Prerequisites

```bash
# v1 (regex pipeline)
pip install pymupdf pytesseract pillow

# v2 (markdown pipeline)
pip install pymupdf4llm docling

# Windows: install Tesseract from https://github.com/UB-Mannheim/tesseract/wiki
# Tesseract language packs needed: deu, fra, ita
```

### Step 1: Download PDFs

```bash
# Original sources
bash scripts/download_bbl.sh              # BBL (~144 PDFs)
bash scripts/download_armasuisse.sh       # armasuisse (~53 PDFs)
bash scripts/download_stadt_zuerich.sh    # Stadt Zürich (~36 PDFs)

# New sources
python scripts/download_stadt_bern.py     # Stadt Bern (~76 PDFs)
python scripts/download_stadt_stgallen.py # Stadt St. Gallen (~78 PDFs)
python scripts/download_kanton_aargau.py  # Kanton Aargau (~10 PDFs)
```

### Step 2a: Convert to Markdown (v2)

```bash
# Single PDF
python scripts/pdf_to_markdown.py data/pdfs/sample.pdf --verbose

# All PDFs (uses PyMuPDF4LLM, falls back to Docling for failures)
python scripts/pdf_to_markdown.py --all

# Only one source
python scripts/pdf_to_markdown.py --all --source bbl

# Re-convert all (ignore hash cache)
python scripts/pdf_to_markdown.py --all --force
```

### Step 2b: Extract to DB (v1 regex — works on raw text)

```bash
# Single PDF (verbose)
python scripts/extract.py data/pdfs/bbl_verwaltung_2023_Zollikofen.pdf --verbose

# All PDFs
python scripts/extract_all.py

# Only one source
python scripts/extract_all.py --source bbl

# Re-extract everything (ignore hash cache)
python scripts/extract_all.py --force
```

### Step 3: Serve

```bash
python -m http.server 8080
# Open http://localhost:8080
```

---

## extract.py — Processing Flow (v1)

### 1. Identify + Hash Check

- Parse flat filename → source, category, original name
- Detect language from filename suffix (`_FR`, `_IT`, `_DE`)
- Compute SHA-256 hash; skip if unchanged (unless `--force`)

### 2. Extract Text

- Open with PyMuPDF
- Per page: `get_text()` if >50 chars, else Tesseract OCR at 300 DPI
- OCR language selected from filename: `deu`, `fra`, or `ita`

### 3. Normalize Text

- Fix PDF ligatures: `ﬂ` → `fl`, `ﬁ` → `fi`
- Fix split words: `fl äche` → `fläche`
- Merge multi-line BKP tables: `"1 \n Vorbereitungsarbeiten \n 444'000"` → `"1  Vorbereitungsarbeiten  444'000"`
- Handle Unicode quotes: `'` (U+2019) treated as thousands separator

### 4. Extract Structured Data

| Function | Fields | Languages | Key Patterns |
|---|---|---|---|
| `extract_metadata()` | Client, user, architect, planners | DE/FR/IT | Label-after keywords with stop-label detection |
| `extract_quantities()` | GF, GV, NGF, floors, workplaces, energy | DE/FR/IT | Exact + fuzzy fallback patterns, source-specific validation ranges |
| `extract_costs()` | BKP 1-9, 20-29, eBKP-H A-Z | DE | Same-line, colon-separated, and two-line patterns |
| `extract_benchmarks()` | CHF/m² GF, CHF/m³ GV | DE/FR | "BKP 2 / m² GF" + "CFC 2 / m² SP" patterns |
| `extract_index_reference()` | Baukostenindex name, date, value | DE/FR | Baukostenindex + Indice des coûts patterns |
| `extract_timeline()` | Planungsbeginn, Baubeginn, Bauende | DE/FR/IT | Keyword + date, normalized to ISO format |
| `extract_description()` | Project description | DE/FR/IT | Section header detection + longest-paragraph fallback |

### 5. Quality Grade

| Grade | Criteria |
|---|---|
| **A** | BKP 2 costs + GF + metadata (architect or client) |
| **B** | Costs OR GF + metadata or description |
| **C** | Metadata or description only |
| **D** | Filename-only (no extractable text) |
| **E** | Extraction error (corrupt PDF, crash — logged with error message) |

### 6. Geocode + Upsert

- Swiss projects: geo.admin.ch search API (free, WGS84)
- Foreign projects: Geoapify API
- Upsert by `pdf_filename`; UPDATE existing or INSERT new
- Log to `extraction_log` with hash, method, grade, structured `fields_extracted` JSON

---

## Source-Specific Configs

```python
SOURCE_CONFIGS = {
    "bbl":            { "languages": ["deu"],              "layout": "structured_table" },
    "armasuisse":     { "languages": ["deu","fra","ita"],  "layout": "variable" },
    "stadt-zuerich":  { "languages": ["deu"],              "layout": "prose_heavy" },
    "stadt-bern":     { "languages": ["deu"],              "layout": "structured_table" },
    "stadt-stgallen": { "languages": ["deu"],              "layout": "structured_table" },
    "kanton-aargau":  { "languages": ["deu"],              "layout": "structured_table" },
}
```

Each config controls: OCR language selection, validation ranges for GF/GV/costs, and layout hints for future markdown extraction.

---

## Extraction Quality Tracking

### Document Level (`extraction_log`)

| Field | Description |
|---|---|
| `pdf_hash` | SHA-256 (first 16 chars) — skip unchanged PDFs |
| `method` | `pymupdf`, `ocr`, `pymupdf+ocr`, or `error` |
| `quality_grade` | A/B/C/D/E |
| `fields_extracted` | JSON with value + confidence per field |
| `extraction_error` | Error message for Grade E failures |

### Field Confidence

```json
{
  "gf_m2": {"value": 5600.0, "confidence": "high"},
  "cost":  {"value": 11649000, "confidence": "medium"},
  "architect": {"value": "GMT Architekten AG", "confidence": "high"}
}
```

- `high`: regex match on native text layer
- `medium`: regex match on OCR text
- `low`: inferred or fuzzy match

---

## Adding a New Source

1. **Verify cost data** — download 3-5 sample PDFs, check for BKP costs + SIA 416 quantities
2. **Create download script** — `scripts/download_{source}.py`
3. **Register source** in `extract.py`: add to `SOURCES`, `SOURCE_CONFIGS`, `CATEGORY_MAP`, `CANTON_MAP`
4. **Test samples**: `python scripts/extract.py data/pdfs/new_sample.pdf --verbose --dry-run`
5. **Add source-specific patterns** if needed
6. **Batch extract**: `python scripts/extract_all.py --source new-source`
7. **Update [SOURCES.md](SOURCES.md)**

---

## Known Limitations

### Current (v1)

- **Stadt Zürich**: 0% cost extraction — costs in prose paragraphs, not tables
- **armasuisse**: ~49% cost extraction — multi-line tables, variable layouts
- **No BPI adjustment** — costs stored at recorded price levels, not inflation-adjusted
- **No deduplication** across sources
- **Municipality-to-canton mapping** hardcoded for ~70 known municipalities

### Planned Fixes (v2)

- **Docling markdown conversion** → preserves table structure for all sources
- **LLM extraction fallback** → handles prose costs (Stadt Zürich) and layout variance
- **BFS Baupreisindex integration** → inflation-adjusted Kennwerte
- **Cross-source deduplication** → match by location + year + building type
