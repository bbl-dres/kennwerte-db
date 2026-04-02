#!/bin/bash
# Download all BBL Bautendokumentationen PDFs
set -e
cd "$(dirname "$0")"

download() {
  local dir="$1"
  local url="$2"
  local filename
  filename=$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1].split('/')[-1]))" "$url" 2>/dev/null || echo "$(basename "$url")")
  if [ ! -f "$dir/$filename" ]; then
    echo "Downloading: $dir/$filename"
    curl -sL --retry 3 -o "$dir/$filename" "$url"
  else
    echo "Exists: $dir/$filename"
  fi
}

# Bundeshaus
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/T7OhMptEn-u4/20231101_Bern%2C%20Eigerplatz%201%2C%20Instandsetzung_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/KlrxaPH-Ir7X/20180501_Bern%2C%20Bundeshausperimeter%2C%20St%C3%BCtzmauer_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/4o24cRZ8Su4y/20180301_Bern%20Kochergasse%2010%2C%20Instandsetzung%20Bundeshaus%20Nord_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/vGxnRClnW5pW/20171201_Bern%2C%20Christoffelgasse%205%2C%20Sanierung_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/EC4nZ0vsL7xA/20171201_Bern%20Bundeshausperimeter%2C%20Gesamtkonzept%20Umgebung_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/jfGGfPbCvCYM/20170201_Bern%20Bundesplatz%203%2C%20Restaurierung%20Wandelhalle%20und%20Nebenr%C3%A4ume_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/xp4nuuvDAseT/20160601_Bern%20Kochergasse%209%2C%20Umbau%20und%20Sanierung%20Bundeshaus%20Ost_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/kdngNewNIDEq/20120901_Bern%20Junkerngasse%2059%2C%20Sanierung%20Beatrice%20von%20Wattenwyl-Haus_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/tNCkUTO5n9Zi/20120501_Bern%2C%20Junkerngasse%2059%2C%20Sanierung%20Gartenanlage_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/OwwoluFd2bW2/20120201_Bern%2C%20Bundesplatz%203%2C%20Sanierung%20St%C3%A4nderatssaal_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/NV63kW77mF5i/20111001_Bern%2C%20Bundesgasse%201%2C%20Arbeitsr%C3%A4ume%20Bundesrat_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/hRIpwDuWboOA/20110901_Bern%2C%20Bundesgasse%201%2C%20Behindertenzugang_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/VHecpCu8yM8V/20110901_Bern%2C%20Bundesgasse%2032%2C%20Sanierung_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/xpRh20JjlO-A/20100101_Bern%2C%20Bundesgasse%201%2C%20Sanierung_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/ODdZ0KHKVOuy/20091201_Bern%2C%20Bundesgasse%201%2C%20Sanierung%20Dach%20und%20Fassaden_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/ZVM9jCPnMRDv/20081101_Bern%2C%20Bundesplatz%203%2C%20Modernisierung%20Parlamentsgeb%C3%A4ude_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/qeT3gD6MBUoD/20081101_Bern%2C%20Bundesplatz%203%2C%20Umbau%20%26%20Sanierung%20Parlamentsgeb%C3%A4ude_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/f2JnBOK-jstl/20081101_Bern%2C%20Bundesplatz%203%2C%20Umgang%20mit%20historischer%20Bausubstanzen_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/gRVjdIc39LvZ/20061201_Bern%2C%20Bundesverwaltungsgericht%2C%20Umbau%20und%20Sanierung_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/PA9k4XmlMsja/20060501_Bern%2C%20Bundesgasse%208-12%2C%20Medienzentrum_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/qPKIJq-Cf8Qu/20060101_Bern%2C%20Bundeshaus%20West%2C%20Umbau%20und%20Neubelegung_DE.pdf"
download bundeshaus "https://www.bbl.admin.ch/dam/de/sd-web/s7GlWVBbD4bw/20050101_Bern%2C%20Bundesgasse%203%2C%20Gesamterneuerung%20Bernerhof_DE.pdf"

# Verwaltung
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/As-mSgpYIcn9/20230101_Zollikofen%2C%20Eichenweg%205%2C%20Neubau%20Verwaltungsgeb%C3%A4ude.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/rpE3newdRnYP/20210101_Zollikofen%20Eichenweg%203%2C%20Neubau%20Verwaltungsgeb%C3%A4ude_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/DhpU2Dp9QFh8/20150801_Liebefeld%20Schwarzenburgstrasse%20157%2C%20Neubau%20Verwaltungsgeb%C3%A4ude_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/jqfwHbcelmsj/20130701_Zollikofen%2C%20Eichenweg%201%2C%20Neubau%20Verwaltungsgeb%C3%A4ude_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/j8cRaj4laxgI/20130301_Ittigen%2C%20Worblentalstrasse%2C%20Neubau%20ARE_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/gxzzryZFsegn/20121201_Bern%2C%20Hallwylstrasse%204%2C%20Nutzungsoptimierung%20und%20Unterhalt_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/PoJk0dJV8NJO/20110801_Bern%2C%20Inselgasse%201%2C%20Geb%C3%A4udesanierung_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/lcmtOKfIKe6i/20100701_Bern%20Fellerstrasse%2021%2C%20Erweiterung%20und%20Sanierung_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/6NF9snl30lvF/20091101_Basel%2C%20Elisabethenstrasse%2031%2C%20Gesamtsanierung_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/UzXWC1n8Q4Vb/20090701_Wabern%2C%20Quellenweg%2017%2C%20Neubau%20B%C3%BCrogeb%C3%A4ude%20als%20Modulbau_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/1JWFKIjXMU7u/20090601_Bern%2C%20Einsteinstrasse%202%2C%20Umbau%20und%20Sanierung_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/4p8DtXQAx4l5/20080101_Bern%2C%20Feldeggweg%201%2C%20Geb%C3%A4udesanierung_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/UGqJyRhtmPgo/20071001_Bern%2C%20Eigerstrasse%2061%20%2B%2065%2C%20Geb%C3%A4udesanierung_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/A0-SjSoY-o5l/20071001_Bern%2C%20Fellerstrasse%2015%2C%20Umbau%20und%20Sanierung_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/xh6qfMc1Zyzv/20051001_Ittigen%2C%20M%C3%BChlestrasse%202-6%2C%20Neubau%20Verwaltungszentrum%20UVEK_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/mx8g26StGeg2/20050901%20Chiasso%20-%20Brogeda%2C%20Neues%20Verwaltungsgeb%C3%A4ude%2C%20Zoll_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/nKjkAAXfR5VO/20041101_Bern%2C%20Gurtengasse%205%2C%20Sanierung%20und%20Dachausbau_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/Y1xGxeYfLchA/20040101_Biel%2C%20Neubau%20Verwaltungsgeb%C3%A4ude%20des%20Bundesamtes%20f%C3%BCr%20Kommunikation_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/HoCxKQIu5H4x/20031201_Bern%2C%20Oberzolldirektion%2C%20Neugestaltung%20Caf%C3%A9teria%2C%20Loge%2C%20Treppenh%C3%A4user_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/TICVNBBuOIJI/20031201_Bern%2C%20Verwaltungsgeb%C3%A4ude%2C%20Schwanengasse%202%2C%20Hirschengraben%203_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/tBdZDoLQEJsQ/20030101_Bern%2C%20Institut%20f%C3%BCr%20Geistiges%20Eigentum%20IGE%2C%20Umbau%20und%20Sanierung_DE.pdf"
download verwaltung "https://www.bbl.admin.ch/dam/de/sd-web/Gzphxjfjn8OT/19991201_Bern%2C%20Verwaltungsgeb%C3%A4ude%20Bollwerk%2C%20Gesamtsanierung%201994-99_DE.pdf"

# Kultur und Denkmäler
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/a74sKG5sCA0H/20160101_Z%C3%BCrich%20Museumstrasse%202%20Landesmuseum%20Z%C3%BCrich%20Erweiterung_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/u6Zrv3Wx2zhg/20110401_Windisch%2C%20Arenastrasse%2020%2C%20Sanierung%20Amphitheater_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/du1DDAPAS7Gr/20110301_Wildegg%2C%20Schlossdom%C3%A4ne%2C%20Dach-%20und%20Fassadensanierung_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/J0CtjBU3FYIA/20101001_Winterthur%20Sammlung%20Oskar%20Reinhart%20Am%20R%C3%B6merholz%20Erneuerung_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/uacfjxbyoSKO/20090301_Wildegg%2C%20Schlossdom%C3%A4ne%2C%20Restaurierung%20der%20Innenr%C3%A4ume_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/UJcJBc4I965g/20090201_Z%C3%BCrich%2C%20Museumstrasse%202%2C%20Landesmuseum%2C%20Sanierung%20Bahnhoffl%C3%BCgel%2C%20Architektur_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/BitrBi7SEwkz/20090201_Z%C3%BCrich_Museumstrasse%202%2C%20Landesmuseum%2C%20Sanierung%20Bahnhoffl%C3%BCgel%2C%20Haustechnik_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/CWL3XEyrqwH3/20090201_Z%C3%BCrich%2C%20Museumstrasse%202%2C%20Landesmuseum%2C%20Sanierung%20Bahnhoffl%C3%BCgel%2C%20Statik_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/B66TZzOayoZP/20070901_Affoltern%20am%20Albis%20Umnutzung%20vom%20Zeughaus%20zum%20Sammlungszentrum_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/M5tK85geQq2m/20040101_Bern%20Beatrice%20von%20Wattenwyl%20Haus%20Sanierung%20Dachbereich%20Innenhof%20Keller%20und%20Interieur_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/mjUQG1rB-i-a/20031201_W%C3%A4denswil%2C%20Eidg.%20Forschungsanstalt%20FAW%2C%20Sanierung%20Schlossmauer_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/rTOmKHFzvPtC/20031001_Burg%20zu%20K%C3%BCssnacht%2C%20Gesslerburg%2C%20Sicherung%20der%20Burgruine_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/2JNBuOwUcvGi/20030901_Bern%2C%20Monbijoustrasse%2045-51%2C%20Umnutzung%20zur%20Bundeskunstsammlung_DE.pdf"
download kultur "https://www.bbl.admin.ch/dam/de/sd-web/JzMoBJKNetVy/20030701_Bern%2C%20Helvetiaplatz%2C%20Welttelegrafendenkmal%2C%20Konservierung%20und%20Restaurierung_DE.pdf"

# Parkanlagen und Landwirtschaft
download parkanlagen "https://www.bbl.admin.ch/dam/de/sd-web/Jem44faCiwlM/20140501_Seelisberg%20R%C3%BCtli%20Landschaftsentwicklungskonzept_DE.pdf"
download parkanlagen "https://www.bbl.admin.ch/dam/de/sd-web/GSAFUrlStS18/20101101_Kehrsatz%2C%20Landsitz%20Lohn%2C%20G%C3%A4rtnereigeb%C3%A4ude_DE.pdf"
download parkanlagen "https://www.bbl.admin.ch/dam/de/sd-web/DYfQ3PsRPjk3/20100101_Kehrsatz%20Landsitz%20Lohn%20Parkpflegewerk_DE.pdf"
download parkanlagen "https://www.bbl.admin.ch/dam/de/sd-web/1N7sKr8uqsPQ/20091201_Seelisberg%2C%20R%C3%BCtli%2C%20Um-%20und%20Neubauten_DE.pdf"
download parkanlagen "https://www.bbl.admin.ch/dam/de/sd-web/RrfZC5Wl3qzx/20080301_Seelisberg%2C%20R%C3%BCtli%2C%20Sanierung%20Schiffstation_DE.pdf"
download parkanlagen "https://www.bbl.admin.ch/dam/de/sd-web/uGpkdh7mrJd3/20011101_T%C3%A4nikon%2C%20Neubau%20Milchviehstall%2C%20Eidg.%20Forschungsanstalt%20FAT_DE.pdf"

# Bauten im Ausland
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/blTPOkHhPlZE/20220901_Washington%20DC%2C%20USA%2C%20Sanierung%20der%20Kanzlei_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/lRW7tyiXsvbr/20210301_Mexico%2C%20Mexiko%2C%20Instandsetzung%20der%20Schweizer%20Residenz_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/qFrIl0kieYhI/20201101_Chicago%2C%20USA%2C%20Schweizer%20Generalkonsulat_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/yJudIlfZqWFI/20190101_Tiflis%20Georgien%20Integration%20und%20Instandsetzung%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/vCKyrUqUx9JD/20190101_Seoul%20S%C3%BCdkorea%20Neubau%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/uZVgZ850a6qz/20181201_Moskau%2C%20Pereulok%20Ogorodnaja%2C%20Sloboda%2C%20Neubau%20und%20Sanierung%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/JlwBXJ3XIWUQ/20181101_Khartum%20Sudan%20Inneneinrichtung%20der%20Residenz%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/yrVXj1ihTVNY/20160801_Nairobi%20Kenya%20Neubau%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/IxObZNLfQ10q/20160601_San%20Francisco%20USA%20Generalkonsulat%20und%20Swissnex_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/P8IEmWHk9B2i/20150301_Wien%2C%20%C3%96sterreich%2C%20Umbau%20und%20Sanierung%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/DMsBnTA-ZUVw/20150101_Abidjan%2C%20Republik%20C%C3%B4te%20d%E2%80%99Ivoire%2C%20Neubau%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/7UrsWeIh14BL/20131201_Warschau%2C%20Polen%2C%20Sanierung%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/Dm0RR-fvDSYu/20130901_Algier%2C%20Algerien%2C%20Neubau%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/graMq8YkO0HY/20130401_Sarajevo%2C%20Bosnien%20Kanzlei%20und%20Kooperationsb%C3%BCro_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/6I6MtWvhSAHa/20121201_Port-au-Prince%2C%20Haiti%2C%20Sanierung%20Botschaftsresidenz_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/JSgwXgKOpLfe/20111201_Jakarta%2C%20Indonesien%2C%20Umbau%20der%20Dienstwohnung%20in%20eine%20Residenz_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/FNYreIOdqmR1/20110301_Harare%2C%20Zimbabwe%2C%20Sanierung%20Kanzlei%2C%20Installation%20einer%20Photovoltaikanlage_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/HUC1rKRHJq9E/20101201_Bangkok%2C%20Thailand%2C%20Sanierung%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/3ecgHm0V0FHa/20101101_Tirana%2C%20Albanien%2C%20Neubau%20Kanzlei_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/uY23xv3J7oTY/20090301_Kuala%20Lumpur%2C%20Malaysia%2C%20Sanierung%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/fZm5HdGX7qcb/20070601_Den%20Haag%2C%20Niederlande%2C%20Umbau%20und%20Gesamtsanierung%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/R8yAXWl83xPF/20060801_Washington%20DC%2C%20USA%2C%20Neue%20Residenz%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/xO4ucX66vRJr/20060201_Prag%2C%20Tschechische%20Republik%2C%20Umbau%20und%20Erweiterung%20der%20Schweizer%20Botschaft_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/NMuZhLySH2qb/20050301_Strassburg%2C%20Frankreich%2C%20St%C3%A4ndige%20Vertretung%20der%20Schweiz%20beim%20Europarat_DE.pdf"
download ausland "https://www.bbl.admin.ch/dam/de/sd-web/6KztH5h4iF7L/20001201_Berlin%2C%20Deutschland%2C%20Schweizerische%20Botschaft_DE.pdf"

# Bildung und Forschung
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/OMwamxfdRS-Y/20170701_Davos%20Weissfluhgipfel%20Neubau%20Wetterradarstation_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/8CFxDlxIvvmY/20131101_Pointe%20de%20la%20Plaine%20Morte%2C%20Wallis%2C%20Neubau%20Wetterradarstation_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/PHsxHSWPCNS0/20131001_Davos%2C%20Dorfstrasse%2033%2C%20Bauliche%20Anpassungen%20Weltstrahlungszentrum%20PMODWRC_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/d0fQwsN3n5I2/20121101_W%C3%A4denswil%2C%20Schloss%201%2C%20Agroscope%20ACW%2C%20Empfangs-%20und%20Begegnungszone_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/F1CJYqDwLsmZ/20120101_W%C3%A4denswil%2C%20Schloss%201%2C%20Agroscope%20ACW%2C%20Gew%C3%A4chsh%C3%A4user_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/SC4jvoSxmT3J/20111101_Heimiswil%2C%20Ried%2C%20Erweiterung%20Mikrofilmarchiv_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/M0cpv5imPf9Y/20110401_Interlaken%2C%20Flugplatz%2C%20Neubau%20Schulungsgeb%C3%A4ude%20Grenzwachtkorps_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/-q-Rv2ycB0uR/20101101_Z%C3%BCrich-Affoltern%2C%20Reckenholzstrasse%20191%2C%20Geb%C3%A4udesanierung_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/ZXVrwfheUjgK/20091201_W%C3%A4denswil%2C%20Schloss%201%2C%20Neubau%20Vegetationshalle_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/5U3bqrgbR-kO/20090801_Bern%2C%20Hallwylstrasse%2015%2C%20Nationalbibliothek%2C%20Tiefmagazin%20West_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/GzqOt9cTIT0K/20090201_Z%C3%BCrich-Affoltern%2C%20Reckenholzstrasse%20164%2C%20Neubau%2C%20Lysimeteranlage_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/IM7eitQg-EgG/20081201_Bern%2C%20Archivstrasse%2024%2C%20Teilsanierung_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/2FimvGJpWizh/20080101_Z%C3%BCrich-Affoltern%2C%20Agroscope%20Reckenholz_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/o3rX-f1VBk4z/20050801_Bern%2C%20Papierm%C3%BChlestrasse%2021%20A%2C%20Eidgen%C3%B6ssische%20Milit%C3%A4rbibliothek_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/p9NkwyzBZDfQ/20041201_W%C3%A4denswil%2C%20Agroscope%2C%20Forschungsanstalt%20f%C3%BCr%20Obst-%2C%20Wein-%20und%20Gartenbau%20FAW_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/prx0Rct9DiqK/20040101_Z%C3%BCrich-Fluntern%2C%20NAZ%20Alarmzentrale%2C%20Meteo%20Schweiz_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/3ymvseQERRLQ/20010401_Magglingen%2C%20Einbau%20Seminarraum%20Belair%2C%20Bundesamt%20f%C3%BCr%20Sport%20BASPO_DE.pdf"
download bildung "https://www.bbl.admin.ch/dam/de/sd-web/Ra3TWic3WCOa/20010201_Bern%2C%20Hallwylstrasse%2015%2C%20Schweizerische%20Landesbibliothek_DE.pdf"

# Sport
download sport "https://www.bbl.admin.ch/dam/de/sd-web/29cGCSMzFsRS/20230901_Magglingen%2C%20Alpenstrasse%2018%2C%20Neubau%20L%C3%A4rchenplatz_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/xIYI0KkJEyDZ/20230101_Tenero%2C%20Sportzentrum%20CST%20Geb%C3%A4ude%20Brere_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/Gw4Hn54Doug1/20221101_Magglingen%20Ausbildungshalle_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/GdDrFjGjjmgR/20210501_Magglingen%20End-der-Welt%20Optimierung%20der%20Sporthalle_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/WMthYdID6KZo/20160301_Arbon%2C%20Hafenstrasse%203%2C%20Umbau%20und%20Sanierung%20Bootshaus_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/2Ghw5fnCfP-L/20130701_Tenero%2C%20Centro%20sportivo%20nazionale%20della%20gioventu%20di%20Tenero%20CST_IT.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/BTQrEtLTJrjN/20100901_Magglingen%2C%20Hauptgeb%C3%A4ude%20Gesamtsanierung_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/RkBWQiFGtLcn/20070101_Magglingen%2C%20End%20der%20Welt%2C%20Sanierung%20Sportanlagen_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/IO-IP8fj0Hle/20050201_Magglingen%2C%20Sanierung%20Grand-Hotel_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/lgqcJQE1yqAf/20030601_Magglingen%2C%20Reservations-%20und%20Belegungs-System%2C%20ZUKO-INFO-KASSENSYSTEM_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/tqji0DyUq5mk/20030501_Magglingen%2C%20Neubau%20Hotel%20Bellavista_DE.pdf"
download sport "https://www.bbl.admin.ch/dam/de/sd-web/FgWgvwJS8oTV/19991101_Magglingen%2C%20Sport-TOTO-Halle%2C%20Spielsporthalle%20mit%20Werkhof_DE.pdf"

# Justiz und Polizei
download justiz "https://www.bbl.admin.ch/dam/de/sd-web/iQgjbLk5HkOf/20201101_Lausanne%20Av.%20du%20Tribunal-f%C3%A9d%C3%A9ral%20Sicherung%20der%20Natursteinplatten_DE.pdf"
download justiz "https://www.bbl.admin.ch/dam/de/sd-web/6VQm0OENBwXA/20130801_Bellinzona%20Neubau%20des%20Bundesstrafgerichts_DE.pdf"
download justiz "https://www.bbl.admin.ch/dam/de/sd-web/e01M5q2Y1mBM/20101201_Lausanne%2C%20Av.%20du%20Tribunal-f%C3%A9d%C3%A9ral_Renovation%20der%20Bibliothek_DE.pdf"
download justiz "https://www.bbl.admin.ch/dam/de/sd-web/VuGfW1hyiFS-/20090601_Biel%2C%20L%C3%A4ndtestrasse%2020%2C%20Umnutzung_DE.pdf"

# Zoll
download zoll "https://www.bbl.admin.ch/dam/de/sd-web/L8T9Eq2aX8-u/20170101_Brig-Glis%20Bielstrasse%201%20Neubau%20Zollanlage_DE.pdf"
download zoll "https://www.bbl.admin.ch/dam/de/sd-web/YMr47zVY9cLN/20150501_Liestal%20Kasinostrasse%204%20Zollschule%20Erweiterung%20Modulbau_DE.pdf"
download zoll "https://www.bbl.admin.ch/dam/de/sd-web/8wCSLutMlEFg/Koblenz%2C%20Neubau%20Zoll_DE.pdf"
download zoll "https://www.bbl.admin.ch/dam/de/sd-web/3dCR0R2b-zAm/20110301_Chiasso%20Brogeda%20Zollanlage%20Neubau%20Revisionsgeb%C3%A4ude_DE.pdf"
download zoll "https://www.bbl.admin.ch/dam/de/sd-web/2nYXNjDSHa35/20060301_Rheinfelden%20Gemeinschaftszollanlage%20Autobahn_DE.pdf"
download zoll "https://www.bbl.admin.ch/dam/de/sd-web/lZbSImWb8fpE/Kreuzlingen%2C%20Gemeinschaftszollanlage%2C%20Kreuzlingen-Konstanz_DE.pdf"

# Produktion und Lager
download produktion "https://www.bbl.admin.ch/dam/de/sd-web/6OS0V7fVtcTH/20081001_Payerne%20Flugplatz%20Neue%20B%C3%BCror%C3%A4ume%20und%20Untersuchungshalle_DE.pdf"
download produktion "https://www.bbl.admin.ch/dam/de/sd-web/6FdNv6WFTyGn/20080901_Gen%C3%A8ve%2C%20A%C3%A9roport%20International%2C%20Halle%20de%20fret%2C%20Locaux%20v%C3%A9t%C3%A9rinaires_FR.pdf"
download produktion "https://www.bbl.admin.ch/dam/de/sd-web/0K4TuZJcwZmy/Wabern%2C%20Seftigenstrasse%20264%2C%20Bundesamt%20f%C3%BCr%20Landestopografie_DE.pdf"
download produktion "https://www.bbl.admin.ch/dam/de/sd-web/0fh5gpF118de/Wimmis%20BE%2C%20Areal%20der%20Nitrochemie%20AG_DE.pdf"

# Technische Anlagen
download technik "https://www.bbl.admin.ch/dam/de/sd-web/jTnMNGQvgGsW/20131001_W%C3%A4denswil%20Agroscope%20Leitungskataster%20und%20Entw%C3%A4sserungsplanung_DE.pdf"
download technik "https://www.bbl.admin.ch/dam/de/sd-web/SdMh5OV7rs0T/20121201_Ittigen%2C%20M%C3%BChlestrasse%206%2C%20Photovoltaikanlage_DE.pdf"
download technik "https://www.bbl.admin.ch/dam/de/sd-web/96XfqA5k1zfi/20121001_Bern%20Kirchenfeld%20W%C3%A4rmeverbund%20Bundesgeb%C3%A4ude_DE.pdf"
download technik "https://www.bbl.admin.ch/dam/de/sd-web/JrS8KWQixWfP/20120401_Magglingen%2C%20Bundesamt%20f%C3%BCr%20Sport%2C%20Elektronisches%20Informationssystem_DE.pdf"
download technik "https://www.bbl.admin.ch/dam/de/sd-web/eqj1LLt-D-hb/20101001_Z%C3%BCrich-Affoltern%2C%20Reckenholzstrasse%20191%2C%20Holzschnitzelheizung_DE.pdf"
download technik "https://www.bbl.admin.ch/dam/de/sd-web/rVqD662GwCUm/20080101_Affoltern%20am%20Albis%2C%20Vom%20Zeughaus%20zum%20Sammlungszentrum%20Minergie%20und%20Haustechnik_DE.pdf"
download technik "https://www.bbl.admin.ch/dam/de/sd-web/rnqo2eqYjOV7/20071101_Liebefeld%20Agroscope%2C%20K%C3%A4lteerzeugung%20Grundwasserversorgung_DE.pdf"
download technik "https://www.bbl.admin.ch/dam/de/sd-web/C3QgI5XBN6pL/20060301_Ittigen%2C%20M%C3%BChlestrasse%202-6%2C%20Neubau%20Verwaltungszentrum%20UVEK_DE.pdf"

# Wohnen
download wohnen "https://www.bbl.admin.ch/dam/de/sd-web/CCVfK7vdNXCU/20201001_Vernier%20Chemin%20de%20Poussy%20Dienstwohnungen_DE.pdf"
download wohnen "https://www.bbl.admin.ch/dam/de/sd-web/J-9Pctw1raik/20180701_Bern%20Effingerstrasse%2029%20Sanierung%20und%20Umbau%20zu%20Dienstwohnungen_DE.pdf"

# Verschiedenes
download verschiedenes "https://www.bbl.admin.ch/dam/de/sd-web/smvViv1m3T3G/20230801_Zollikofen%2C%20Areal%20Meielen%20Nord%20Fuss-und%20Fahrradweg_DE.pdf"

echo ""
echo "Download complete!"
