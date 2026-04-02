"""
extract.py — Single-PDF extraction: text (+ OCR), images, structured data → DB upsert.

Usage:
    python scripts/extract.py path/to/file.pdf [--force] [--verbose] [--dry-run]
"""

import argparse
import hashlib
import json
import os
import re
import sqlite3
import sys
import urllib.request
import urllib.parse
from datetime import datetime
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

# Optional OCR
try:
    import pytesseract
    # Auto-detect Tesseract on Windows
    import shutil
    if not shutil.which("tesseract"):
        for p in [r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                  r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"]:
            if os.path.exists(p):
                pytesseract.pytesseract.tesseract_cmd = p
                break
    HAS_TESSERACT = True
    try:
        pytesseract.get_tesseract_version()
    except Exception:
        HAS_TESSERACT = False
except ImportError:
    HAS_TESSERACT = False

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
DB_PATH = Path("data/kennwerte.db")
ASSETS_DIR = Path("assets/images")
THUMB_DIR = ASSETS_DIR / "thumbnails"
PHOTOS_DIR = ASSETS_DIR / "projects"

THUMB_WIDTH = 400
PHOTO_MIN_SIZE = 80  # skip images smaller than this
PHOTO_QUALITY = 85

SOURCES = {
    "bbl": "Bundesamt für Bauten und Logistik (BBL)",
    "armasuisse": "armasuisse Immobilien (VBS)",
    "stadt-zuerich": "Stadt Zürich, Hochbaudepartement",
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
    "hochbau": ("KOMMUN", "VERW", "Stadt Zürich"),
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
    "Wildegg": "AG", "Koblenz": "AG",
    "Lausanne": "VD", "Payerne": "VD",
    "Bellinzona": "TI", "Chiasso": "TI", "Tenero": "TI", "Monteceneri": "TI",
    "Davos": "GR", "Seelisberg": "UR",
    "Genève": "GE", "Vernier": "GE",
    "Arbon": "TG", "Tänikon": "TG", "Frauenfeld": "TG", "Kreuzlingen": "TG",
    "St. Gallen": "SG", "Brig-Glis": "VS", "Küssnacht": "SZ",
    "Kriens": "LU", "Emmen": "LU", "Alpnach": "OW",
    "Wangen an der Aare": "BE", "Schwarzenburg": "BE", "Jassbach": "BE",
    "Stans-Oberdorf": "NW", "Wil bei Stans": "NW",
    "Bure": "JU", "Drognens": "FR", "Grolley": "FR",
    "Bière": "VD", "Sion": "VS", "Isone": "TI",
    "Elm": "GL", "St. Luzisteig": "GR",
}

BKP_NAMES = {
    "1": "Vorbereitungsarbeiten", "2": "Gebäude",
    "3": "Betriebseinrichtungen", "4": "Umgebung",
    "5": "Baunebenkosten", "9": "Ausstattung",
    "20": "Baugrube", "21": "Rohbau 1", "22": "Rohbau 2",
    "23": "Elektroanlagen", "24": "HLKK-Anlagen",
    "25": "Sanitäranlagen", "26": "Transportanlagen",
    "27": "Ausbau 1", "28": "Ausbau 2", "29": "Honorare",
}

EBKPH_NAMES = {
    "A": "Grundstück", "B": "Vorbereitung",
    "C": "Konstruktion Gebäude", "D": "Technik Gebäude",
    "E": "Äussere Wandbekleidung Gebäude", "F": "Bedachung Gebäude",
    "G": "Ausbau Gebäude", "H": "Nutzungsspez. Anlage Gebäude",
    "I": "Umgebung Gebäude", "J": "Ausstattung Gebäude",
    "V": "Planungskosten", "W": "Nebenkosten zu Erstellung",
    "Y": "Reserve, Teuerung", "Z": "Mehrwertsteuer",
}

GEOAPIFY_KEY = "10dac95a02d944f1be9e31286bad341d"

# ---------------------------------------------------------------------------
# Geocoding
# ---------------------------------------------------------------------------

def geocode(municipality, canton=None, country=None, project_name=None, verbose=False):
    """Geocode a project location. Returns (lat, lng) or (None, None).
    Swiss projects use geo.admin.ch; foreign projects use Geoapify."""
    if not municipality:
        return None, None

    # Foreign project → Geoapify
    if country or not canton:
        return _geocode_geoapify(municipality, country, project_name, verbose)

    # Swiss project → geo.admin.ch
    return _geocode_swiss(municipality, canton, project_name, verbose)


def _geocode_swiss(municipality, canton, project_name=None, verbose=False):
    """Geocode via geo.admin.ch search API (free, no key needed, WGS84)."""
    # Try with project-specific address first, fall back to municipality
    queries = []
    if project_name:
        # Extract street-like parts from project name
        parts = (project_name or "").replace("_", " ").split(",")
        for part in parts[:2]:
            part = part.strip()
            # Skip generic words
            if any(k in part.lower() for k in ["neubau", "sanierung", "umbau", "erweiterung",
                                                  "instandsetzung", "restaurierung"]):
                continue
            if re.match(r"^[A-Z].*\d", part):  # looks like "Eichenweg 5"
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
                        print(f"  Geocoded (CH): {query} → {lat:.5f}, {lng:.5f}")
                    return float(lat), float(lng)
        except Exception as e:
            if verbose:
                print(f"  Geocode error (CH): {e}")

    return None, None


def _geocode_geoapify(municipality, country=None, project_name=None, verbose=False):
    """Geocode via Geoapify (free tier, for non-Swiss projects)."""
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
            coords = features[0]["geometry"]["coordinates"]  # [lng, lat]
            lng, lat = coords[0], coords[1]
            if verbose:
                print(f"  Geocoded (Geoapify): {query} → {lat:.5f}, {lng:.5f}")
            return float(lat), float(lng)
    except Exception as e:
        if verbose:
            print(f"  Geocode error (Geoapify): {e}")

    return None, None

# ---------------------------------------------------------------------------
# Number / filename parsing
# ---------------------------------------------------------------------------

def parse_swiss_number(s):
    if not s:
        return None
    s = s.replace("\u2009", "").replace("\u00a0", "")
    s = s.replace("\u2019", "").replace("'", "").replace("\u0027", "")
    s = re.sub(r"\s+", "", s)
    s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


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

    # Split on comma or underscore (originals used ", " which became "_" in flat rename)
    parts = [p.strip() for p in re.split(r"[,_]", rest) if p.strip()]
    municipality = parts[0] if parts else None
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
                project_name=project_name)


def infer_arbeiten_type(name):
    nl = (name or "").lower()
    if "neubau" in nl: return "NEUBAU"
    if "erweiterung" in nl: return "UMBAU_ERWEITERUNG"
    if any(k in nl for k in ["sanierung", "gesamtsanierung", "instandsetzung",
                              "restaurierung", "renovation", "konservierung", "sicherung"]):
        return "UMBAU_SANIERUNG"
    if "umbau" in nl or "umnutzung" in nl: return "UMBAU"
    if "optimierung" in nl or "anpassung" in nl: return "UMBAU"
    return "UMBAU_SANIERUNG"

# ---------------------------------------------------------------------------
# Text extraction (PyMuPDF + optional Tesseract OCR)
# ---------------------------------------------------------------------------

def extract_text_from_pdf(pdf_path, verbose=False):
    """Extract text from ALL pages. OCR image-only pages if Tesseract is available."""
    doc = fitz.open(pdf_path)
    pages_total = doc.page_count
    page_texts = []
    pages_with_text = 0
    pages_ocr = 0
    method = "pymupdf"

    for i in range(pages_total):
        page = doc[i]
        text = page.get_text()

        if len(text.strip()) > 50:
            page_texts.append(text)
            pages_with_text += 1
        elif HAS_TESSERACT:
            # OCR this page
            if verbose:
                print(f"  Page {i+1}/{pages_total}: OCR...", end="", flush=True)
            pix = page.get_pixmap(dpi=300)
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            try:
                ocr_text = pytesseract.image_to_string(img, lang="deu")
                if len(ocr_text.strip()) > 20:
                    page_texts.append(ocr_text)
                    pages_ocr += 1
                    method = "pymupdf+ocr"
                    if verbose:
                        print(f" {len(ocr_text)} chars")
                elif verbose:
                    print(" (empty)")
            except Exception as e:
                if verbose:
                    print(f" ERROR: {e}")
        else:
            page_texts.append("")  # placeholder

    doc.close()

    if pages_with_text == 0 and pages_ocr > 0:
        method = "ocr"

    full_text = "\n".join(page_texts)
    return dict(
        text=full_text,
        pages_total=pages_total,
        pages_with_text=pages_with_text,
        pages_ocr=pages_ocr,
        text_chars=len(full_text),
        method=method,
    )

# ---------------------------------------------------------------------------
# Image extraction
# ---------------------------------------------------------------------------

def extract_images(pdf_path, project_id, verbose=False):
    """Extract all embedded images + page-1 thumbnail."""
    doc = fitz.open(pdf_path)
    images_saved = []

    # Page 1 thumbnail
    THUMB_DIR.mkdir(parents=True, exist_ok=True)
    thumb_path = THUMB_DIR / f"{project_id}.jpg"
    page0 = doc[0]
    zoom = THUMB_WIDTH / page0.rect.width
    pix = page0.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    img.save(str(thumb_path), "JPEG", quality=PHOTO_QUALITY)
    if verbose:
        print(f"  Thumbnail: {thumb_path} ({pix.width}x{pix.height})")

    # Extract all embedded images
    proj_dir = PHOTOS_DIR / str(project_id)
    proj_dir.mkdir(parents=True, exist_ok=True)

    img_count = 0
    for page_num in range(doc.page_count):
        page = doc[page_num]
        image_list = page.get_images(full=True)

        for img_idx, img_info in enumerate(image_list):
            xref = img_info[0]
            try:
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue
                w, h = base_image["width"], base_image["height"]
                if w < PHOTO_MIN_SIZE or h < PHOTO_MIN_SIZE:
                    continue

                img_bytes = base_image["image"]
                ext = base_image["ext"]
                img_count += 1
                img_filename = f"{img_count:03d}.{ext}"
                img_path = proj_dir / img_filename

                with open(img_path, "wb") as f:
                    f.write(img_bytes)
                images_saved.append(str(img_path))
            except Exception:
                continue

    doc.close()

    if verbose:
        print(f"  Images: {img_count} extracted to {proj_dir}/")

    return dict(
        thumbnail_path=str(thumb_path),
        images_found=img_count,
        image_paths=images_saved,
    )

# ---------------------------------------------------------------------------
# Structured data extraction (from build_db.py, improved)
# ---------------------------------------------------------------------------

def extract_field_after_label(text, labels, stop_labels=None):
    if stop_labels is None:
        stop_labels = [
            "Bauherrschaft", "Nutzer", "Architekten", "Architekt",
            "Architektur", "Generalplaner", "Generalunternehmer",
            "Generalunternehmung", "Fachplaner", "Bauingenieur",
            "Elektro", "HLKK", "HLK", "Text", "Fotografie",
            "Grundmengen", "Kosten", "Termine", "Ausgangslage",
            "Projektbeschrieb", "Denkmalpflege",
        ]
    for label in labels:
        pattern = re.compile(
            rf"(?:^|\n)\s*{re.escape(label)}\s*\n(.*?)(?=\n\s*(?:{'|'.join(re.escape(sl) for sl in stop_labels)})\s*\n|\Z)",
            re.DOTALL
        )
        m = pattern.search(text)
        if m:
            lines = [l.strip() for l in m.group(1).strip().split("\n") if l.strip()]
            result = []
            for line in lines[:4]:
                if len(line) > 3 and not re.match(r"^\d+$", line):
                    result.append(line)
                else:
                    break
            if result:
                return " ".join(result)
    return None


def extract_metadata(text):
    return dict(
        client_name=extract_field_after_label(text, ["Bauherrschaft", "Maître de l'ouvrage", "Committente"]),
        user_org=extract_field_after_label(text, ["Nutzer", "Utilisateur"]),
        architect=extract_field_after_label(text, ["Architektur", "Architekten", "Architekt", "Architecture"]),
        general_planner=extract_field_after_label(text, ["Generalplaner", "Generalplanerteam"]),
        general_contractor=extract_field_after_label(text, ["Generalunternehmer", "Generalunternehmung", "Totalunternehmer"]),
    )


def extract_quantities(text):
    q = {}
    for pat in [r"Geschossfl.che\s+(?:Total\s+)?([\d\s']+)\s*m[2²]",
                r"Geschossfl.che\s+(?:GF\s+)?([\d\s']+)\s*m[2²]",
                r"GF\s*(?:SIA\s*416)?\s*:?\s*([\d\s']+)\s*m[2²]"]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = parse_swiss_number(m.group(1))
            if val and val < 500_000:
                q["gf_m2"] = val
            break

    for pat in [r"Geb.udevolumen\s+([\d\s']+)\s*m[3³]",
                r"GV\s*(?:SIA\s*416)?\s*:?\s*([\d\s']+)\s*m[3³]",
                r"Umbauter\s+Raum\s+([\d\s']+)\s*m[3³]"]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            q["gv_m3"] = parse_swiss_number(m.group(1))
            break

    m = re.search(r"Nettogeschossfl.che\s+([\d\s']+)\s*m[2²]", text, re.IGNORECASE)
    if m:
        q["ngf_m2"] = parse_swiss_number(m.group(1))

    m = re.search(r"Geschosse\s*\n?\s*(\d+)", text)
    if m:
        q["floors"] = int(m.group(1))

    for pat in [r"Arbeitspl.tze\s*\n?\s*([\d\s']+)", r"([\d\s']+)\s*Arbeitspl.tze"]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = parse_swiss_number(m.group(1))
            if val and val < 50000:
                q["workplaces"] = int(val)
                break

    for std in ["MINERGIE-P-ECO", "MINERGIE-ECO", "MINERGIE-P", "MINERGIE-A", "MINERGIE"]:
        if std.lower() in text.lower():
            q["energy_standard"] = std
            break

    return q


def extract_costs(text):
    costs = {}
    lines = text.split("\n")
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        # Same-line: "2 Gebäude  63 572 000"
        m = re.match(r"^(\d{1,2})\s{1,}([A-Za-zÄÖÜäöüéèêàáâïîôûùë\s\-/&().]+?)\s{2,}([\d\s']{3,})$", line)
        if m:
            code, name, amount = m.group(1).strip(), m.group(2).strip(), parse_swiss_number(m.group(3))
            if code in BKP_NAMES and amount:
                if (code == "2" and 10000 <= amount <= 500_000_000) or \
                   (code != "2" and 1000 <= amount <= 200_000_000):
                    costs[code] = {"name": name, "amount": amount}
            continue
        # Two-line: code+name on this line, number on next
        m2 = re.match(r"^(\d{1,2})\s+([A-Za-zÄÖÜäöüéèêàáâïîôûùëHLKSV\s\-/&().]+?)\s*$", line)
        if m2 and i + 1 < len(lines):
            code, name = m2.group(1).strip(), m2.group(2).strip()
            nxt = lines[i + 1].strip()
            if re.match(r"^[\d\s']+$", nxt) and len(nxt) >= 3:
                amount = parse_swiss_number(nxt)
                if code in BKP_NAMES and amount:
                    if (code == "2" and 10000 <= amount <= 500_000_000) or \
                       (code != "2" and 1000 <= amount <= 200_000_000):
                        costs[code] = {"name": name, "amount": amount}

    ak = re.search(r"Anlagekosten\s*\n?\s*([\d\s']+?)(?:\s*\n|\s*$)", text, re.MULTILINE)
    if ak:
        val = parse_swiss_number(ak.group(1))
        if val and 10000 <= val <= 500_000_000:
            costs["AK"] = {"name": "Anlagekosten", "amount": val}

    # eBKP-H letter codes (A-Z): "C  Konstruktion Gebäude  221'530"
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
        m = re.match(r"^([A-Z])\s{2,}([A-Za-zÄÖÜäöüéèêàáâïîôûùë\s\-/.&()]+?)\s{2,}([\d\s']{3,})$", line)
        if m:
            code, name, amount = m.group(1), m.group(2).strip(), parse_swiss_number(m.group(3))
            if code in EBKPH_NAMES and amount and 100 <= amount <= 500_000_000:
                costs[code] = {"name": name, "amount": amount}

    return costs


def extract_benchmarks(text):
    benchmarks = []
    lines = text.split("\n")
    for i, line in enumerate(lines):
        ls = line.strip()
        for pat, btype in [
            (r"BKP\s*2\s*/\s*m[2²]\s*GF\s+([\d\s']+)", "CHF/m2_GF_BKP2"),
            (r"BKP\s*2\s*/\s*m[3³]\s*GV\s+([\d\s']+)", "CHF/m3_GV_BKP2"),
            (r"BKP2/m[2²]\s*GF\s+([\d\s']+)", "CHF/m2_GF_BKP2"),
            (r"BKP2/m[3³]\s*GV\s+([\d\s']+)", "CHF/m3_GV_BKP2"),
        ]:
            m = re.match(pat, ls, re.IGNORECASE)
            if m:
                val = parse_swiss_number(m.group(1))
                if val and 50 < val < 50000:
                    benchmarks.append({"type": btype, "value": val, "label": ls[:100]})
                break
        # Two-line variant
        for pat, btype in [
            (r"BKP\s*2\s*/\s*m[2²]\s*GF\s*$", "CHF/m2_GF_BKP2"),
            (r"BKP\s*2\s*/\s*m[3³]\s*GV\s*$", "CHF/m3_GV_BKP2"),
            (r"BKP2/m[2²]\s*GF\s*$", "CHF/m2_GF_BKP2"),
            (r"BKP2/m[3³]\s*GV\s*$", "CHF/m3_GV_BKP2"),
        ]:
            m = re.match(pat, ls, re.IGNORECASE)
            if m and i + 1 < len(lines):
                nxt = lines[i + 1].strip()
                if re.match(r"^[\d\s']+$", nxt):
                    val = parse_swiss_number(nxt)
                    if val and 50 < val < 50000:
                        benchmarks.append({"type": btype, "value": val, "label": f"{ls} {nxt}"})
                break
    # Deduplicate
    seen = set()
    return [b for b in benchmarks if b["type"] not in seen and not seen.add(b["type"])]


def extract_index_reference(text):
    for pat in [
        re.compile(r"((?:Zürcher\s+)?Bau(?:kosten|preis)index[^,\n]*?),?\s+(\w+\s+\d{4})\s+(\d[\d.,]*)", re.I),
        re.compile(r"((?:Zürcher\s+)?Bau(?:kosten|preis)index[^,\n]*?)\s*\n\s*.*?(\w+\s+\d{4})\s+(\d[\d.,]*)", re.I),
    ]:
        m = pat.search(text)
        if m:
            info = {"index_name": m.group(1).strip(), "index_date": m.group(2).strip(),
                    "index_value": parse_swiss_number(m.group(3))}
            bm = re.search(r"Basis\s+(\w+\s+\d{4})\s+(\d[\d.,]*)", text, re.I)
            if bm:
                info["basis_date"] = bm.group(1).strip()
                info["basis_value"] = parse_swiss_number(bm.group(2))
            return info
    return None


def extract_timeline(text):
    milestones = []
    for name, pat in [
        ("planungsbeginn", r"Planungsbeginn\s+(.+?)(?:\n|$)"),
        ("wettbewerb", r"(?:Projektwettbewerb|Wettbewerb)\s+(.+?)(?:\n|$)"),
        ("baubeginn", r"Baubeginn\s+(.+?)(?:\n|$)"),
        ("bauende", r"(?:Bauende|Bezug|Übergabe|Fertigstellung)\s+(.+?)(?:\n|$)"),
        ("bauzeit_monate", r"Bauzeit\s+(\d+)\s*Monate"),
    ]:
        m = re.search(pat, text, re.I)
        if m:
            val = m.group(1).strip()
            if val and len(val) < 100:
                milestones.append({"milestone": name, "value": val})
    return milestones


def extract_description(text):
    for header in ["Ausgangslage", "Projektbeschrieb", "Projektbeschreibung"]:
        idx = text.find(header)
        if idx >= 0:
            after = text[idx + len(header):]
            lines = after.split("\n")
            desc_lines, started = [], False
            for line in lines:
                line = line.strip()
                if not line:
                    if started and desc_lines:
                        break
                    continue
                if len(line) > 40:
                    started = True
                    desc_lines.append(line)
                elif started:
                    desc_lines.append(line)
            if desc_lines:
                return " ".join(desc_lines)[:2000]
    # Fallback: longest paragraph
    best = ""
    for p in re.split(r"\n\s*\n", text):
        p = p.strip()
        if len(p) > len(best) and len(p) > 100:
            best = p
    return best[:2000] if best else None


def compute_quality_grade(meta, quant, costs, description):
    has_costs = bool(costs and any(k != "AK" for k in costs))
    has_gf = quant.get("gf_m2") is not None
    has_gv = quant.get("gv_m3") is not None
    has_meta = any([meta.get("client_name"), meta.get("architect")])
    has_desc = bool(description)

    if has_costs and has_gf and has_gv and has_meta:
        return "A"
    if (has_costs or has_gf) and (has_meta or has_desc):
        return "B"
    if has_meta or has_desc:
        return "C"
    return "D"

# ---------------------------------------------------------------------------
# DB upsert
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
    fields_extracted TEXT
);
"""


def ensure_schema(conn):
    cur = conn.cursor()
    cur.executescript(MIGRATION_SQL)
    cols = [r[1] for r in cur.execute("PRAGMA table_info(bauprojekt)")]
    if "thumbnail_path" not in cols:
        cur.execute("ALTER TABLE bauprojekt ADD COLUMN thumbnail_path TEXT")
    if "coord_lat" not in cols:
        cur.execute("ALTER TABLE bauprojekt ADD COLUMN coord_lat REAL")
    if "coord_lng" not in cols:
        cur.execute("ALTER TABLE bauprojekt ADD COLUMN coord_lng REAL")
    conn.commit()


def upsert_project(conn, pdf_filename, source, category, file_info, meta, quant,
                   costs, benchmarks, index_ref, timeline, description,
                   text_info, image_info, quality_grade):
    cur = conn.cursor()
    cat_info = CATEGORY_MAP.get(category, ("ALLG", "VERW", category))
    client_org = SOURCES.get(source, source)

    arbeiten_type = infer_arbeiten_type(file_info["project_name"])
    if arbeiten_type == "UMBAU_SANIERUNG":
        arbeiten_type = infer_arbeiten_type(pdf_filename)

    total_cost = costs.get("2", {}).get("amount") or costs.get("AK", {}).get("amount")
    thumb = image_info.get("thumbnail_path") if image_info else None

    # Check if exists
    existing = cur.execute("SELECT id FROM bauprojekt WHERE pdf_filename = ?", (pdf_filename,)).fetchone()

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
        """, (
            file_info["project_name"], file_info["municipality"], file_info["canton"],
            file_info["country"], category, cat_info[0], cat_info[1], arbeiten_type,
            file_info["completion_date"], file_info["completion_year"],
            meta.get("client_name"), client_org, meta.get("user_org"),
            meta.get("architect"), meta.get("general_planner"), meta.get("general_contractor"),
            description, quant.get("gf_m2"), quant.get("gv_m3"), quant.get("ngf_m2"),
            quant.get("floors"), quant.get("workplaces"), quant.get("energy_standard"),
            total_cost, source, thumb, file_info.get("coord_lat"), file_info.get("coord_lng"), pid
        ))
        # Clear old related records
        cur.execute("DELETE FROM cost_record WHERE bauprojekt_id=?", (pid,))
        cur.execute("DELETE FROM benchmark_extracted WHERE bauprojekt_id=?", (pid,))
        cur.execute("DELETE FROM index_reference WHERE bauprojekt_id=?", (pid,))
        cur.execute("DELETE FROM project_timeline WHERE bauprojekt_id=?", (pid,))
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
        """, (
            file_info["project_name"], file_info["municipality"], file_info["canton"],
            file_info["country"], category, cat_info[0], cat_info[1], arbeiten_type,
            file_info["completion_date"], file_info["completion_year"],
            meta.get("client_name"), client_org, meta.get("user_org"),
            meta.get("architect"), meta.get("general_planner"), meta.get("general_contractor"),
            description, quant.get("gf_m2"), quant.get("gv_m3"), quant.get("ngf_m2"),
            quant.get("floors"), quant.get("workplaces"), quant.get("energy_standard"),
            total_cost, pdf_filename, category, source, thumb,
            file_info.get("coord_lat"), file_info.get("coord_lng"),
        ))
        pid = cur.lastrowid

    # Insert costs
    for code, info in costs.items():
        if code == "AK":
            continue
        cur.execute("INSERT OR IGNORE INTO cost_record (bauprojekt_id, bkp_code, bkp_name, amount_chf) VALUES (?,?,?,?)",
                    (pid, code, info["name"], info["amount"]))

    # Benchmarks
    for bm in benchmarks:
        cur.execute("INSERT INTO benchmark_extracted (bauprojekt_id, benchmark_type, value, label) VALUES (?,?,?,?)",
                    (pid, bm["type"], bm["value"], bm["label"]))

    # Index
    if index_ref:
        cur.execute("INSERT INTO index_reference (bauprojekt_id, index_name, index_date, index_value, basis_date, basis_value) VALUES (?,?,?,?,?,?)",
                    (pid, index_ref.get("index_name"), index_ref.get("index_date"),
                     index_ref.get("index_value"), index_ref.get("basis_date"), index_ref.get("basis_value")))

    # Timeline
    for ms in timeline:
        cur.execute("INSERT INTO project_timeline (bauprojekt_id, milestone, value) VALUES (?,?,?)",
                    (pid, ms["milestone"], ms["value"]))

    # Extraction log
    fields = {}
    if quant.get("gf_m2"): fields["gf_m2"] = "high"
    if quant.get("gv_m3"): fields["gv_m3"] = "high"
    if total_cost: fields["cost"] = "high"
    if meta.get("architect"): fields["architect"] = "high"
    if meta.get("client_name"): fields["client"] = "high"
    if description: fields["description"] = "high"

    pdf_hash = hashlib.sha256(Path(pdf_filename).read_bytes() if Path(pdf_filename).exists()
                              else pdf_filename.encode()).hexdigest()[:16]

    cur.execute("""
        INSERT OR REPLACE INTO extraction_log
        (bauprojekt_id, pdf_hash, extracted_at, method, pages_total,
         pages_with_text, pages_ocr, text_chars, images_found,
         thumbnail_path, quality_grade, fields_extracted)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
    """, (
        pid, pdf_hash, datetime.now().isoformat(),
        text_info["method"], text_info["pages_total"],
        text_info["pages_with_text"], text_info["pages_ocr"],
        text_info["text_chars"], image_info.get("images_found", 0) if image_info else 0,
        thumb, quality_grade, json.dumps(fields)
    ))

    conn.commit()
    return pid

# ---------------------------------------------------------------------------
# Main
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

    # 1. Extract text
    text_info = extract_text_from_pdf(str(pdf_path), verbose=verbose)
    text = text_info["text"]

    if verbose:
        print(f"  Text: {text_info['text_chars']} chars, "
              f"{text_info['pages_with_text']}/{text_info['pages_total']} text pages, "
              f"{text_info['pages_ocr']} OCR pages, method={text_info['method']}")

    # 2. Parse filename
    file_info = parse_filename(original, category)

    # 3. Parse structured data
    has_text = len(text.strip()) > 50
    meta = extract_metadata(text) if has_text else {}
    quant = extract_quantities(text) if has_text else {}
    costs = extract_costs(text) if has_text else {}
    benchmarks = extract_benchmarks(text) if has_text else []
    index_ref = extract_index_reference(text) if has_text else None
    timeline = extract_timeline(text) if has_text else []
    description = extract_description(text) if has_text else None

    # 4. Quality grade
    grade = compute_quality_grade(meta, quant, costs, description)

    if verbose:
        print(f"  Grade: {grade}")
        print(f"  Name: {file_info['project_name']}")
        print(f"  Location: {file_info['municipality']} {file_info['canton'] or ''}")
        if quant.get("gf_m2"): print(f"  GF: {quant['gf_m2']:,.0f} m²")
        if quant.get("gv_m3"): print(f"  GV: {quant['gv_m3']:,.0f} m³")
        total = costs.get("2", {}).get("amount") or costs.get("AK", {}).get("amount")
        if total: print(f"  Cost: CHF {total:,.0f}")
        bkp_codes = [k for k in costs if k != "AK"]
        if bkp_codes: print(f"  BKP codes: {', '.join(sorted(bkp_codes))}")
        if meta.get("architect"): print(f"  Architect: {meta['architect'][:50]}")

    # 5. Geocode
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
        print(f"  [DRY RUN] Would upsert to DB")
        return

    # 6. Extract images
    conn = sqlite3.connect(str(DB_PATH))
    ensure_schema(conn)

    # Get or create project ID for image paths
    existing = conn.execute("SELECT id FROM bauprojekt WHERE pdf_filename=?", (filename,)).fetchone()
    temp_id = existing[0] if existing else (conn.execute("SELECT MAX(id) FROM bauprojekt").fetchone()[0] or 0) + 1

    image_info = extract_images(str(pdf_path), temp_id, verbose=verbose)

    # 6. Upsert
    pid = upsert_project(conn, filename, source, category, file_info, meta, quant,
                         costs, benchmarks, index_ref, timeline, description,
                         text_info, image_info, grade)

    # If temp_id != pid, rename image directories
    if temp_id != pid:
        old_thumb = THUMB_DIR / f"{temp_id}.jpg"
        new_thumb = THUMB_DIR / f"{pid}.jpg"
        if old_thumb.exists():
            old_thumb.rename(new_thumb)
        old_dir = PHOTOS_DIR / str(temp_id)
        new_dir = PHOTOS_DIR / str(pid)
        if old_dir.exists() and not new_dir.exists():
            old_dir.rename(new_dir)

    conn.close()

    print(f"  [{grade}] {file_info['project_name'][:50]}  "
          f"({text_info['method']}, {text_info['text_chars']} chars, "
          f"{image_info['images_found']} images)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Extract data from a single PDF into kennwerte-db")
    parser.add_argument("pdf", help="Path to PDF file")
    parser.add_argument("--force", action="store_true", help="Re-extract even if hash matches")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be extracted without writing DB")
    args = parser.parse_args()

    process_pdf(args.pdf, force=args.force, verbose=args.verbose, dry_run=args.dry_run)
