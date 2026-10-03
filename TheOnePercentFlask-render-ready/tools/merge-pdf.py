"""Merge a cover and body PDF and stamp The1% metadata.
usage: merge-pdf.py OUT TITLE SUBJECT COVER BODY"""
import sys
from pypdf import PdfWriter, PdfReader

out, title, subject, *parts = sys.argv[1:]
w = PdfWriter()
for p in parts:
    for pg in PdfReader(p).pages:
        w.add_page(pg)
w.add_metadata({
    "/Title": title,
    "/Author": "The1% Academy",
    "/Subject": subject,
    "/Creator": "The1% Academy",
    "/Producer": "The1% Academy",
    "/Keywords": "The1%, trading, academy, masterclass",
})
w.page_mode = "/UseNone"
with open(out, "wb") as f:
    w.write(f)
print(out, len(w.pages), "pages")
