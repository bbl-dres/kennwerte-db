#!/bin/bash
# Download Stadt Zuerich Baudokumentation PDFs
# Source: https://www.stadt-zuerich.ch/de/aktuell/publikationen.html (search: Baudokumentation)
# Bauherr: Stadt Zuerich, Hochbaudepartement (HBD)
set -e
cd "$(dirname "$0")"

mkdir -p stadt_zuerich

download() {
  local url="$1"
  local filename
  filename=$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1].split('/')[-1]))" "$url" 2>/dev/null || echo "$(basename "$url")")
  if [ ! -f "stadt_zuerich/$filename" ]; then
    echo "Downloading: $filename"
    curl -sL --retry 3 -o "stadt_zuerich/$filename" "$url"
  else
    echo "Exists: $filename"
  fi
}

# 2026
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2026/baudokumentationen/wohnsiedlung-birkenhof-baudokumentation.pdf"

# 2025
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2025/baudokumentationen/wohnsiedlung-bullingerhof-baudokumentation.pdf"

# 2024
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2024/baudokumentationen/schulanlage-allmend-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2024/baudokumentationen/schulanlage-hofacker-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2024/baudokumentationen/schulanlage-freilager-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2024/baudokumentationen/wohnsiedlung-au-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2024/baudokumentationen/gesundheitszentrum-alter-mathysweg-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2024/baudokumentationen/kriminalabteilung-stadtpolizei-zuerich-muehleweg-baudokumentation.pdf"

# 2023
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2023/baudokumentationen/ehemalige-landwirtschaftsbauten-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2023/baudokumentationen/vbz-busgarage-hardau-erz-werkhof-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2023/baudokumentationen/schule-campus-glattal-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2023/baudokumentationen/agila-anmietgeschaefte-baudokumentation.pdf"

# 2022
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2022/baudokumentationen/wohnsiedlung-hornbach-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2022/baudokumentationen/kinderhaus-entlisberg-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2022/baudokumentationen/gesundheitszentrum-alter-wolfswinkel-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2022/baudokumentationen/tramdepot-elisabethenstrasse-baudokumentation.pdf"

# 2021
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2021/baudokumentationen/kongresshaus-tonhalle-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2021/baudokumentationen/erweiterung-kunsthaus-zuerich-nachhaltiges-bauen-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/aktuell/publikationen/2021/baudokumentationen/erweiterung-kunsthaus-zuerich-neubau-baudokumentation.pdf"

# Legacy path (older publications)
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Sportzentrum-Heuried.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Gruppe-Express-Projekte.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Schulanlage-Auhof.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Schulanlage-Blumenfeld.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Werkhof-Albisguetli.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Friedhof-Forum-Sihlfeld.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Tramdepot-Wollishofen.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Wohnsiedlung-Zurlinden.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Instandsetzung-Kleinere-Wohnbauten.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Wohnsiedlung-Nordstrasse.pdf"
download "https://www.stadt-zuerich.ch/content/dam/stzh/hbd/Deutsch/Hochbau/Weitere%20Dokumente/Staedtische_Bauten_realisiert/Baudokumentation/Pflegezentrum-Entlisberg.pdf"

# Portfolio path
download "https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/portfolio/dokumente/bauten-anlagen/baudokumentationen/hallenbad-city-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/portfolio/dokumente/bauten-anlagen/baudokumentationen/jugendkulturhaus-dynamo-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/portfolio/dokumente/bauten-anlagen/baudokumentationen/schulanalage-schauenberg-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/portfolio/dokumente/bauten-anlagen/baudokumentationen/schulanlage-pfingstweid-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/portfolio/dokumente/bauten-anlagen/baudokumentationen/werkstaetten-logistk-baudokumentation.pdf"
download "https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/portfolio/dokumente/bauten-anlagen/baudokumentationen/schulpavillon-allenmoos-baudokumentation.pdf"

echo ""
echo "Stadt Zuerich download complete!"
