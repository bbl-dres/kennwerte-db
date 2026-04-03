<p align="center">
  <img src="assets/Social1.jpg" alt="kennwerte-db — PDFs to structured construction cost benchmarks" width="800">
</p>

<h1 align="center">kennwerte-db</h1>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/SQLite-in--browser-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?logo=python&logoColor=white" alt="Python">
  <img src="https://img.shields.io/badge/MapLibre_GL-JS-396CB2?logo=maplibre&logoColor=white" alt="MapLibre GL JS">
  <img src="https://img.shields.io/badge/deploy-GitHub_Pages-222?logo=github&logoColor=white" alt="GitHub Pages">
</p>

<p align="center">
  Open-source construction cost benchmark database for Swiss public buildings.<br>
  Collects, structures, and presents cost Kennwerte (CHF/m² GF, CHF/m³ GV, BKP/eBKP-H breakdowns)<br>
  from realised projects to support early-stage cost estimation and portfolio-level cost analysis.
</p>

<p align="center">
  <a href="https://bbl-dres.github.io/kennwerte-db/"><strong>Live Demo</strong></a>
</p>

<table>
  <tr>
    <td><img src="assets/Preview1.jpg" alt="Gallery view"></td>
    <td><img src="assets/Preview2.jpg" alt="Detail view"></td>
  </tr>
</table>

## Features

- **Gallery, List, Map, Dashboard** — four views for browsing and comparing construction projects
- **Detail view** — SIA 416 volumes/areas, eBKP-H and BKP cost breakdowns, peer comparison box plots, image gallery with lightbox
- **Scatter plot** — GF vs. CHF/m² GF across the full dataset, colored by construction type
- **Filters** — by source, category, canton, construction type, country, data quality, year range, GF range
- **Click-to-filter tags** — click any tag on a card or detail view to filter the dataset
- **Cost estimator** — quick benchmark-based estimates using filtered comparison sets
- **Full-text search** across projects, locations, and architects
- Runs entirely in the browser — no server, no build step

## Data Sources

Data is extracted from publicly available Bautendokumentationen published by Swiss federal, cantonal, and municipal building authorities.

| Source | Organisation | Documents | URL |
|---|---|---|---|
| **BBL** | Bundesamt für Bauten und Logistik | ~144 | [bbl.admin.ch](https://www.bbl.admin.ch/de/bautendokumentationen) |
| **armasuisse** | armasuisse Immobilien (VBS) | ~53 | [ar.admin.ch](https://www.ar.admin.ch/de/bautendokumentationen) |
| **Stadt Zürich** | Hochbaudepartement | ~36 | [stadt-zuerich.ch](https://www.stadt-zuerich.ch/de/aktuell/publikationen.html) |
| **Stadt Bern** | Hochbau Stadt Bern | ~55 | [bern.ch](https://www.bern.ch/politik-und-verwaltung/stadtverwaltung/prd/hochbau-stadt-bern/publikationen) |
| **Stadt St. Gallen** | Hochbauamt | ~78 | [stadt.sg.ch](https://www.stadt.sg.ch/home/raum-umwelt/staedtische-projekte/realisierte-projekte/baudokumentationen.html) |
| **Kanton Aargau** | Immobilien Aargau | ~7 | [ag.ch](https://www.ag.ch/de/themen/planen-bauen/immobilien/immobilienprojekte) |

## Extraction Pipeline

The pipeline converts PDF Bautendokumentationen into structured benchmark data in two stages:

**Stage 1: PDF to Markdown** — Each PDF is converted to clean Markdown using [PyMuPDF4LLM](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/) (for text-layer PDFs) or [Docling](https://github.com/DS4SD/docling) (IBM, for scanned/complex-layout PDFs). This preserves table structure — critical for BKP cost breakdowns — and produces human-readable intermediate files.

**Stage 2: Markdown to structured data** — Markdown tables are parsed to extract BKP/eBKP-H costs, SIA 416 quantities (GF, GV, NGF, HNF), project metadata (architect, client, timeline), and benchmarks (CHF/m², CHF/m³). Multi-language support for German, French, and Italian documents.

The extracted data is loaded into a SQLite database that runs entirely in the browser via [sql.js](https://github.com/sql-js/sql.js).

See [docs/PIPELINE.md](docs/PIPELINE.md) for full technical details.

## Tech Stack

### Frontend

| Library | Purpose | License |
|---|---|---|
| Vanilla JS (ES6+) | Application logic, no framework | — |
| CSS Custom Properties | Design token system | — |
| [sql.js](https://github.com/sql-js/sql.js) | SQLite compiled to WebAssembly, runs in browser | MIT |
| [MapLibre GL JS](https://maplibre.org/) | Interactive vector map with clustering | BSD-3 |
| [Google Material Icons](https://fonts.google.com/icons) | UI iconography | Apache 2.0 |

### Extraction Pipeline

| Library | Purpose | License |
|---|---|---|
| [PyMuPDF](https://pymupdf.readthedocs.io/) | PDF text and image extraction | AGPL |
| [PyMuPDF4LLM](https://pymupdf.readthedocs.io/en/latest/pymupdf4llm/) | PDF to Markdown conversion | AGPL |
| [Docling](https://github.com/DS4SD/docling) | Advanced PDF parsing with table extraction (IBM) | MIT |
| [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) | OCR for scanned pages (DE/FR/IT) | Apache 2.0 |
| [Pillow](https://python-pillow.org/) | Image processing | MIT-like |

### APIs

| Service | Purpose |
|---|---|
| [geo.admin.ch](https://api3.geo.admin.ch/) | Geocoding Swiss addresses (free, no key) |
| [Geoapify](https://www.geoapify.com/) | Geocoding international addresses |
| [CARTO](https://carto.com/) | Base map tiles via MapLibre |

## Project Structure

```
index.html                  Single-page application
css/
  tokens.css                Design tokens (colors, spacing, typography)
  styles.css                Component styles
js/
  db.js                     Database queries
  utils.js                  Shared state, formatting, tag helpers
  views.js                  Gallery, list, map, dashboard renderers
  detail.js                 Detail view, cost tables, carousel, estimator
  main.js                   App init, routing, filters
data/
  kennwerte.db              SQLite database
  pdfs/                     Source PDFs (gitignored)
  markdown/                 Converted markdown (gitignored)
scripts/
  pdf_to_markdown.py        Stage 1: PDF to Markdown
  extract_from_markdown.py  Stage 2: Markdown to structured data
  extract.py                Legacy: direct PDF to DB (v1 regex)
  extract_all.py            Batch wrapper
  download_*.sh/py          Per-source download scripts
docs/
  PIPELINE.md               Extraction pipeline architecture
  DATAMODEL.md              Entity model and field definitions
  SOURCES.md                Data source inventory
  REQUIREMENTS.md           Requirements specification
```

## Documentation

- [PIPELINE.md](docs/PIPELINE.md) — extraction architecture, tool comparison, processing flow
- [DATAMODEL.md](docs/DATAMODEL.md) — entity model, field definitions, SIA 416 quantities
- [SOURCES.md](docs/SOURCES.md) — data source inventory with URLs and status
- [REQUIREMENTS.md](docs/REQUIREMENTS.md) — functional and non-functional requirements

## License

[MIT](LICENSE) — Digital Real Estate and Support
