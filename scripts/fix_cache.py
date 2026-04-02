"""Fix empty entries in pdf_texts.json by re-extracting via subprocesses."""
import json
import subprocess
import sys
import os
import tempfile
from pathlib import Path

CACHE = Path("data/pdf_texts.json")

with open(CACHE, "r", encoding="utf-8") as f:
    texts = json.load(f)

empty_paths = [p for p, t in texts.items() if len(t.strip()) < 50 and p.endswith(".pdf")]
print(f"Re-extracting {len(empty_paths)} empty PDFs...")

fixed = 0
for path in empty_paths:
    fwd = path.replace("\\", "/")
    if not os.path.exists(fwd):
        print(f"  SKIP (not found): {Path(path).name[:50]}")
        continue

    # Write extraction script to a temp file
    script = tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False, encoding="utf-8")
    out_path = tempfile.mktemp(suffix=".txt")

    script.write(f"""
import fitz
try:
    doc = fitz.open("{fwd}")
    text = ""
    for i in range(min(2, doc.page_count)):
        text += doc[i].get_text() + "\\n"
    doc.close()
except Exception:
    text = ""

with open("{out_path.replace(chr(92), '/')}", "w", encoding="utf-8") as f:
    f.write(text)
""")
    script.close()

    try:
        proc = subprocess.run(
            [sys.executable, script.name],
            capture_output=True,
            timeout=30,
            env={**os.environ, "PYTHONIOENCODING": "utf-8"},
        )
        if os.path.exists(out_path):
            with open(out_path, "r", encoding="utf-8") as f:
                new_text = f.read()
            if len(new_text.strip()) > 50:
                texts[path] = new_text
                fixed += 1
                print(f"  OK: {Path(path).name[:60]}")
            else:
                print(f"  EMPTY (image-only?): {Path(path).name[:60]}")
        else:
            print(f"  NO OUTPUT (rc={proc.returncode}): {Path(path).name[:60]}")
            if proc.stderr:
                print(f"    {proc.stderr[:200]}")
    except subprocess.TimeoutExpired:
        print(f"  TIMEOUT: {Path(path).name[:60]}")
    except Exception as e:
        print(f"  ERROR: {Path(path).name[:60]} - {e}")
    finally:
        os.unlink(script.name)
        if os.path.exists(out_path):
            os.unlink(out_path)

with open(CACHE, "w", encoding="utf-8") as f:
    json.dump(texts, f, ensure_ascii=False)

print(f"\nFixed {fixed} of {len(empty_paths)} PDFs")
