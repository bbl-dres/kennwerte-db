"""
extract_from_markdown.py — Stage 2: Extract structured data from Markdown files.

Reads markdown files (produced by pdf_to_markdown.py) and extracts structured
fields using markdown-aware parsing (tables, headings) + regex patterns.

This replaces the raw-text regex approach in extract.py with a cleaner pipeline
that benefits from preserved table structure in the markdown.

Usage:
    python scripts/extract_from_markdown.py data/markdown/sample.md --verbose
    python scripts/extract_from_markdown.py --all
    python scripts/extract_from_markdown.py --all --source bbl
    python scripts/extract_from_markdown.py --all --dry-run
"""

import argparse
import json
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------
MD_DIR = Path("data/markdown")

BKP_NAMES = {
    "1": "Vorbereitungsarbeiten", "2": "Gebäude",
    "3": "Betriebseinrichtungen", "4": "Umgebung",
    "5": "Baunebenkosten", "6": "Reserve",
    "7": "Generalunternehmer", "8": "Mehrwertsteuer",
    "9": "Ausstattung",
    "20": "Baugrube", "21": "Rohbau 1", "22": "Rohbau 2",
    "23": "Elektroanlagen", "24": "HLKK-Anlagen",
    "25": "Sanitäranlagen", "26": "Transportanlagen",
    "27": "Ausbau 1", "28": "Ausbau 2", "29": "Honorare",
}

EBKPH_NAMES = {
    "A": "Grundstück", "B": "Vorbereitung",
    "C": "Konstruktion Gebäude", "D": "Technik Gebäude",
    "E": "Äussere Wandbekleidung", "F": "Bedachung Gebäude",
    "G": "Ausbau Gebäude", "H": "Nutzungsspez. Anlage",
    "I": "Umgebung Gebäude", "J": "Ausstattung Gebäude",
    "V": "Planungskosten", "W": "Nebenkosten",
    "Y": "Reserve, Teuerung", "Z": "Mehrwertsteuer",
}

# Reverse lookup: BKP name → code (for tables that use names instead of codes)
BKP_NAME_TO_CODE = {}
for code, name in BKP_NAMES.items():
    BKP_NAME_TO_CODE[name.lower()] = code
# Add common variants
BKP_NAME_TO_CODE.update({
    "gebäude": "2", "gebaude": "2",
    "betriebseinrichtung": "3", "betriebeinrichtungen": "3", "betriebeinrichtung": "3",
    "baunebenkosten": "5", "nebenkosten": "5",
    "unvorhergesehenes": "6", "reserve": "6",
    "generalunternehmer": "7", "mwst": "8", "mehrwertsteuer": "8",
    "ausstattung": "9",
    "elektroanlagen": "23", "elektroanlage": "23", "elektroanlag": "23",
    "heizungsanlage": "24", "hlkk-anlagen": "24", "hlks": "24",
    "sanitäranlagen": "25", "sanitaranlagen": "25",
    "transportanlagen": "26",
    "ausbau 1": "27", "ausbau 2": "28",
    "honorare": "29", "honorar": "29",
})


# ---------------------------------------------------------------------------
# Number parsing
# ---------------------------------------------------------------------------

def parse_number(s, max_value=999_999_999):
    """Parse Swiss-formatted numbers: 11'649'000, 11 649 000, 2'080.00, etc.
    Returns None if the result exceeds max_value (likely concatenated numbers)."""
    if not s:
        return None
    s = s.strip()
    # Detect concatenated numbers: "11250000 150000" (two large numbers separated by space)
    # vs Swiss thousands: "457 000" (one number with space separator)
    parts = s.split()
    if len(parts) >= 2 and all(re.match(r"^[\d']+$", p) for p in parts):
        # Check if this looks like Swiss thousands (groups of 3) or two separate numbers
        # "457 000" → one number (second part is 3 digits = thousands group)
        # "11250000 150000" → two numbers (both > 999)
        if all(len(p) <= 3 for p in parts[1:]):
            pass  # Swiss thousands — keep as-is
        else:
            # Multiple independent numbers — take only the first one
            s = parts[0]
    s = s.replace("\u2009", "").replace("\u00a0", "")
    s = s.replace("\u2019", "").replace("'", "").replace("\u0027", "")
    s = re.sub(r"\s+", "", s)
    s = s.replace(",", ".")
    # Remove trailing unit suffixes
    s = re.sub(r"\s*(CHF|m[23²³]|/m[23²³]).*$", "", s)
    try:
        val = float(s)
        if val > max_value:
            return None  # Likely concatenated numbers
        return val
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Markdown table parser
# ---------------------------------------------------------------------------

def parse_md_tables(text):
    """Extract all markdown tables from text. Returns list of tables,
    each table is a list of rows, each row is a list of cell strings."""
    tables = []
    current_table = []
    for line in text.split("\n"):
        line = line.strip()
        if line.startswith("|") and line.endswith("|"):
            # Skip separator rows (|---|---|)
            if re.match(r"^\|[\s\-:|]+\|$", line):
                continue
            cells = [re.sub(r"\*\*|<br>", " ", c).strip() for c in line.split("|")[1:-1]]
            current_table.append(cells)
        else:
            if current_table:
                tables.append(current_table)
                current_table = []
    if current_table:
        tables.append(current_table)
    return tables


# ---------------------------------------------------------------------------
# Extraction from markdown tables
# ---------------------------------------------------------------------------

def extract_costs_from_text(text):
    """Extract BKP costs from inline text (armasuisse format).
    Handles patterns like:
      - 'BKP 1 Vorbereitungsarbeiten 454'600'
      - '1<br>Vorbereitungsarbeiten:  444'000'
      - '1  Vorbereitungsarbeiten  1'200'000'
    """
    costs = {}

    # Expand <br> to newlines for easier parsing
    expanded = text.replace("<br>", "\n")

    # Pattern 1: "BKP N Name Amount" (Schwarzenburg format)
    for m in re.finditer(r"BKP\s+(\d{1,2})\s+([A-Za-z\u00c0-\u00ff\s\-/.]+?)\s+([\d\s'\u2019]+?)(?:\s|$)", expanded):
        code = m.group(1)
        name = m.group(2).strip().rstrip(":")
        val = parse_number(m.group(3))
        if code in BKP_NAMES and val and val >= 1000:
            costs[code] = {"name": name, "amount": val}

    # Pattern 2: "N  Name  Amount" anywhere in line after <br> expansion
    lines = expanded.split("\n")
    for i, line in enumerate(lines):
        line = line.strip()
        # Start of line: "1   Vorbereitungsarbeiten  1'200'000"
        m = re.match(r"^(\d{1,2})\s{2,}([A-Za-z\u00c0-\u00ff\s\-/.]+?):?\s{2,}([\d\s'\u2019.]+)", line)
        if m:
            code = m.group(1)
            name = m.group(2).strip()
            val = parse_number(m.group(3))
            if code in BKP_NAMES and val and val >= 1000:
                costs.setdefault(code, {"name": name, "amount": val})
            continue
        # Mid-line: "...text  1   Vorbereitungsarbeiten  1'200'000" (Emmen format)
        for mm in re.finditer(r"(?:^|\s)(\d{1,2})\s{2,}([A-Za-z\u00c0-\u00ff\s\-/.]+?):?\s{2,}([\d\s'\u2019.]+?)(?:\s*$|\s{2,})", line):
            code = mm.group(1)
            name = mm.group(2).strip()
            val = parse_number(mm.group(3))
            if code in BKP_NAMES and val and val >= 1000:
                costs.setdefault(code, {"name": name, "amount": val})
        # "1  Vorbereitungsarbeiten:" on one line, amount on next
        m2 = re.match(r"^(\d{1,2})\s+([A-Za-z\u00c0-\u00ff\s\-/.]+?):?\s*$", line)
        if m2 and i + 1 < len(lines):
            code = m2.group(1)
            name = m2.group(2).strip()
            nxt = lines[i + 1].strip()
            val = parse_number(nxt)
            if code in BKP_NAMES and val and val >= 1000:
                costs.setdefault(code, {"name": name, "amount": val})

    # Gesamtkosten / Total
    for m in re.finditer(r"(?:Gesamtkosten|Total|Anlagekosten)\s+([\d\s'\u2019.]+)", expanded, re.IGNORECASE):
        val = parse_number(m.group(1))
        if val and val >= 10000:
            costs.setdefault("AK", {"name": "Gesamtkosten", "amount": val})
            break

    # Quantities from inline text
    quantities = {}
    m_unit = r"m\s*(?:\[?\s*[23]\s*\]?|[23\u00b2\u00b3])"  # matches m2, m3, m[2], m[3], m², m³
    for m in re.finditer(rf"Geschossfl[a\u00e4 ]{{1,3}}che\s*(?:\(SIA\s*416\))?\s*([\d\s'\u2019]+)\s*{m_unit}", expanded, re.IGNORECASE):
        val = parse_number(m.group(1))
        if val and 50 <= val <= 200_000:
            quantities.setdefault("gf_m2", val)
    for m in re.finditer(rf"(?:Umbauter\s+Raum|Geb[a\u00e4]udevolumen)\s*(?:\(SIA\s*416\))?\s*([\d\s'\u2019]+)\s*{m_unit}", expanded, re.IGNORECASE):
        val = parse_number(m.group(1))
        if val and 100 <= val <= 1_000_000:
            quantities.setdefault("gv_m3", val)
    for m in re.finditer(rf"Hauptnutzfl[a\u00e4 ]{{1,3}}che\s*(?:\((?:SIA\s*416|HNF)\))?\s*([\d\s'\u2019]+)\s*{m_unit}", expanded, re.IGNORECASE):
        val = parse_number(m.group(1))
        if val and 10 <= val <= 200_000:
            quantities.setdefault("hnf_m2", val)
    # Benchmarks — separate patterns for m² and m³
    m2_unit = r"m\s*(?:\[?\s*2\s*\]?|[2\u00b2])"
    m3_unit = r"m\s*(?:\[?\s*3\s*\]?|[3\u00b3])"
    for m in re.finditer(rf"Kosten\s+BKP\s*2\s*/\s*{m2_unit}\s*(?:\(SIA\s*416\))?\s*([\d\s'\u2019.]+)\s*(?:CHF)?", expanded, re.IGNORECASE):
        val = parse_number(m.group(1))
        if val and 200 <= val <= 20_000:
            quantities.setdefault("chf_m2_gf_bkp2", val)
    for m in re.finditer(rf"Kosten\s+BKP\s*2\s*/\s*{m3_unit}\s*(?:\(SIA\s*416\))?\s*([\d\s'\u2019.]+)\s*(?:CHF)?", expanded, re.IGNORECASE):
        val = parse_number(m.group(1))
        if val and 50 <= val <= 5_000:
            quantities.setdefault("chf_m3_gv_bkp2", val)

    return costs, quantities


def extract_costs_from_tables(tables):
    """Extract BKP and eBKP-H costs from markdown tables."""
    costs = {}

    for table in tables:
        for row in table:
            if len(row) < 2:
                continue

            # Clean cells: remove bold markers, <br> tags
            cells = row

            # Look for BKP numeric codes (1-29) with amounts
            for i, cell in enumerate(cells):
                # Cell contains a BKP code like "1", "2", "20", etc.
                code_match = re.match(r"^(\d{1,2})\s*$", cell)
                if not code_match:
                    # Also try "1 Vorbereitungsarbeiten" in one cell
                    code_match = re.match(r"^(\d{1,2})\s+\w", cell)

                if code_match:
                    code = code_match.group(1)
                    if code not in BKP_NAMES:
                        continue

                    # Find the amount in remaining cells
                    for j in range(i + 1, len(cells)):
                        val = parse_number(cells[j])
                        if val and val >= 1000:
                            # Determine name from adjacent cell or BKP_NAMES
                            name = None
                            if i + 1 < len(cells) and j > i + 1:
                                name = re.sub(r"^(\d{1,2}\s+)", "", cells[i + 1] if cells[i + 1] else "").strip().rstrip(":")
                            if not name or len(name) < 3:
                                name = BKP_NAMES.get(code, "")
                            # Also check if code + name are in same cell
                            combined = re.match(r"^\d{1,2}\s+(.+)", cell)
                            if combined:
                                name = combined.group(1).strip().rstrip(":")

                            costs[code] = {"name": name, "amount": val}
                            break
                    continue

                # eBKP-H letter codes: "A", "B", ... "Z"
                ebkph_match = re.match(r"^([A-Z])\s*$", cell)
                if not ebkph_match:
                    ebkph_match = re.match(r"^([A-Z])\s+\w", cell)
                if ebkph_match:
                    code = ebkph_match.group(1)
                    if code not in EBKPH_NAMES:
                        continue
                    for j in range(i + 1, len(cells)):
                        val = parse_number(cells[j])
                        if val and val >= 100:
                            name = EBKPH_NAMES.get(code, "")
                            costs[code] = {"name": name, "amount": val}
                            break

            # Also look for "Baukosten" label rows with costs in subsequent rows
            first_cell = row[0] if row else ""

            # Name-based matching: "|Baukosten|Vorbereitungsarbeiten|CHF|11 000|"
            # Only match if row contains "CHF" or "Baukosten" context
            if len(cells) >= 3:
                row_text = " ".join(cells).lower()
                has_cost_context = "chf" in row_text or "baukosten" in row_text or "kosten" in first_cell.lower()
                if has_cost_context:
                    for cell_idx in range(len(cells)):
                        label = cells[cell_idx].strip().rstrip(":")
                        label_lower = label.lower()
                        # Try exact BKP name lookup
                        code = BKP_NAME_TO_CODE.get(label_lower)
                        if code:
                            for j in range(cell_idx + 1, len(cells)):
                                val = parse_number(cells[j])
                                if val and val >= 1000:
                                    costs.setdefault(code, {"name": label, "amount": val})
                                    break
                            break

            # "Gesamtkosten|CHF|700 000" or "Total|15'933'000"
            for cell_idx, cell_val in enumerate(cells):
                cell_lower = cell_val.lower().strip()
                if cell_lower in ["gesamtkosten", "total", "anlagekosten", "total anlagekosten"]:
                    for j in range(cell_idx + 1, len(cells)):
                        val = parse_number(cells[j])
                        if val and val >= 10000:
                            costs.setdefault("AK", {"name": cell_val.strip(), "amount": val})
                            break
                    break

    return costs


def _find_quantity_in_row(cells, unit_pattern, min_val, max_val):
    """Find a numeric value in a table row, validating the adjacent cell contains the expected unit.
    Returns the first valid value, or None."""
    for i, cell in enumerate(cells):
        val = parse_number(cell)
        if val and min_val <= val <= max_val:
            # Check adjacent cells for unit confirmation
            neighbors = []
            if i > 0: neighbors.append(cells[i - 1].lower())
            if i + 1 < len(cells): neighbors.append(cells[i + 1].lower())
            context = cell.lower() + " " + " ".join(neighbors)
            if re.search(unit_pattern, context):
                return val
    # Fallback: return first valid number if no unit confirmation possible
    for cell in cells:
        val = parse_number(cell)
        if val and min_val <= val <= max_val:
            return val
    return None


def extract_quantities_from_tables(tables):
    """Extract GF, GV, NGF, HNF from markdown tables."""
    q = {}

    for table in tables:
        for row in table:
            cells = row
            full_row = " ".join(cells).lower()

            # GF patterns — must have m² context, NOT m³
            if any(k in full_row for k in ["geschossfläche", "geschossflache", "geschossfl"]) and "m" in full_row:
                # Check if this row specifically mentions m² (not m³)
                if re.search(r"m[2²]|m\s*2\b", full_row) or not re.search(r"m[3³]", full_row):
                    val = _find_quantity_in_row(cells, r"m[2²\s]*$|m\s*2", 50, 200_000)
                    if val:
                        q.setdefault("gf_m2", val)

            # GV patterns — must have m³ context
            if any(k in full_row for k in ["gebäudevolumen", "gebaudevolumen", "umbauter raum"]) and "m" in full_row:
                val = _find_quantity_in_row(cells, r"m[3³\s]*$|m\s*3", 100, 1_000_000)
                if val:
                    q.setdefault("gv_m3", val)

            # NGF
            if any(k in full_row for k in ["nettogeschoss", "ngf"]) and "m" in full_row:
                for cell in cells:
                    val = parse_number(cell)
                    if val and 50 <= val <= 200_000:
                        q.setdefault("ngf_m2", val)

            # HNF
            if any(k in full_row for k in ["hauptnutzfl", "hnf"]) and "m" in full_row:
                for cell in cells:
                    val = parse_number(cell)
                    if val and 10 <= val <= 200_000:
                        q.setdefault("hnf_m2", val)

            # Benchmarks: CHF/m² and CHF/m³ — must distinguish unit types
            is_m2_row = any(k in full_row for k in ["m2", "m²", "/m2", "/m²", "m\u00b2"])
            is_m3_row = any(k in full_row for k in ["m3", "m³", "/m3", "/m³", "m\u00b3"])
            has_bkp2 = "bkp 2" in full_row or "gebäudekosten" in full_row or "gebaudekosten" in full_row

            if "chf" in full_row and is_m2_row and not is_m3_row and has_bkp2:
                for cell in cells:
                    val = parse_number(cell)
                    if val and 200 <= val <= 20_000:
                        q.setdefault("chf_m2_gf_bkp2", val)

            if "chf" in full_row and is_m3_row and not is_m2_row and has_bkp2:
                    for cell in cells:
                        val = parse_number(cell)
                        if val and 50 <= val <= 5_000:
                            q.setdefault("chf_m3_gv_bkp2", val)

    return q


def extract_metadata_from_tables(tables):
    """Extract metadata (client, architect, etc.) from markdown tables."""
    meta = {}
    keyword_map = {
        "bauherr": "client_name", "bauherrin": "client_name",
        "maître": "client_name", "committente": "client_name",
        "architektur": "architect", "architekt": "architect", "architecture": "architect",
        "generalplaner": "general_planner", "planificateur": "general_planner",
        "generalunternehmer": "general_contractor",
        "bauingenieur": "structural_engineer",
        "planungsbeginn": "planning_start",
        "baubeginn": "construction_start", "début": "construction_start",
        "fertigstellung": "completion", "bezug": "completion", "fin": "completion",
        "bauende": "completion",
    }

    for table in tables:
        for row in table:
            cells = row
            if not cells:
                continue

            first_lower = cells[0].lower()
            for keyword, field in keyword_map.items():
                if keyword in first_lower:
                    # Value is in the next non-empty cell
                    for j in range(1, len(cells)):
                        if cells[j] and len(cells[j]) > 2:
                            meta.setdefault(field, cells[j])
                            break
                    break

    return meta


def extract_timeline_from_tables(tables):
    """Extract timeline milestones from markdown tables."""
    milestones = []
    seen = set()
    patterns = {
        "planungsbeginn": ["planungsbeginn", "début de planification"],
        "wettbewerb": ["wettbewerb", "projektwettbewerb", "concours"],
        "baubeginn": ["baubeginn", "début des travaux", "début de construction"],
        "bauende": ["fertigstellung", "bezug", "bauende", "übergabe", "fin des travaux", "mise en service"],
    }

    for table in tables:
        for row in table:
            cells = row
            full_lower = " ".join(cells).lower()

            for milestone, keywords in patterns.items():
                if milestone in seen:
                    continue
                for kw in keywords:
                    if kw in full_lower:
                        # Find the date value — typically the last non-empty cell
                        for cell in reversed(cells):
                            if cell and re.search(r"\d{4}|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|janvier|février|mars|avril|juin|juillet|août|septembre|octobre|novembre|décembre", cell.lower()):
                                milestones.append({"milestone": milestone, "value": cell})
                                seen.add(milestone)
                                break
                        break

    return milestones


# ---------------------------------------------------------------------------
# Full extraction from markdown
# ---------------------------------------------------------------------------

def extract_from_markdown(md_path, verbose=False):
    """Extract all structured data from a markdown file."""
    text = Path(md_path).read_text(encoding="utf-8")
    tables = parse_md_tables(text)

    if verbose:
        print(f"  Tables found: {len(tables)}")
        for i, t in enumerate(tables):
            print(f"    Table {i}: {len(t)} rows x {max(len(r) for r in t) if t else 0} cols")

    costs = extract_costs_from_tables(tables)
    quantities = extract_quantities_from_tables(tables)
    metadata = extract_metadata_from_tables(tables)
    timeline = extract_timeline_from_tables(tables)

    # Supplement with text-based extraction (handles armasuisse inline formats)
    text_costs, text_quantities = extract_costs_from_text(text)
    for k, v in text_costs.items():
        costs.setdefault(k, v)  # table results take priority
    for k, v in text_quantities.items():
        quantities.setdefault(k, v)

    # Also try regex on full text for fields not in tables
    description = None
    for header in ["Ausgangslage", "Projektbeschrieb", "Projektbeschreibung",
                   "Contexte", "Description du projet"]:
        idx = text.find(header)
        if idx >= 0:
            after = text[idx + len(header):]
            # Take first paragraph (non-table, non-heading text)
            paragraphs = re.split(r"\n\n+", after)
            for p in paragraphs:
                p = p.strip()
                if p and len(p) > 50 and not p.startswith("|") and not p.startswith("#"):
                    description = p[:2000]
                    break
            if description:
                break
    if not description:
        # Fallback: longest non-table paragraph
        paragraphs = re.split(r"\n\n+", text)
        best = ""
        for p in paragraphs:
            p = p.strip()
            if len(p) > len(best) and len(p) > 100 and not p.startswith("|") and not p.startswith("#"):
                best = p
        if best:
            description = best[:2000]

    return {
        "costs": costs,
        "quantities": quantities,
        "metadata": metadata,
        "timeline": timeline,
        "description": description,
        "tables_found": len(tables),
    }


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Extract structured data from Markdown (Stage 2)")
    parser.add_argument("md", nargs="?", help="Path to single markdown file")
    parser.add_argument("--all", action="store_true", help="Process all markdown files")
    parser.add_argument("--source", help="Filter by source prefix")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    parser.add_argument("--dry-run", action="store_true", help="Show results without DB update")
    args = parser.parse_args()

    if args.md:
        result = extract_from_markdown(args.md, verbose=True)
        print(f"\nCosts ({len(result['costs'])}):")
        for code, info in sorted(result["costs"].items()):
            print(f"  BKP {code}: {info['name']} = CHF {info['amount']:,.0f}")
        print(f"\nQuantities: {result['quantities']}")
        print(f"\nMetadata:")
        for k, v in result["metadata"].items():
            print(f"  {k}: {v}")
        print(f"\nTimeline:")
        for t in result["timeline"]:
            print(f"  {t['milestone']}: {t['value']}")
        print(f"\nDescription: {result['description'][:100] + '...' if result['description'] else 'None'}")
        return

    if args.all:
        mds = sorted(MD_DIR.glob("*.md"))
        if args.source:
            mds = [m for m in mds if m.name.startswith(args.source)]
        mds = [m for m in mds if not m.name.startswith("_")]

        print(f"Markdown extraction (Stage 2)")
        print(f"  Files: {len(mds)}")
        print()

        stats = {"with_costs": 0, "with_gf": 0, "with_meta": 0, "total": 0}

        for i, md in enumerate(mds):
            stats["total"] += 1
            result = extract_from_markdown(md, verbose=args.verbose)
            has_costs = len(result["costs"]) > 0
            has_gf = "gf_m2" in result["quantities"]

            if has_costs:
                stats["with_costs"] += 1
            if has_gf:
                stats["with_gf"] += 1
            if result["metadata"]:
                stats["with_meta"] += 1

            cost_codes = sorted(result["costs"].keys())
            gf = result["quantities"].get("gf_m2")
            total = result["costs"].get("2", result["costs"].get("AK", {})).get("amount")

            prefix = f"[{i + 1}/{len(mds)}]"
            status = "A" if has_costs and has_gf else "B" if has_costs or has_gf else "C"
            print(f"{prefix} [{status}] {md.stem[:50]}  costs:{','.join(cost_codes) or '-'}  GF:{gf or '-'}  total:{total or '-'}")

        print(f"\n{'=' * 60}")
        print(f"Total:     {stats['total']}")
        print(f"With costs: {stats['with_costs']} ({stats['with_costs'] / max(stats['total'], 1) * 100:.0f}%)")
        print(f"With GF:    {stats['with_gf']} ({stats['with_gf'] / max(stats['total'], 1) * 100:.0f}%)")
        print(f"With meta:  {stats['with_meta']} ({stats['with_meta'] / max(stats['total'], 1) * 100:.0f}%)")
        return

    parser.print_help()


if __name__ == "__main__":
    main()
