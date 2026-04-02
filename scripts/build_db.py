"""
build_db.py — Extract data from BBL Bautendokumentationen PDFs and build SQLite DB.

Usage:
    python scripts/build_db.py

Requires: PyMuPDF (fitz), Python 3.10+
"""

import fitz
import sqlite3
import os
import re
import sys
import gc
from pathlib import Path

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

PDF_ROOT = Path("docs/bautendokumentationen")
DB_PATH = Path("data/kennwerte.db")

PDF_DIR = Path("docs/bautendokumentationen")

# Flat file naming: {source}_{category}_{original}.pdf
# Parse source and category from the prefix
SOURCES = {
    "bbl": "Bundesamt fuer Bauten und Logistik (BBL)",
    "armasuisse": "armasuisse Immobilien (VBS)",
    "stadt-zuerich": "Stadt Zuerich, Hochbaudepartement",
}

CATEGORY_MAP = {
    "ausland":       ("AUSL",   "BOTSCHAFT",    "Bauten im Ausland"),
    "bildung":       ("FORSCH", "FORSCHUNG",    "Bildung und Forschung"),
    "bundeshaus":    ("REPR",   "REGIERUNG",    "Bundeshaus"),
    "justiz":        ("GERICHT","GERICHT",      "Justiz und Polizei"),
    "kultur":        ("KULT",   "MUSEUM",       "Kultur und Denkmaeler"),
    "parkanlagen":   ("INFRA",  "HIST",         "Parkanlagen und Landwirtschaft"),
    "produktion":    ("INFRA",  "WERKSTATT",    "Produktion und Lager"),
    "sport":         ("SPORT",  "SPORT",        "Sport"),
    "technik":       ("INFRA",  "VERW",         "Technische Anlagen"),
    "verschiedenes": ("ALLG",   "VERW",         "Verschiedenes"),
    "verwaltung":    ("ALLG",   "VERW",         "Verwaltung"),
    "wohnen":        ("ALLG",   "WOHNEN",       "Wohnen"),
    "zoll":          ("ZOLL",   "ZOLLANLAGE",   "Zoll"),
    "militaer":      ("VBS",    "KASERNE",      "armasuisse / VBS"),
    "hochbau":       ("KOMMUN", "VERW",         "Stadt Zuerich"),
}

def parse_flat_filename(filename):
    """Parse source and category from flat filename: source_category_rest.pdf"""
    for src in sorted(SOURCES.keys(), key=len, reverse=True):
        prefix = src + "_"
        if filename.startswith(prefix):
            rest = filename[len(prefix):]
            for cat in sorted(CATEGORY_MAP.keys(), key=len, reverse=True):
                cat_prefix = cat + "_"
                if rest.startswith(cat_prefix):
                    original = rest[len(cat_prefix):]
                    return src, cat, original
    return None, None, filename

CANTON_MAP = {
    "Bern": "BE", "Biel": "BE", "Bienne": "BE", "Ittigen": "BE",
    "Liebefeld": "BE", "Wabern": "BE", "Zollikofen": "BE", "Koeniz": "BE",
    "Köniz": "BE", "Heimiswil": "BE", "Interlaken": "BE", "Kehrsatz": "BE",
    "Magglingen": "BE", "Spiez": "BE", "Wimmis": "BE", "Thun": "BE",
    "Zürich": "ZH", "Zurich": "ZH", "Zürich-Fluntern": "ZH",
    "Zürich-Affoltern": "ZH", "Affoltern am Albis": "ZH",
    "Wädenswil": "ZH", "Winterthur": "ZH",
    "Basel": "BS", "Liestal": "BL", "Rheinfelden": "AG",
    "Windisch": "AG", "Wildegg": "AG", "Koblenz": "AG",
    "Lausanne": "VD", "Payerne": "VD",
    "Bellinzona": "TI", "Chiasso": "TI", "Tenero": "TI",
    "Davos": "GR", "Seelisberg": "UR",
    "Genève": "GE", "Vernier": "GE",
    "Arbon": "TG", "Tänikon": "TG",
    "St. Gallen": "SG", "Kreuzlingen": "TG",
    "Brig-Glis": "VS", "Küssnacht": "SZ",
    "Strassburg": None, "Berlin": None, "Washington": None,
    "Washington DC": None, "Seoul": None, "Moskau": None,
    "Nairobi": None, "Wien": None, "Prag": None,
    "Mexico": None, "Chicago": None, "Tiflis": None,
    "Khartum": None, "San Francisco": None, "Abidjan": None,
    "Warschau": None, "Algier": None, "Sarajevo": None,
    "Port-au-Prince": None, "Jakarta": None, "Harare": None,
    "Bangkok": None, "Tirana": None, "Kuala Lumpur": None,
    "Den Haag": None,
}

# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

SCHEMA = """
CREATE TABLE IF NOT EXISTS ref_data_source (
    code                TEXT PRIMARY KEY,
    name_de             TEXT NOT NULL,
    client_org          TEXT NOT NULL,
    url                 TEXT,
    description         TEXT
);

INSERT INTO ref_data_source VALUES ('bbl', 'BBL Bautendokumentationen', 'Bundesamt fuer Bauten und Logistik (BBL)', 'https://www.bbl.admin.ch/de/bautendokumentationen', 'Oeffentliche Bautendokumentationen des BBL fuer zivile Bundesbauten');
INSERT INTO ref_data_source VALUES ('armasuisse', 'armasuisse Bautendokumentationen', 'armasuisse Immobilien (VBS)', 'https://www.ar.admin.ch/de/bautendokumentationen', 'Oeffentliche Bautendokumentationen von armasuisse fuer militaerische Bauten');
INSERT INTO ref_data_source VALUES ('stadt_zuerich', 'Stadt Zuerich Baudokumentation', 'Stadt Zuerich, Hochbaudepartement (HBD)', 'https://www.stadt-zuerich.ch/de/aktuell/publikationen.html', 'Baudokumentationen der Stadt Zuerich fuer staedtische Hochbauten');

CREATE TABLE IF NOT EXISTS ref_category_map (
    folder_name         TEXT PRIMARY KEY,
    sub_portfolio       TEXT,
    federal_building_type TEXT,
    display_name_de     TEXT,
    data_source         TEXT REFERENCES ref_data_source(code)
);

CREATE TABLE IF NOT EXISTS bauprojekt (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    project_name        TEXT NOT NULL,
    municipality        TEXT,
    canton              TEXT,
    country             TEXT,
    category            TEXT NOT NULL,
    sub_portfolio       TEXT,
    federal_building_type TEXT,
    arbeiten_type       TEXT,
    completion_date     TEXT,
    completion_year     INTEGER,
    client_name         TEXT,
    client_org          TEXT,
    user_org            TEXT,
    architect           TEXT,
    general_planner     TEXT,
    general_contractor  TEXT,
    project_description TEXT,
    gf_m2               REAL,
    gv_m3               REAL,
    ngf_m2              REAL,
    floors              INTEGER,
    workplaces          INTEGER,
    energy_standard     TEXT,
    construction_cost_total REAL,
    pdf_filename        TEXT NOT NULL,
    pdf_category_folder TEXT NOT NULL,
    data_source         TEXT NOT NULL REFERENCES ref_data_source(code),
    source_url          TEXT
);

CREATE TABLE IF NOT EXISTS cost_record (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    bauprojekt_id       INTEGER NOT NULL REFERENCES bauprojekt(id),
    bkp_code            TEXT NOT NULL,
    bkp_name            TEXT,
    amount_chf          REAL,
    UNIQUE(bauprojekt_id, bkp_code)
);

CREATE TABLE IF NOT EXISTS benchmark_extracted (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    bauprojekt_id       INTEGER NOT NULL REFERENCES bauprojekt(id),
    benchmark_type      TEXT NOT NULL,
    value               REAL NOT NULL,
    label               TEXT
);

CREATE TABLE IF NOT EXISTS index_reference (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    bauprojekt_id       INTEGER NOT NULL REFERENCES bauprojekt(id),
    index_name          TEXT,
    index_date          TEXT,
    index_value         REAL,
    basis_date          TEXT,
    basis_value         REAL
);

CREATE TABLE IF NOT EXISTS project_timeline (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    bauprojekt_id       INTEGER NOT NULL REFERENCES bauprojekt(id),
    milestone           TEXT NOT NULL,
    value               TEXT
);
"""

# ---------------------------------------------------------------------------
# Number parsing
# ---------------------------------------------------------------------------

def parse_swiss_number(s):
    """Parse Swiss-formatted number: '16 830 000' or '16'830'000' or '3 525 000'."""
    if not s:
        return None
    s = s.replace("\u2009", "").replace("\u00a0", "")  # thin space, nbsp
    s = s.replace("'", "").replace("'", "").replace("'", "")
    s = re.sub(r"\s+", "", s)
    s = s.replace(",", ".")  # decimal comma
    try:
        return float(s)
    except ValueError:
        return None

# ---------------------------------------------------------------------------
# Filename parsing
# ---------------------------------------------------------------------------

FILENAME_RE = re.compile(
    r"^(\d{8})[_ ](.+?)(?:_(DE|FR|IT))?\.pdf$", re.IGNORECASE
)

FILENAME_NO_DATE_RE = re.compile(
    r"^(.+?)(?:_(DE|FR|IT))?\.pdf$", re.IGNORECASE
)

def parse_filename(filename, category):
    """Extract date, municipality, project name from filename."""
    m = FILENAME_RE.match(filename)
    if m:
        date_str = m.group(1)
        rest = m.group(2).strip()
        year = int(date_str[:4])
        month = int(date_str[4:6])
        day = int(date_str[6:8])
        completion_date = f"{year:04d}-{month:02d}-{day:02d}"
    else:
        m2 = FILENAME_NO_DATE_RE.match(filename)
        rest = m2.group(1).strip() if m2 else filename.replace(".pdf", "")
        completion_date = None
        year = None

    # Split on comma to get parts
    parts = [p.strip() for p in rest.split(",")]

    municipality = parts[0] if parts else None
    country = None

    if category == "ausland" and len(parts) >= 2:
        municipality = parts[0]
        country = parts[1] if len(parts) >= 2 else None
        project_name = ", ".join(parts[2:]) if len(parts) > 2 else parts[-1]
    elif len(parts) >= 2:
        municipality = parts[0]
        project_name = ", ".join(parts[1:])
    else:
        project_name = rest

    # Clean up project name
    if not project_name or project_name == municipality:
        project_name = rest

    # Look up canton
    canton = None
    if municipality:
        canton = CANTON_MAP.get(municipality)
        if canton is None:
            # Try partial match
            for key, val in CANTON_MAP.items():
                if key in municipality or municipality in key:
                    canton = val
                    break

    return {
        "completion_date": completion_date,
        "completion_year": year,
        "municipality": municipality,
        "canton": canton,
        "country": country,
        "project_name": project_name,
    }

# ---------------------------------------------------------------------------
# Art der Arbeiten inference
# ---------------------------------------------------------------------------

def infer_arbeiten_type(project_name):
    """Infer Art der Arbeiten from project name keywords."""
    name_lower = project_name.lower() if project_name else ""
    if "neubau" in name_lower:
        return "NEUBAU"
    if "erweiterung" in name_lower:
        return "UMBAU_ERWEITERUNG"
    if any(kw in name_lower for kw in [
        "sanierung", "gesamtsanierung", "instandsetzung",
        "restaurierung", "renovation", "konservierung",
        "sicherung", "teilsanierung"
    ]):
        return "UMBAU_SANIERUNG"
    if "umbau" in name_lower or "umnutzung" in name_lower:
        return "UMBAU"
    if "optimierung" in name_lower or "anpassung" in name_lower:
        return "UMBAU"
    # Default for BBL projects
    return "UMBAU_SANIERUNG"

# ---------------------------------------------------------------------------
# Text extraction helpers
# ---------------------------------------------------------------------------

def extract_field_after_label(text, labels, stop_labels=None):
    """Extract text content after a label keyword, stopping at next label."""
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
            value = m.group(1).strip()
            # Take first meaningful line(s)
            lines = [l.strip() for l in value.split("\n") if l.strip()]
            if lines:
                # Join first 1-3 lines that look like a name/org
                result_lines = []
                for line in lines[:4]:
                    if len(line) > 3 and not re.match(r"^\d+$", line):
                        result_lines.append(line)
                    else:
                        break
                return " ".join(result_lines) if result_lines else None
    return None


def extract_metadata(text):
    """Extract structured metadata from PDF text."""
    meta = {}

    meta["client_name"] = extract_field_after_label(text, [
        "Bauherrschaft", "Maître de l'ouvrage", "Committente"
    ])

    meta["user_org"] = extract_field_after_label(text, ["Nutzer", "Utilisateur"])

    meta["architect"] = extract_field_after_label(text, [
        "Architektur", "Architekten", "Architekt",
        "Architecture", "Architetto"
    ])

    meta["general_planner"] = extract_field_after_label(text, [
        "Generalplaner", "Generalplanerteam"
    ])

    meta["general_contractor"] = extract_field_after_label(text, [
        "Generalunternehmer", "Generalunternehmung",
        "Totalunternehmer", "Totalunternehmung"
    ])

    return meta


def extract_quantities(text):
    """Extract SIA 416 quantities from text."""
    quantities = {}

    # Geschossfläche (GF) - various patterns
    for pat in [
        r"Geschossfl.che\s+(?:Total\s+)?([\d\s']+)\s*m[2²]",
        r"Geschossfl.che\s+(?:GF\s+)?([\d\s']+)\s*m[2²]",
        r"GF\s*(?:SIA\s*416)?\s*:?\s*([\d\s']+)\s*m[2²]",
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = parse_swiss_number(m.group(1))
            if val and val < 500_000:  # sanity: no building > 500k m2
                quantities["gf_m2"] = val
            break

    # Gebäudevolumen (GV)
    for pat in [
        r"Geb.udevolumen\s+([\d\s']+)\s*m[3³]",
        r"GV\s*(?:SIA\s*416)?\s*:?\s*([\d\s']+)\s*m[3³]",
        r"Umbauter\s+Raum\s+([\d\s']+)\s*m[3³]",
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            quantities["gv_m3"] = parse_swiss_number(m.group(1))
            break

    # Nettogeschossfläche (NGF)
    m = re.search(r"Nettogeschossfl.che\s+([\d\s']+)\s*m[2²]", text, re.IGNORECASE)
    if m:
        quantities["ngf_m2"] = parse_swiss_number(m.group(1))

    # Floors
    m = re.search(r"Geschosse\s*\n?\s*(\d+)", text)
    if m:
        quantities["floors"] = int(m.group(1))

    # Workplaces
    for pat in [
        r"Arbeitspl.tze\s*\n?\s*([\d\s']+)",
        r"([\d\s']+)\s*Arbeitspl.tze",
    ]:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = parse_swiss_number(m.group(1))
            if val and val < 50000:  # sanity check
                quantities["workplaces"] = int(val)
                break

    # Energy standard
    for std in ["MINERGIE-P-ECO", "MINERGIE-ECO", "MINERGIE-P", "MINERGIE-A", "MINERGIE"]:
        if std.lower() in text.lower() or std.replace("-", " ").lower() in text.lower():
            quantities["energy_standard"] = std
            break

    return quantities


def extract_costs(text):
    """Extract BKP cost breakdown from text."""
    costs = {}

    BKP_NAMES = {
        "1": "Vorbereitungsarbeiten",
        "2": "Gebaeude",
        "3": "Betriebseinrichtungen",
        "4": "Umgebung",
        "5": "Baunebenkosten",
        "9": "Ausstattung",
        "20": "Baugrube",
        "21": "Rohbau 1",
        "22": "Rohbau 2",
        "23": "Elektroanlagen",
        "24": "HLKK-Anlagen",
        "25": "Sanitaeranlagen",
        "26": "Transportanlagen",
        "27": "Ausbau 1",
        "28": "Ausbau 2",
        "29": "Honorare",
    }

    # The two-column PDF layout interleaves lines:
    # Line: "2 Gebäude" or "21 Rohbau 1"
    # Next line: "63 572 000" (the amount)
    # OR same line: "2 Gebäude  63 572 000"
    lines = text.split("\n")

    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue

        # Pattern 1: code + name + amount on same line
        m = re.match(
            r"^(\d{1,2})\s{1,}([A-Za-zÄÖÜäöüéèêàáâïîôûùë\s\-/&().]+?)\s{2,}([\d\s']{3,})$",
            line
        )
        if m:
            code = m.group(1).strip()
            name = m.group(2).strip()
            amount = parse_swiss_number(m.group(3))
            if code in BKP_NAMES and amount is not None:
                if code in ("2",) and 10000 <= amount <= 500_000_000:
                    costs[code] = {"name": name, "amount": amount}
                elif code not in ("2",) and 1000 <= amount <= 200_000_000:
                    costs[code] = {"name": name, "amount": amount}
            continue

        # Pattern 2: code + name on this line, amount on next line
        m2 = re.match(r"^(\d{1,2})\s+([A-Za-zÄÖÜäöüéèêàáâïîôûùëHLKSV\s\-/&().]+?)\s*$", line)
        if m2 and i + 1 < len(lines):
            code = m2.group(1).strip()
            name = m2.group(2).strip()
            next_line = lines[i + 1].strip()
            # Next line should be a pure number
            if re.match(r"^[\d\s']+$", next_line) and len(next_line) >= 3:
                amount = parse_swiss_number(next_line)
                if code in BKP_NAMES and amount is not None:
                    if code in ("2",) and 10000 <= amount <= 500_000_000:
                        costs[code] = {"name": name, "amount": amount}
                    elif code not in ("2",) and 1000 <= amount <= 200_000_000:
                        costs[code] = {"name": name, "amount": amount}

    # Also try: "Anlagekosten\n77 000 000" or "Anlagekosten  77 000 000"
    ak_match = re.search(r"Anlagekosten\s*\n?\s*([\d\s']+?)(?:\s*\n|\s*$)", text, re.MULTILINE)
    if ak_match:
        val = parse_swiss_number(ak_match.group(1))
        if val and 10000 <= val <= 500_000_000:
            costs["AK"] = {"name": "Anlagekosten", "amount": val}

    return costs


def extract_benchmarks(text):
    """Extract benchmark values (CHF/m2, CHF/m3) from text."""
    benchmarks = []

    # Extract benchmarks line by line to avoid multi-line concatenation issues
    lines = text.split("\n")
    for i, line in enumerate(lines):
        line = line.strip()

        # "BKP 2/m2 GF" or "BKP2/m2 GF" followed by number on same or next line
        for pat, btype in [
            (r"BKP\s*2\s*/\s*m[2²]\s*GF\s+([\d\s']+)", "CHF/m2_GF_BKP2"),
            (r"BKP\s*2\s*/\s*m[3³]\s*GV\s+([\d\s']+)", "CHF/m3_GV_BKP2"),
            (r"BKP2/m[2²]\s*GF\s+([\d\s']+)", "CHF/m2_GF_BKP2"),
            (r"BKP2/m[3³]\s*GV\s+([\d\s']+)", "CHF/m3_GV_BKP2"),
        ]:
            m = re.match(pat, line, re.IGNORECASE)
            if m:
                val = parse_swiss_number(m.group(1))
                if val and 50 < val < 50000:
                    benchmarks.append({"type": btype, "value": val, "label": line[:100]})
                break

        # "BKP 2/m2 GF" on this line, number on next
        for pat, btype in [
            (r"BKP\s*2\s*/\s*m[2²]\s*GF\s*$", "CHF/m2_GF_BKP2"),
            (r"BKP\s*2\s*/\s*m[3³]\s*GV\s*$", "CHF/m3_GV_BKP2"),
            (r"BKP2/m[2²]\s*GF\s*$", "CHF/m2_GF_BKP2"),
            (r"BKP2/m[3³]\s*GV\s*$", "CHF/m3_GV_BKP2"),
        ]:
            m = re.match(pat, line, re.IGNORECASE)
            if m and i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                if re.match(r"^[\d\s']+$", next_line):
                    val = parse_swiss_number(next_line)
                    if val and 50 < val < 50000:
                        benchmarks.append({"type": btype, "value": val, "label": f"{line} {next_line}"})
                break

    # Deduplicate by type
    seen_types = set()
    unique = []
    for bm in benchmarks:
        if bm["type"] not in seen_types:
            unique.append(bm)
            seen_types.add(bm["type"])
    benchmarks = unique

    return benchmarks


def extract_index_reference(text):
    """Extract Baukostenindex reference from text."""
    index_info = {}

    # "Baukostenindex Espace Mittelland, Oktober 2010  125.2"
    # "Zürcher Baukostenindex April 2002 = 110 Punkte"
    patterns = [
        re.compile(
            r"((?:Zürcher\s+)?Bau(?:kosten|preis)index[^,\n]*?),?\s+"
            r"(\w+\s+\d{4})\s+(\d[\d.,]*)",
            re.IGNORECASE
        ),
        re.compile(
            r"((?:Zürcher\s+)?Bau(?:kosten|preis)index[^,\n]*?)\s*\n\s*"
            r".*?(\w+\s+\d{4})\s+(\d[\d.,]*)",
            re.IGNORECASE
        ),
    ]

    for pat in patterns:
        m = pat.search(text)
        if m:
            index_info["index_name"] = m.group(1).strip()
            index_info["index_date"] = m.group(2).strip()
            index_info["index_value"] = parse_swiss_number(m.group(3))
            break

    # Basis
    basis_match = re.search(
        r"Basis\s+(\w+\s+\d{4})\s+(\d[\d.,]*)", text, re.IGNORECASE
    )
    if basis_match:
        index_info["basis_date"] = basis_match.group(1).strip()
        index_info["basis_value"] = parse_swiss_number(basis_match.group(2))

    return index_info if index_info.get("index_name") else None


def extract_timeline(text):
    """Extract project timeline milestones."""
    milestones = []

    patterns = [
        ("planungsbeginn", r"Planungsbeginn\s+(.+?)(?:\n|$)"),
        ("wettbewerb", r"(?:Projektwettbewerb|Wettbewerb)\s+(.+?)(?:\n|$)"),
        ("baubeginn", r"Baubeginn\s+(.+?)(?:\n|$)"),
        ("bauende", r"(?:Bauende|Bezug|Übergabe|Fertigstellung)\s+(.+?)(?:\n|$)"),
        ("bauzeit_monate", r"Bauzeit\s+(\d+)\s*Monate"),
    ]

    for name, pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            val = m.group(1).strip()
            if val and len(val) < 100:
                milestones.append({"milestone": name, "value": val})

    return milestones


def extract_description(text):
    """Extract project description (first substantial paragraph)."""
    # Look for text blocks after common section headers
    for header in ["Ausgangslage", "Projektbeschrieb", "Projektbeschreibung"]:
        idx = text.find(header)
        if idx >= 0:
            after = text[idx + len(header):]
            # Skip whitespace and short lines
            lines = after.split("\n")
            desc_lines = []
            started = False
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

    # Fallback: find longest paragraph
    paragraphs = re.split(r"\n\s*\n", text)
    best = ""
    for p in paragraphs:
        p = p.strip()
        if len(p) > len(best) and len(p) > 100:
            best = p
    return best[:2000] if best else None


# ---------------------------------------------------------------------------
# Main processing
# ---------------------------------------------------------------------------

def process_pdf(filepath, category):
    """Process a single PDF and return extracted data."""
    filename = os.path.basename(filepath)
    file_info = parse_filename(filename, category)

    # Extract text from first page(s)
    doc = None
    try:
        doc = fitz.open(filepath)
        text = ""
        for page_num in range(min(2, doc.page_count)):
            text += doc[page_num].get_text() + "\n"
    except Exception as e:
        print(f"  ERROR reading {filename}: {e}", file=sys.stderr)
        text = ""
    finally:
        if doc:
            doc.close()
            del doc
            gc.collect()

    has_text = len(text.strip()) > 50

    # Extract metadata from text
    meta = extract_metadata(text) if has_text else {}
    quantities = extract_quantities(text) if has_text else {}
    costs = extract_costs(text) if has_text else {}
    benchmarks = extract_benchmarks(text) if has_text else []
    index_ref = extract_index_reference(text) if has_text else None
    timeline = extract_timeline(text) if has_text else []
    description = extract_description(text) if has_text else None

    # Infer arbeiten_type from project name and full filename
    arbeiten_type = infer_arbeiten_type(file_info["project_name"])
    if arbeiten_type == "UMBAU_SANIERUNG":
        # Double check with full filename
        arbeiten_type = infer_arbeiten_type(filename)

    # Category mapping
    cat_info = CATEGORY_MAP.get(category, ("ALLG", "VERW", category))

    # Total construction cost (BKP 2 or Anlagekosten)
    total_cost = None
    if "2" in costs:
        total_cost = costs["2"]["amount"]
    elif "AK" in costs:
        total_cost = costs["AK"]["amount"]

    project = {
        "project_name": file_info["project_name"],
        "municipality": file_info["municipality"],
        "canton": file_info["canton"],
        "country": file_info["country"],
        "category": category,
        "sub_portfolio": cat_info[0],
        "federal_building_type": cat_info[1],
        "arbeiten_type": arbeiten_type,
        "completion_date": file_info["completion_date"],
        "completion_year": file_info["completion_year"],
        "client_name": meta.get("client_name"),
        "user_org": meta.get("user_org"),
        "architect": meta.get("architect"),
        "general_planner": meta.get("general_planner"),
        "general_contractor": meta.get("general_contractor"),
        "project_description": description,
        "gf_m2": quantities.get("gf_m2"),
        "gv_m3": quantities.get("gv_m3"),
        "ngf_m2": quantities.get("ngf_m2"),
        "floors": quantities.get("floors"),
        "workplaces": quantities.get("workplaces"),
        "energy_standard": quantities.get("energy_standard"),
        "construction_cost_total": total_cost,
        "pdf_filename": filename,
        "pdf_category_folder": category,
    }

    return project, costs, benchmarks, index_ref, timeline


def build_database():
    """Main entry point: scan PDFs, extract data, build SQLite DB."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Remove existing DB
    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()

    # Create schema
    cur.executescript(SCHEMA)

    # Insert category mapping
    for src_code, src in SOURCES.items():
        for folder, (sub_p, fbt, display) in src["categories"].items():
            cur.execute(
                "INSERT OR IGNORE INTO ref_category_map VALUES (?, ?, ?, ?, ?)",
                (folder, sub_p, fbt, display, src_code)
            )

    # Process each category
    stats = {
        "total": 0, "with_text": 0, "with_costs": 0,
        "with_gf": 0, "with_benchmarks": 0,
    }

    for category in CATEGORIES:
        cat_dir = PDF_ROOT / category
        if not cat_dir.is_dir():
            print(f"  SKIP {category}: directory not found")
            continue

        pdfs = sorted(cat_dir.glob("*.pdf"))
        print(f"\n[{category}] Processing {len(pdfs)} PDFs...")

        for pdf_path in pdfs:
            stats["total"] += 1
            project, costs, benchmarks, index_ref, timeline = process_pdf(
                str(pdf_path), category
            )

            if project["project_description"]:
                stats["with_text"] += 1

            # Insert bauprojekt
            cur.execute("""
                INSERT INTO bauprojekt (
                    project_name, municipality, canton, country, category,
                    sub_portfolio, federal_building_type, arbeiten_type,
                    completion_date, completion_year, client_name, user_org,
                    architect, general_planner, general_contractor,
                    project_description, gf_m2, gv_m3, ngf_m2, floors,
                    workplaces, energy_standard, construction_cost_total,
                    pdf_filename, pdf_category_folder
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?
                )
            """, (
                project["project_name"], project["municipality"],
                project["canton"], project["country"], project["category"],
                project["sub_portfolio"], project["federal_building_type"],
                project["arbeiten_type"], project["completion_date"],
                project["completion_year"], project["client_name"],
                project["user_org"], project["architect"],
                project["general_planner"], project["general_contractor"],
                project["project_description"], project["gf_m2"],
                project["gv_m3"], project["ngf_m2"], project["floors"],
                project["workplaces"], project["energy_standard"],
                project["construction_cost_total"],
                project["pdf_filename"], project["pdf_category_folder"],
            ))

            project_id = cur.lastrowid

            # Insert cost records
            bkp_costs = {k: v for k, v in costs.items() if k != "AK"}
            if bkp_costs:
                stats["with_costs"] += 1
                for code, info in bkp_costs.items():
                    cur.execute(
                        "INSERT OR IGNORE INTO cost_record (bauprojekt_id, bkp_code, bkp_name, amount_chf) VALUES (?, ?, ?, ?)",
                        (project_id, code, info["name"], info["amount"])
                    )

            # Insert benchmarks
            if benchmarks:
                stats["with_benchmarks"] += 1
                for bm in benchmarks:
                    cur.execute(
                        "INSERT INTO benchmark_extracted (bauprojekt_id, benchmark_type, value, label) VALUES (?, ?, ?, ?)",
                        (project_id, bm["type"], bm["value"], bm["label"])
                    )

            # Insert index reference
            if index_ref:
                cur.execute(
                    "INSERT INTO index_reference (bauprojekt_id, index_name, index_date, index_value, basis_date, basis_value) VALUES (?, ?, ?, ?, ?, ?)",
                    (project_id, index_ref.get("index_name"), index_ref.get("index_date"),
                     index_ref.get("index_value"), index_ref.get("basis_date"), index_ref.get("basis_value"))
                )

            # Insert timeline
            for ms in timeline:
                cur.execute(
                    "INSERT INTO project_timeline (bauprojekt_id, milestone, value) VALUES (?, ?, ?)",
                    (project_id, ms["milestone"], ms["value"])
                )

            if project["gf_m2"]:
                stats["with_gf"] += 1

            status = []
            if project["gf_m2"]:
                status.append(f"GF={project['gf_m2']:.0f}")
            if project["construction_cost_total"]:
                status.append(f"CHF={project['construction_cost_total']:.0f}")
            if benchmarks:
                status.append(f"BM={len(benchmarks)}")

            marker = " ".join(status) if status else "(minimal)"
            print(f"  {project['pdf_filename'][:60]:60s} {marker}")

    conn.commit()

    # Print summary
    print("\n" + "=" * 60)
    print(f"Database built: {DB_PATH}")
    print(f"  Total projects:       {stats['total']}")
    print(f"  With extracted text:  {stats['with_text']}")
    print(f"  With BKP costs:       {stats['with_costs']}")
    print(f"  With GF:              {stats['with_gf']}")
    print(f"  With benchmarks:      {stats['with_benchmarks']}")

    # Quick verification
    cur.execute("SELECT COUNT(*) FROM bauprojekt")
    print(f"\n  DB verification: {cur.fetchone()[0]} rows in bauprojekt")
    cur.execute("SELECT COUNT(*) FROM cost_record")
    print(f"  DB verification: {cur.fetchone()[0]} rows in cost_record")
    cur.execute("SELECT COUNT(*) FROM benchmark_extracted")
    print(f"  DB verification: {cur.fetchone()[0]} rows in benchmark_extracted")

    conn.close()
    print(f"\n  File size: {DB_PATH.stat().st_size / 1024:.1f} KB")


def extract_all_texts():
    """Pass 1: Extract text from all PDFs and save as JSON (avoids PyMuPDF memory issues)."""
    import json
    import subprocess

    results = {}
    all_pdfs = []

    for pdf_path in sorted(PDF_DIR.glob("*.pdf")):
        source, category, original = parse_flat_filename(pdf_path.name)
        if source and category:
            all_pdfs.append((category, str(pdf_path)))

    print(f"Extracting text from {len(all_pdfs)} PDFs...")

    # Process in small batches via subprocess to avoid PyMuPDF memory crashes
    # Use temp files for data passing (avoids shell escaping issues with paths)
    import tempfile

    BATCH = 15
    for i in range(0, len(all_pdfs), BATCH):
        batch = all_pdfs[i:i+BATCH]

        # Write batch paths to a temp file
        batch_file = Path(tempfile.mktemp(suffix=".json"))
        with open(batch_file, "w", encoding="utf-8") as f:
            json.dump([(c, p) for c, p in batch], f, ensure_ascii=False)

        output_file = Path(tempfile.mktemp(suffix=".json"))

        script = f"""
import fitz, json, sys
with open(r"{batch_file}", "r", encoding="utf-8") as f:
    batch = json.load(f)
results = {{}}
for cat, path in batch:
    try:
        doc = fitz.open(path)
        text = ""
        for page_num in range(min(2, doc.page_count)):
            text += doc[page_num].get_text() + "\\n"
        doc.close()
    except Exception as e:
        text = ""
    results[path] = text
with open(r"{output_file}", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False)
"""
        try:
            proc = subprocess.run(
                [sys.executable, "-c", script],
                capture_output=True, text=True, timeout=120,
                env={**os.environ, "PYTHONIOENCODING": "utf-8"}
            )
            if proc.returncode == 0 and output_file.exists():
                with open(output_file, "r", encoding="utf-8") as f:
                    batch_results = json.load(f)
                results.update(batch_results)
                print(f"  Batch {i//BATCH + 1}: {len(batch_results)} PDFs extracted")
            else:
                print(f"  Batch {i//BATCH + 1}: FAILED (rc={proc.returncode})")
                if proc.stderr:
                    print(f"    stderr: {proc.stderr[:200]}")
                # Mark as empty
                for cat, path in batch:
                    results[path] = ""
        except subprocess.TimeoutExpired:
            print(f"  Batch {i//BATCH + 1}: TIMEOUT")
            for cat, path in batch:
                results[path] = ""
        finally:
            batch_file.unlink(missing_ok=True)
            output_file.unlink(missing_ok=True)

    # Save intermediate JSON
    cache_path = Path("data/pdf_texts.json")
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False)
    print(f"  Saved text cache: {cache_path} ({len(results)} entries)")
    return results


def build_database_from_texts(texts):
    """Pass 2: Build SQLite DB from pre-extracted texts."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)

    if DB_PATH.exists():
        DB_PATH.unlink()

    conn = sqlite3.connect(str(DB_PATH))
    cur = conn.cursor()
    cur.executescript(SCHEMA)

    for cat, (sub_p, fbt, display) in CATEGORY_MAP.items():
        # Determine source for this category
        src = "bbl"
        if cat == "militaer":
            src = "armasuisse"
        elif cat == "hochbau":
            src = "stadt-zuerich"
        cur.execute(
            "INSERT OR IGNORE INTO ref_category_map VALUES (?, ?, ?, ?, ?)",
            (cat, sub_p, fbt, display, src)
        )

    stats = {
        "total": 0, "with_text": 0, "with_costs": 0,
        "with_gf": 0, "with_benchmarks": 0,
    }

    # Group PDFs by source+category
    from collections import defaultdict
    grouped = defaultdict(list)
    for pdf_path in sorted(PDF_DIR.glob("*.pdf")):
        source, category, original = parse_flat_filename(pdf_path.name)
        if source and category:
            grouped[(source, category)].append(pdf_path)

    for (src_code, category), pdfs in sorted(grouped.items()):
        client_org_default = SOURCES.get(src_code, "Unknown")
        print(f"\n[{src_code}/{category}] Processing {len(pdfs)} PDFs...")

        for pdf_path in pdfs:
            stats["total"] += 1
            filename = pdf_path.name
            filepath = str(pdf_path)
            text = texts.get(filepath, "")

            # Parse the original filename (strip source_category_ prefix)
            _, _, original_name = parse_flat_filename(filename)
            file_info = parse_filename(original_name, category)
            has_text = len(text.strip()) > 50

            meta = extract_metadata(text) if has_text else {}
            quantities = extract_quantities(text) if has_text else {}
            costs = extract_costs(text) if has_text else {}
            benchmarks = extract_benchmarks(text) if has_text else []
            index_ref = extract_index_reference(text) if has_text else None
            timeline = extract_timeline(text) if has_text else []
            description = extract_description(text) if has_text else None

            arbeiten_type = infer_arbeiten_type(file_info["project_name"])
            if arbeiten_type == "UMBAU_SANIERUNG":
                arbeiten_type = infer_arbeiten_type(original_name)

            cat_info = CATEGORY_MAP.get(category, ("ALLG", "VERW", category))

            total_cost = None
            if "2" in costs:
                total_cost = costs["2"]["amount"]
            elif "AK" in costs:
                total_cost = costs["AK"]["amount"]

            if description:
                stats["with_text"] += 1

            cur.execute("""
                INSERT INTO bauprojekt (
                    project_name, municipality, canton, country, category,
                    sub_portfolio, federal_building_type, arbeiten_type,
                    completion_date, completion_year, client_name, client_org, user_org,
                    architect, general_planner, general_contractor,
                    project_description, gf_m2, gv_m3, ngf_m2, floors,
                    workplaces, energy_standard, construction_cost_total,
                    pdf_filename, pdf_category_folder, data_source
                ) VALUES (
                    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?, ?, ?, ?, ?
                )
            """, (
                file_info["project_name"], file_info["municipality"],
                file_info["canton"], file_info["country"], category,
                cat_info[0], cat_info[1], arbeiten_type,
                file_info["completion_date"], file_info["completion_year"],
                meta.get("client_name"), client_org_default,
                meta.get("user_org"),
                meta.get("architect"), meta.get("general_planner"),
                meta.get("general_contractor"), description,
                quantities.get("gf_m2"), quantities.get("gv_m3"),
                quantities.get("ngf_m2"), quantities.get("floors"),
                quantities.get("workplaces"), quantities.get("energy_standard"),
                total_cost, filename, category, src_code,
            ))

            project_id = cur.lastrowid

            bkp_costs = {k: v for k, v in costs.items() if k != "AK"}
            if bkp_costs:
                stats["with_costs"] += 1
                for code, info in bkp_costs.items():
                    cur.execute(
                        "INSERT OR IGNORE INTO cost_record (bauprojekt_id, bkp_code, bkp_name, amount_chf) VALUES (?, ?, ?, ?)",
                        (project_id, code, info["name"], info["amount"])
                    )

            if benchmarks:
                stats["with_benchmarks"] += 1
                for bm in benchmarks:
                    cur.execute(
                        "INSERT INTO benchmark_extracted (bauprojekt_id, benchmark_type, value, label) VALUES (?, ?, ?, ?)",
                        (project_id, bm["type"], bm["value"], bm["label"])
                    )

            if index_ref:
                cur.execute(
                    "INSERT INTO index_reference (bauprojekt_id, index_name, index_date, index_value, basis_date, basis_value) VALUES (?, ?, ?, ?, ?, ?)",
                    (project_id, index_ref.get("index_name"), index_ref.get("index_date"),
                     index_ref.get("index_value"), index_ref.get("basis_date"), index_ref.get("basis_value"))
                )

            for ms in timeline:
                cur.execute(
                    "INSERT INTO project_timeline (bauprojekt_id, milestone, value) VALUES (?, ?, ?)",
                    (project_id, ms["milestone"], ms["value"])
                )

            if quantities.get("gf_m2"):
                stats["with_gf"] += 1

            status = []
            if quantities.get("gf_m2"):
                status.append(f"GF={quantities['gf_m2']:.0f}")
            if total_cost:
                status.append(f"CHF={total_cost:.0f}")
            if benchmarks:
                status.append(f"BM={len(benchmarks)}")

            marker = " ".join(status) if status else "(minimal)"
            print(f"  {filename[:60]:60s} {marker}")

    conn.commit()

    print("\n" + "=" * 60)
    print(f"Database built: {DB_PATH}")
    print(f"  Total projects:       {stats['total']}")
    print(f"  With extracted text:  {stats['with_text']}")
    print(f"  With BKP costs:       {stats['with_costs']}")
    print(f"  With GF:              {stats['with_gf']}")
    print(f"  With benchmarks:      {stats['with_benchmarks']}")

    cur.execute("SELECT COUNT(*) FROM bauprojekt")
    print(f"\n  DB rows - bauprojekt:  {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM cost_record")
    print(f"  DB rows - cost_record: {cur.fetchone()[0]}")
    cur.execute("SELECT COUNT(*) FROM benchmark_extracted")
    print(f"  DB rows - benchmarks:  {cur.fetchone()[0]}")

    conn.close()
    print(f"\n  File size: {DB_PATH.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    import json

    cache_path = Path("data/pdf_texts.json")

    # Pass 1: Extract texts (uses subprocesses to avoid PyMuPDF memory issues)
    if cache_path.exists():
        print(f"Loading cached texts from {cache_path}...")
        with open(cache_path, "r", encoding="utf-8") as f:
            texts = json.load(f)
        print(f"  Loaded {len(texts)} entries")
    else:
        texts = extract_all_texts()

    # Pass 2: Build DB from extracted texts
    build_database_from_texts(texts)
