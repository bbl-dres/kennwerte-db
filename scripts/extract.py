"""
extract.py — Extract structured data from a PDF into kennwerte-db.

Two-stage pipeline:
  Stage 1: PDF → Markdown (via pdf_to_markdown.py)
  Stage 2: Markdown → structured data → DB upsert

Also handles: image extraction, thumbnails, geocoding, quality grading.

Usage:
    python scripts/extract.py data/pdfs/sample.pdf [--force] [--verbose] [--dry-run]
"""

import argparse
import hashlib
import json
import re
import sqlite3
import sys
import time
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

# Ensure sibling scripts are importable regardless of working directory
sys.path.insert(0, str(Path(__file__).parent))
from pdf_to_markdown import convert_pdf as pdf_to_markdown, compute_hash as compute_pdf_hash
from extract_from_markdown import extract_from_markdown

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DB_PATH = Path("data/kennwerte.db")
MD_DIR = Path("data/markdown")
ASSETS_DIR = Path("assets/images")
THUMB_DIR = ASSETS_DIR / "thumbnails"
PHOTOS_DIR = ASSETS_DIR / "projects"

THUMB_WIDTH = 400
PHOTO_MIN_SIZE = 80
PHOTO_QUALITY = 85

SOURCES = {
    "bbl": "Bundesamt für Bauten und Logistik (BBL)",
    "armasuisse": "armasuisse Immobilien (VBS)",
    "stadt-zuerich": "Stadt Zürich, Hochbaudepartement",
    "stadt-bern": "Hochbau Stadt Bern",
    "stadt-stgallen": "Stadt St. Gallen, Hochbauamt",
    "kanton-aargau": "Immobilien Aargau",
}

CATEGORY_MAP = {
    "ausland": ("AUSL", "BOTSCHAFT", "Bauten im Ausland"),
    "bildung": ("FORSCH", "FORSCHUNG", "Bildung und Forschung"),
    "bundeshaus": ("REPR", "REGIERUNG", "Bundeshaus"),
    "justiz": ("GERICHT", "GERICHT", "Justiz und Polizei"),
    "kultur": ("KULT", "MUSEUM", "Kultur und Denkmäler"),
    "parkanlagen": ("INFRA", "HIST", "Parkanlagen und Landwirtschaft"),
    "produktion": ("INFRA", "WERKSTATT", "Produktion und Lager"),
    "sport": ("SPORT", "SPORT", "Sport"),
    "technik": ("INFRA", "VERW", "Technische Anlagen"),
    "verschiedenes": ("ALLG", "VERW", "Verschiedenes"),
    "verwaltung": ("ALLG", "VERW", "Verwaltung"),
    "wohnen": ("ALLG", "WOHNEN", "Wohnen"),
    "zoll": ("ZOLL", "ZOLLANLAGE", "Zoll"),
    "militaer": ("VBS", "KASERNE", "armasuisse / VBS"),
    "hochbau": ("KOMMUN", "VERW", "Kommunale Bauten"),
}

CANTON_MAP = {
    "Bern": "BE", "Biel": "BE", "Ittigen": "BE", "Liebefeld": "BE",
    "Wabern": "BE", "Zollikofen": "BE", "Köniz": "BE", "Heimiswil": "BE",
    "Interlaken": "BE", "Kehrsatz": "BE", "Magglingen": "BE", "Spiez": "BE",
    "Wimmis": "BE", "Thun": "BE",
    "Zürich": "ZH", "Zürich-Fluntern": "ZH", "Zürich-Affoltern": "ZH",
    "Affoltern am Albis": "ZH", "Wädenswil": "ZH", "Winterthur": "ZH",
    "Hinwil": "ZH",
    "Basel": "BS", "Liestal": "BL", "Rheinfelden": "AG", "Windisch": "AG",
    "Wildegg": "AG", "Koblenz": "AG", "Wohlen": "AG",
    "Lausanne": "VD", "Payerne": "VD", "Bière": "VD",
    "Bellinzona": "TI", "Chiasso": "TI", "Tenero": "TI", "Monteceneri": "TI",
    "Isone": "TI",
    "Davos": "GR", "Seelisberg": "UR",
    "Genève": "GE", "Vernier": "GE",
    "Arbon": "TG", "Tänikon": "TG", "Frauenfeld": "TG", "Kreuzlingen": "TG",
    "St. Gallen": "SG", "St.Gallen": "SG",
    "Brig-Glis": "VS", "Sion": "VS",
    "Küssnacht": "SZ",
    "Kriens": "LU", "Emmen": "LU", "Alpnach": "OW",
    "Wangen an der Aare": "BE", "Schwarzenburg": "BE", "Jassbach": "BE",
    "Stans-Oberdorf": "NW", "Wil bei Stans": "NW",
    "Bure": "JU", "Drognens": "FR", "Grolley": "FR",
    "Elm": "GL", "St. Luzisteig": "GR",
    "Brugg": "AG", "Lenzburg": "AG", "Schafisheim": "AG",
    "Eiken": "AG", "Muri": "AG", "Wettingen": "AG",
}

GEOAPIFY_KEY = "10dac95a02d944f1be9e31286bad341d"

# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------

def geocode(municipality, canton=None, country=None, project_name=None, verbose=False):
    if not municipality:
        return None, None
    if country or not canton:
        return _geocode_geoapify(municipality, country, project_name, verbose)
    return _geocode_swiss(municipality, canton, project_name, verbose)


def _geocode_swiss(municipality, canton, project_name=None, verbose=False):
    queries = []
    if project_name:
        parts = (project_name or "").replace("_", " ").split(",")
        for part in parts[:2]:
            part = part.strip()
            if any(k in part.lower() for k in ["neubau", "sanierung", "umbau", "erweiterung",
                                                  "instandsetzung", "restaurierung"]):
                continue
            if re.match(r"^[A-Z].*\d", part):
                queries.append(f"{part} {municipality}")
                break
    queries.append(f"{municipality} {canton}")

    for query in queries:
        try:
            url = f"https://api3.geo.admin.ch/rest/services/api/SearchServer?searchText={urllib.parse.quote(query)}&type=locations&sr=4326&limit=1"
            with urllib.request.urlopen(url, timeout=10) as resp:
                data = json.loads(resp.read())
            results = data.get("results", [])
            if results:
                attrs = results[0]["attrs"]
                lat, lng = attrs.get("lat"), attrs.get("lon")
                if lat and lng:
                    if verbose:
                        print(f"  Geocoded (CH): {query} -> {lat:.5f}, {lng:.5f}")
                    return float(lat), float(lng)
        except Exception as e:
            if verbose:
                print(f"  Geocode error: {e}")
    return None, None


def _geocode_geoapify(municipality, country=None, project_name=None, verbose=False):
    query_parts = [municipality]
    if country:
        query_parts.append(country)
    query = ", ".join(query_parts)
    try:
        url = f"https://api.geoapify.com/v1/geocode/search?text={urllib.parse.quote(query)}&apiKey={GEOAPIFY_KEY}&limit=1"
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
        features = data.get("features", [])
        if features:
            coords = features[0]["geometry"]["coordinates"]
            lng, lat = coords[0], coords[1]
            if verbose:
                print(f"  Geocoded (Geoapify): {query} -> {lat:.5f}, {lng:.5f}")
            return float(lat), float(lng)
    except Exception as e:
        if verbose:
            print(f"  Geocode error: {e}")
    return None, None

# ---------------------------------------------------------------------------
# Filename parsing
# ---------------------------------------------------------------------------

def parse_flat_filename(filename):
    for src in sorted(SOURCES.keys(), key=len, reverse=True):
        prefix = src + "_"
        if filename.startswith(prefix):
            rest = filename[len(prefix):]
            for cat in sorted(CATEGORY_MAP.keys(), key=len, reverse=True):
                cat_prefix = cat + "_"
                if rest.startswith(cat_prefix):
                    return src, cat, rest[len(cat_prefix):]
    return None, None, filename


FILENAME_DATE_RE = re.compile(r"^(\d{8})[_ ](.+?)(?:_(DE|FR|IT))?\.pdf$", re.IGNORECASE)

def parse_filename(original, category):
    m = FILENAME_DATE_RE.match(original)
    if m:
        ds = m.group(1)
        rest = m.group(2).strip()
        year = int(ds[:4])
        completion_date = f"{year:04d}-{int(ds[4:6]):02d}-{int(ds[6:8]):02d}"
    else:
        rest = re.sub(r"(?:_(DE|FR|IT))?\.pdf$", "", original, flags=re.IGNORECASE).strip()
        completion_date, year = None, None

    parts = [p.strip() for p in re.split(r"[,_]", rest) if p.strip()]
    municipality = parts[0] if parts else None
    # Skip numeric-only "municipality" (it's a document number, not a place)
    if municipality and re.match(r"^\d+$", municipality):
        municipality = None
        # Use remaining parts for project name
        parts = parts[1:] if len(parts) > 1 else parts
    country = None
    if category == "ausland" and len(parts) >= 3:
        municipality, country = parts[0], parts[1]
        project_name = ", ".join(parts[2:])
    elif len(parts) >= 2:
        project_name = ", ".join(parts[1:])
    else:
        project_name = rest

    if not project_name or project_name == municipality:
        project_name = rest

    canton = None
    if municipality:
        canton = CANTON_MAP.get(municipality)
        if not canton:
            for key, val in CANTON_MAP.items():
                if key in municipality or municipality in key:
                    canton = val
                    break

    return dict(completion_date=completion_date, completion_year=year,
                municipality=municipality, canton=canton, country=country,
                project_name=project_name if project_name else rest)


def infer_arbeiten_type(name):
    nl = (name or "").lower()
    if any(k in nl for k in ["neubau", "nouvelle construction", "nuova costruzione"]):
        return "NEUBAU"
    if any(k in nl for k in ["erweiterung", "extension", "agrandissement"]):
        return "UMBAU_ERWEITERUNG"
    if any(k in nl for k in ["sanierung", "gesamtsanierung", "instandsetzung",
                              "restaurierung", "renovation", "konservierung", "sicherung",
                              "assainissement", "rénovation", "restauration",
                              "risanamento", "ristrutturazione"]):
        return "UMBAU_SANIERUNG"
    if any(k in nl for k in ["umbau", "umnutzung", "transformation", "trasformazione"]):
        return "UMBAU"
    if any(k in nl for k in ["optimierung", "anpassung", "optimisation", "adaptation"]):
        return "UMBAU"
    return "UMBAU_SANIERUNG"

# ---------------------------------------------------------------------------
# Image extraction
# ---------------------------------------------------------------------------

def extract_images(pdf_path, project_id, verbose=False):
    doc = fitz.open(str(pdf_path))
    images_saved = []

    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    thumb_path = THUMB_DIR / f"{project_id}.jpg"
    try:
        page0 = doc[0]
        zoom = THUMB_WIDTH / page0.rect.width
        pix = page0.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
        img.save(str(thumb_path), "JPEG", quality=PHOTO_QUALITY)
    except Exception as e:
        if verbose:
            print(f"  Thumbnail error: {e}")

    proj_dir = PHOTOS_DIR / str(project_id)
    proj_dir.mkdir(parents=True, exist_ok=True)

    img_count = 0
    for page_num in range(doc.page_count):
        page = doc[page_num]
        for img_info in page.get_images(full=True):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue
                w, h = base_image["width"], base_image["height"]
                if w < PHOTO_MIN_SIZE or h < PHOTO_MIN_SIZE:
                    continue
                img_count += 1
                img_path = proj_dir / f"{img_count:03d}.{base_image['ext']}"
                with open(img_path, "wb") as f:
                    f.write(base_image["image"])
                images_saved.append(str(img_path))
            except Exception:
                continue

    doc.close()
    if verbose:
        print(f"  Images: {img_count} extracted")

    return dict(thumbnail_path=str(thumb_path), images_found=img_count, image_paths=images_saved)

# ---------------------------------------------------------------------------
# Quality grading
# ---------------------------------------------------------------------------

def compute_quality_grade(costs, quantities, metadata, description):
    has_costs = bool(costs and "2" in costs)
    has_gf = "gf_m2" in quantities
    has_meta = bool(metadata.get("client_name") or metadata.get("architect"))
    has_desc = bool(description)

    if has_costs and has_gf and has_meta:
        return "A"
    if (has_costs or has_gf) and (has_meta or has_desc):
        return "B"
    if has_meta or has_desc:
        return "C"
    return "D"

# ---------------------------------------------------------------------------
# DB schema + upsert
# ---------------------------------------------------------------------------

MIGRATION_SQL = """
CREATE TABLE IF NOT EXISTS extraction_log (
    bauprojekt_id   INTEGER PRIMARY KEY REFERENCES bauprojekt(id),
    pdf_hash        TEXT,
    extracted_at    TEXT,
    method          TEXT,
    pages_total     INTEGER,
    pages_with_text INTEGER,
    pages_ocr       INTEGER,
    text_chars      INTEGER,
    images_found    INTEGER,
    thumbnail_path  TEXT,
    quality_grade   TEXT,
    fields_extracted TEXT,
    extraction_error TEXT
);
"""

def ensure_schema(conn):
    cur = conn.cursor()
    cur.executescript(MIGRATION_SQL)
    cols = [r[1] for r in cur.execute("PRAGMA table_info(bauprojekt)")]
    for col, typ in [("thumbnail_path", "TEXT"), ("coord_lat", "REAL"), ("coord_lng", "REAL")]:
        if col not in cols:
            cur.execute(f"ALTER TABLE bauprojekt ADD COLUMN {col} {typ}")
    log_cols = [r[1] for r in cur.execute("PRAGMA table_info(extraction_log)")]
    if "extraction_error" not in log_cols:
        cur.execute("ALTER TABLE extraction_log ADD COLUMN extraction_error TEXT")
    conn.commit()


def should_skip(conn, filename, pdf_hash, force=False):
    if force:
        return False
    row = conn.execute(
        "SELECT pdf_hash FROM extraction_log e JOIN bauprojekt b ON e.bauprojekt_id = b.id WHERE b.pdf_filename = ?",
        (filename,)
    ).fetchone()
    return row and row[0] == pdf_hash


def upsert_project(conn, pdf_filename, source, category, file_info,
                   extracted, image_info, grade, pdf_hash, md_chars):
    cur = conn.cursor()
    cat_info = CATEGORY_MAP.get(category, ("ALLG", "VERW", category))
    client_org = SOURCES.get(source, source)

    costs = extracted["costs"]
    quantities = extracted["quantities"]
    metadata = extracted["metadata"]
    timeline = extracted["timeline"]
    description = extracted["description"]

    arbeiten_type = infer_arbeiten_type(file_info["project_name"])
    if arbeiten_type == "UMBAU_SANIERUNG":
        arbeiten_type = infer_arbeiten_type(pdf_filename)

    total_cost = costs.get("2", {}).get("amount") or costs.get("AK", {}).get("amount")
    thumb = image_info.get("thumbnail_path") if image_info else None

    existing = cur.execute("SELECT id FROM bauprojekt WHERE pdf_filename = ?", (pdf_filename,)).fetchone()

    fields = (
        file_info["project_name"], file_info["municipality"], file_info["canton"],
        file_info["country"], category, cat_info[0], cat_info[1], arbeiten_type,
        file_info["completion_date"], file_info["completion_year"],
        metadata.get("client_name"), client_org, metadata.get("user_org"),
        metadata.get("architect"), metadata.get("general_planner"), metadata.get("general_contractor"),
        description, quantities.get("gf_m2"), quantities.get("gv_m3"), quantities.get("ngf_m2"),
        quantities.get("floors"), quantities.get("workplaces"), quantities.get("energy_standard"),
        total_cost, source, thumb, file_info.get("coord_lat"), file_info.get("coord_lng"),
    )

    if existing:
        pid = existing[0]
        cur.execute("""
            UPDATE bauprojekt SET
                project_name=?, municipality=?, canton=?, country=?, category=?,
                sub_portfolio=?, federal_building_type=?, arbeiten_type=?,
                completion_date=?, completion_year=?, client_name=?, client_org=?,
                user_org=?, architect=?, general_planner=?, general_contractor=?,
                project_description=?, gf_m2=?, gv_m3=?, ngf_m2=?, floors=?,
                workplaces=?, energy_standard=?, construction_cost_total=?,
                data_source=?, thumbnail_path=?, coord_lat=?, coord_lng=?
            WHERE id=?
        """, (*fields, pid))
        for tbl in ["cost_record", "benchmark_extracted", "index_reference", "project_timeline"]:
            cur.execute(f"DELETE FROM {tbl} WHERE bauprojekt_id=?", (pid,))
    else:
        cur.execute("""
            INSERT INTO bauprojekt (
                project_name, municipality, canton, country, category,
                sub_portfolio, federal_building_type, arbeiten_type,
                completion_date, completion_year, client_name, client_org,
                user_org, architect, general_planner, general_contractor,
                project_description, gf_m2, gv_m3, ngf_m2, floors,
                workplaces, energy_standard, construction_cost_total,
                pdf_filename, pdf_category_folder, data_source, thumbnail_path,
                coord_lat, coord_lng
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
        """, (*fields, pdf_filename, category))
        pid = cur.lastrowid

    # Insert cost records
    for code, info in costs.items():
        if code == "AK":
            continue
        cur.execute("INSERT OR IGNORE INTO cost_record (bauprojekt_id, bkp_code, bkp_name, amount_chf) VALUES (?,?,?,?)",
                    (pid, code, info["name"], info["amount"]))

    # Insert timeline
    for ms in timeline:
        cur.execute("INSERT INTO project_timeline (bauprojekt_id, milestone, value) VALUES (?,?,?)",
                    (pid, ms["milestone"], ms["value"]))

    # Extraction log
    log_fields = {}
    if quantities.get("gf_m2"): log_fields["gf_m2"] = quantities["gf_m2"]
    if quantities.get("gv_m3"): log_fields["gv_m3"] = quantities["gv_m3"]
    if total_cost: log_fields["cost"] = total_cost
    if metadata.get("architect"): log_fields["architect"] = metadata["architect"][:50]

    cur.execute("""
        INSERT OR REPLACE INTO extraction_log
        (bauprojekt_id, pdf_hash, extracted_at, method, pages_total,
         pages_with_text, pages_ocr, text_chars, images_found,
         thumbnail_path, quality_grade, fields_extracted, extraction_error)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        pid, pdf_hash, datetime.now().isoformat(),
        "markdown", 0, 0, 0, md_chars,
        image_info.get("images_found", 0) if image_info else 0,
        thumb, grade, json.dumps(log_fields), None
    ))

    conn.commit()
    return pid

# ---------------------------------------------------------------------------
# Main processing
# ---------------------------------------------------------------------------

def process_pdf(pdf_path, force=False, verbose=False, dry_run=False):
    pdf_path = Path(pdf_path)
    if not pdf_path.exists():
        print(f"ERROR: {pdf_path} not found")
        return

    filename = pdf_path.name
    source, category, original = parse_flat_filename(filename)
    if not source:
        print(f"WARNING: Cannot parse source/category from: {filename}")
        source, category = "unknown", "unknown"

    if verbose:
        print(f"\n{'='*60}")
        print(f"Processing: {filename}")
        print(f"  Source: {source}, Category: {category}")

    # Hash-based dedup
    pdf_hash = compute_pdf_hash(pdf_path)
    conn = None
    if not dry_run:
        conn = sqlite3.connect(str(DB_PATH))
        ensure_schema(conn)
        if should_skip(conn, filename, pdf_hash, force):
            conn.close()
            if verbose:
                print(f"  SKIP (unchanged)")
            return

    try:
        # Stage 1: PDF -> Markdown
        md_path, md_method = pdf_to_markdown(pdf_path, force=False, verbose=verbose)
        if not md_path or md_method == "no converter available":
            raise RuntimeError(f"Markdown conversion failed: {md_method}")

        md_text = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
        if verbose:
            print(f"  Markdown: {len(md_text)} chars ({md_method})")

        # Stage 2: Markdown -> structured data
        extracted = extract_from_markdown(str(md_path), verbose=verbose)

        # Parse filename for metadata
        file_info = parse_filename(original, category)

        # Default municipality/canton for sources where filenames don't contain location
        SOURCE_DEFAULTS = {
            "stadt-stgallen": ("St. Gallen", "SG"),
            "stadt-bern": ("Bern", "BE"),
        }
        if not file_info["municipality"] and source in SOURCE_DEFAULTS:
            file_info["municipality"], file_info["canton"] = SOURCE_DEFAULTS[source]

        # Quality grade
        grade = compute_quality_grade(
            extracted["costs"], extracted["quantities"],
            extracted["metadata"], extracted["description"]
        )

        if verbose:
            print(f"  Grade: {grade}")
            print(f"  Costs: {sorted(extracted['costs'].keys()) or '-'}")
            print(f"  GF: {extracted['quantities'].get('gf_m2', '-')}")
            total = extracted['costs'].get('2', extracted['costs'].get('AK', {})).get('amount')
            if total:
                print(f"  Total cost: CHF {total:,.0f}")

        # Geocode
        lat, lng = geocode(
            municipality=file_info.get("municipality"),
            canton=file_info.get("canton"),
            country=file_info.get("country"),
            project_name=file_info.get("project_name"),
            verbose=verbose,
        )
        file_info["coord_lat"] = lat
        file_info["coord_lng"] = lng

        if dry_run:
            print(f"  [DRY RUN] grade={grade}")
            return

        # Extract images from PDF (use temp_id, rename after upsert if needed)
        existing = conn.execute("SELECT id FROM bauprojekt WHERE pdf_filename=?", (filename,)).fetchone()
        temp_id = existing[0] if existing else (conn.execute("SELECT MAX(id) FROM bauprojekt").fetchone()[0] or 0) + 1

        image_info = extract_images(str(pdf_path), temp_id, verbose=verbose)

        # DB upsert
        pid = upsert_project(conn, filename, source, category, file_info,
                             extracted, image_info, grade, pdf_hash, len(md_text))

        # Rename image dirs if temp_id != pid
        if temp_id != pid:
            for old, new in [(THUMB_DIR / f"{temp_id}.jpg", THUMB_DIR / f"{pid}.jpg"),
                             (PHOTOS_DIR / str(temp_id), PHOTOS_DIR / str(pid))]:
                if old.exists() and not new.exists():
                    old.rename(new)

        conn.close()

        cost_codes = sorted(k for k in extracted["costs"] if k != "AK")
        print(f"  [{grade}] {file_info['project_name'][:50]}  "
              f"(costs:{','.join(cost_codes) or '-'}, "
              f"GF:{extracted['quantities'].get('gf_m2', '-')}, "
              f"{image_info['images_found']} images)")

    except Exception as e:
        print(f"  [E] ERROR: {e}")
        if not dry_run:
            try:
                conn = sqlite3.connect(str(DB_PATH))
                ensure_schema(conn)
                existing = conn.execute("SELECT id FROM bauprojekt WHERE pdf_filename=?", (filename,)).fetchone()
                if existing:
                    pid = existing[0]
                else:
                    file_info = parse_filename(original, category)
                    cat_info = CATEGORY_MAP.get(category, ("ALLG", "VERW", category))
                    conn.execute("""
                        INSERT INTO bauprojekt (project_name, municipality, canton, country, category,
                            sub_portfolio, federal_building_type, arbeiten_type,
                            pdf_filename, pdf_category_folder, data_source)
                        VALUES (?,?,?,?,?,?,?,?,?,?,?)
                    """, (file_info["project_name"], file_info.get("municipality"), file_info.get("canton"),
                          file_info.get("country"), category, cat_info[0], cat_info[1],
                          infer_arbeiten_type(file_info["project_name"]),
                          filename, category, source))
                    pid = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
                conn.execute("""
                    INSERT OR REPLACE INTO extraction_log
                    (bauprojekt_id, pdf_hash, extracted_at, method, quality_grade, extraction_error)
                    VALUES (?,?,?,?,?,?)
                """, (pid, pdf_hash, datetime.now().isoformat(), "error", "E", str(e)[:500]))
                conn.commit()
                conn.close()
            except Exception as db_err:
                print(f"  [E] Failed to log error: {db_err}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract data from PDF into kennwerte-db")
    parser.add_argument("pdf", help="Path to PDF file")
    parser.add_argument("--force", action="store_true", help="Re-extract even if hash matches")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--dry-run", action="store_true", help="Preview without DB writes")
    args = parser.parse_args()

    process_pdf(args.pdf, force=args.force, verbose=args.verbose, dry_run=args.dry_run)
