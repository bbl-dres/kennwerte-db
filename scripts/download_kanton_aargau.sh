#!/usr/bin/env bash
# download_kanton_aargau.sh — Download Baudokumentationen PDFs from Kanton Aargau
#
# Source: https://www.ag.ch/de/themen/planen-bauen/immobilien/immobilienprojekte
# PDFs:   https://www.ag.ch/media/kanton-aargau/dfr/dokumente/immobilien/projekte/baudokumentationen/
#
# Usage:
#   bash scripts/download_kanton_aargau.sh           # download all
#   bash scripts/download_kanton_aargau.sh --dry-run  # preview only

set -euo pipefail

BASE_URL="https://www.ag.ch/media/kanton-aargau/dfr/dokumente/immobilien/projekte/baudokumentationen"
OUT_DIR="data/pdfs"

DRY_RUN=false
FORCE=false
for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --force)   FORCE=true ;;
  esac
done

mkdir -p "$OUT_DIR"

# Known PDFs: number|short_name|relative_url
# Numbering verified from back-cover project lists in multiple PDFs.
# 034: Anbau Bezirksgericht Rheinfelden — URL not yet found
# 035: JVA Produktionsgebaeude Lenzburg — URL not yet found
# 036: Strassenverkehrsamt Schafisheim — URL not yet found
# 039: Instandsetzung Fuenfstern JVA Lenzburg — URL not yet found
# 040: Erweiterung Zentralgefaengnis Lenzburg — URL not yet found
# 043: Dreifachsporthalle Kantonsschule Wettingen — URL not yet found
# 045: Zivilschutzausbildungszentrum Eiken — URL not yet found
PDFS=(
  "033|campus-fhnw-brugg-windisch|doku-campus-fhnw-brugg-windisch.pdf"
  "037|verwaltungsgebaeude-rheinfelden|kohlplatz-rheinfelden-neubau/2015-037-baudoku-verwaltungsgeb-rheinfelden-neubau.pdf"
  "038|landwirtschaftliches-zentrum-liebegg|landwirtschaftliches-zentrum-liebegg-neubau-multifunktionshalle.pdf"
  "041|kantonale-notrufzentrale-aarau|041-knz-efi-dokumentation.pdf"
  "042|werkhof-wohlen|ag17-werkhof-wohlen.pdf"
  "044|forstwerkhof-maiholz-muri|044-forstwaldhof-maiholz.pdf"
  "046|amt-fuer-verbraucherschutz|brosch-re-amtfuerverbraucherschutz.pdf"
)

echo "Kanton Aargau Baudokumentationen Downloader"
echo "  Known brochures: ${#PDFS[@]} (No 033-046)"
echo "  Output:          $(cd "$OUT_DIR" && pwd)"
echo ""

SUCCESS=0
SKIPPED=0
FAILED=0

for entry in "${PDFS[@]}"; do
  IFS='|' read -r NUM NAME REL <<< "$entry"
  LOCAL="kanton-aargau_hochbau_${NUM}_${NAME}.pdf"
  DEST="${OUT_DIR}/${LOCAL}"
  URL="${BASE_URL}/${REL}"

  echo "[${NUM}] ${NAME}"

  if [ -f "$DEST" ] && [ "$FORCE" = false ]; then
    SIZE=$(du -h "$DEST" | cut -f1)
    echo "  SKIP  ${SIZE} already exists: ${LOCAL}"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  if [ "$DRY_RUN" = true ]; then
    echo "  [DRY-RUN] Would download: ${URL}"
    echo "            -> ${DEST}"
    SUCCESS=$((SUCCESS + 1))
    continue
  fi

  HTTP_CODE=$(curl -sL -w "%{http_code}" -o "$DEST" \
    -H "User-Agent: Mozilla/5.0 (kennwerte-db research)" \
    --max-time 60 \
    "$URL" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] && [ -f "$DEST" ]; then
    SIZE=$(du -h "$DEST" | cut -f1)
    echo "  OK  ${SIZE}  ${LOCAL}"
    SUCCESS=$((SUCCESS + 1))
  else
    echo "  FAIL  HTTP ${HTTP_CODE}: ${URL}"
    rm -f "$DEST"
    FAILED=$((FAILED + 1))
  fi

  # Be polite
  sleep 0.5
done

echo ""
echo "============================================================"
echo "  Downloaded: ${SUCCESS}"
echo "  Skipped:    ${SKIPPED}"
echo "  Failed:     ${FAILED}"
echo "  Total:      ${#PDFS[@]}"
