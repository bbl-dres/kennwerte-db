#!/bin/bash
# Download armasuisse (VBS) Bautendokumentationen PDFs
# Source: https://www.ar.admin.ch/de/bautendokumentationen
# Bauherr: armasuisse Immobilien (VBS)
set -e
cd "$(dirname "$0")"

mkdir -p armasuisse

download() {
  local url="$1"
  local filename
  filename=$(python3 -c "import urllib.parse,sys; print(urllib.parse.unquote(sys.argv[1].split('/')[-1]))" "$url" 2>/dev/null || echo "$(basename "$url")")
  if [ ! -f "armasuisse/$filename" ]; then
    echo "Downloading: $filename"
    curl -sL --retry 3 -o "armasuisse/$filename" "$url"
  else
    echo "Exists: $filename"
  fi
}

# Industrie und Gewerbe
download "https://www.ar.admin.ch/dam/de/sd-web/Z-27wWqPWcqm/4S_bautendoku_grolley_high_end_23012020.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/VNz-leDtv1ng/Munitionsmagazin_Haldenstein_Cuira_GR_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/mAz6HsXgPLbk/MilitaerflugplatzAlpnachOWSanierungHallen2und3sowieNeubauHalle4_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/Lvxq1NaBvLuW/6-S-bautendoku_emmen_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/CAwnUXq-f9-j/PDF-Version_6-S-bautendoku_thun_ausbildungszentrum_20250826.pdf"

# Handel und Verwaltung
download "https://www.ar.admin.ch/dam/de/sd-web/6Bh9AtPPlf1Z/WaffenplatzBure_JU_highend_21112018.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/outVN-YFfcmh/thun_armeelogistikcenter_webversion_06102017_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/H9zZcywJPBIB/HinwilZHLogistikzentrum_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/8usFj5qALDFP/GrolleyFRCentrelogistiquedelarme1retape.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/ofMgrw72NNH8/GrolleyFRCentrelogistiquedelarmehalleatelierpourvhiculeslourds.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/VlO3GTknXJXa/KompetenzzentrumABCKAMIRinSpiezBENeubauSanierungUnterkunftundKantine_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/vSQRcEO3Qwlx/MonteceneriTICentrologisticodellesercitoTappa1Nuovoedificio.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/dWmI1xJCk20J/LogistikgebaeudeSchiessplatzWichlenElm_DE.pdf"

# Unterkunft und Verpflegung
download "https://www.ar.admin.ch/dam/de/sd-web/oQ5MTSRuh8t4/Hussy_Bautendoku_5042020_PDF_high.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/sqodyBW900JX/91759afb-3ceb-4f36-81d9-b642ba9e1957.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/urxLgASksAUY/6cb08f7d-54a1-4fd3-bd7f-8b534293c7cd.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/eMZAMz6NlaRD/Waffenplatz_Jassbach_Linden_BE_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/IyOJiEYcQi1Z/EAZSEidgAusbildungszentrumSchwarzenburg_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/N2xqOEEU1IK7/Place%20d%20armes%20de%20Biere%20VD.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/xcIlfjl0vgC-/MilitaerflugplatzAlpnachOWNeubauTruppenundPersonalunterkunftChilcherli_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/bqMfXqCRaDVW/PlacedarmesdeDrognensFRAssainissementgnralettransformations.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/nHkO2zlnsBen/BasearienneSionVSCampdetroupeLesMerisiers.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/mlJNAcPNm4pF/WaffenplatzThunBEGesamtsanierungDufourkasernemitEinbaueinesVerpflegungszentrums_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/B8g2fdxvVFt-/FlugplatzAlpnachOWNeubauInfrastrukturgebaeudeBroundVerpflegung_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/q9iRSzYDBGzD/WaffenplatzThunBEGesamtsanierungMannschaftskaserneII_DE.pdf"

# Freizeit, Sport, Erholung
download "https://www.ar.admin.ch/dam/de/sd-web/yHA7yTAGNCL8/base%20a%C3%A9rienne%20de%20payerne%20halle%20%C3%A0%20usages%20multiples.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/PdzrUaXGLoU1/11543ce8-dfc9-457a-a0ef-369255b20d73.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/wGsMiOlCVmtf/4-S-bautendoku_high-end_20210923.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/wdVBa1orOp8i/WaffenplatzThunBENeubauSporthalle_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/JHgSZGXui8Ys/WaffenplatzEmmenLUGesamtsanierungMehrzweckhalleMZH_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/5Cxjfn1jtj2O/Payerne_VD_25102016_DNA-A-1616.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/VIzhOsv3ixwW/4S_bautendoku_isone_high_end_20211116.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/KniGVvMDiFEe/SportanlageAuenfeldWaffenplatzFrauenfeld_DE%20(1).pdf"

# Militaer- und Zivilschutzobjekte
download "https://www.ar.admin.ch/dam/de/sd-web/ZF-5fuAiO2zp/6-S-bautendoku_payerne_centre_doperation_PDF-high-end_20210909.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/Kdp7XGP4JihA/74853280-2fc1-4637-a66d-f6aa37d32228.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/-3Y4zSPaO7wn/5ba29098-6e6a-4d17-beec-676471ae3ca5.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/XQzy13Uryn38/e253673b-8cf7-478f-b989-a762984e7583.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/x-BiTTpQHpqV/6-S-bautendoku_payerne_halle_4_high.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/jr0bHU8coccd/7c6be22d-9eda-4df7-856f-6006b37ae035%20(1).pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/fUFB38EIXapC/AusbildungsgebaeudeGeneralstabsschuleKriensLU_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/hB1MoihHBJnZ/WaffenplatzWangenanderAareBEModernisierunganlagen_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/zoSAVzVY5kSC/WaffenplatzWilbeiStansOberdorfNWKompetenzzentrumSWISSINT_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/vCljqofsPzYj/3fdefab2-470c-4abc-89e6-f786e634739d.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/qiLrFBQy-A6s/WaffenplatzEmmenLU_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/JYIBCqHvPv18/ee9a4783-a6fb-42e9-b5e1-d3be25e15dcf.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/W7YiuDx4-ijM/WaffenplatzThunBESanierungEinstellAusbildungshallenPolygonFIS_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/FEAzxIZT-mOZ/WaffenplatzEmmenLUAnpassungderKommandoundLehrgebaeude_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/ose4cJFcnQ7q/NeubauAusbildungsgebaeudeGAZOstGefechtsausbildungszentrumOstWplStLuzisteigGR_DE.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/vp8IA7hcei3I/CentredinstructionaucombatplacedarmesBureJUHallesdquipementetmaintenance_FR.pdf"

# Verkehrsanlagen
download "https://www.ar.admin.ch/dam/de/sd-web/8UGWOeO-bCcf/cbd53c21-8801-416f-926f-47ace11bb5a2.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/nKVjuPzkVy54/0d3296ad-4b00-48a8-b7f2-5b58854ee227.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/1hkZtYc7us-C/cf6062a3-8943-4a12-9bb5-ffcf8ce2b588.pdf"
download "https://www.ar.admin.ch/dam/de/sd-web/E6of48MjrK54/MilitaerflugplatzEmmenLUAusbauSimulatoren_DE.pdf"

echo ""
echo "armasuisse download complete!"
