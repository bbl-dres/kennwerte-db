# kennwerte-db

<p align="center">
  <a href="https://bbl-dres.github.io/kennwerte-db/">
    <img src="assets/social-preview.jpg" alt="Construction documents converted into structured cost benchmarks" width="100%">
  </a>
</p>

[![Demo](https://img.shields.io/badge/demo-GitHub%20Pages-2ea44f?logo=github&logoColor=white)](https://bbl-dres.github.io/kennwerte-db/)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

> [!CAUTION]
> Unofficial research prototype. Source documents are public, but extracted benchmark data can be incomplete or incorrect and must be verified before use.

Construction-cost benchmark explorer for Swiss public buildings, including area- and volume-based indicators plus BKP and eBKP-H breakdowns.

## Demo

**Live demo:** https://bbl-dres.github.io/kennwerte-db/

<p align="center">
  <img src="assets/preview-1.jpg" alt="Construction-cost benchmark project gallery" width="49%" align="top"/>
  <img src="assets/preview-2.jpg" alt="Construction-cost benchmark project details" width="49%" align="top"/>
</p>

## Features

- Browse projects in gallery, list, map, and dashboard views.
- Compare SIA 416 quantities and BKP/eBKP-H cost breakdowns.
- Filter by source, category, canton, construction type, quality, year, and size.
- Explore peer comparisons and cost distributions.
- Estimate costs from a filtered comparison set.
- Search project, location, and architect metadata.

## Run locally

```bash
python -m http.server 8000
```

Open <http://localhost:8000/>.

## Documentation

- [Data sources](docs/SOURCES.md)
- [Extraction pipeline](docs/PIPELINE.md)
- [Data model](docs/DATAMODEL.md)
- [Requirements](docs/REQUIREMENTS.md)

## License

[MIT License](LICENSE). Source documents and third-party tools retain their own terms.
