/* Build the The1% Academy PDFs.

     python3 -m http.server 8800        (from the repo root)
     node tools/build-pdfs.mjs          (needs playwright; python3 + pypdf for merging)

   Each document is printed in two parts, a full-bleed cover and the body
   with page numbers, then merged and stamped with The1% metadata by
   tools/merge-pdf.py. Output goes to assets/academy/pdf/. */
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE || "http://127.0.0.1:8800/tools/workbook.html";
const OUT = new URL("../assets/academy/pdf/", import.meta.url).pathname;
const tmp = mkdtempSync(join(tmpdir(), "the1-"));

const b = await chromium.launch();
const page = await b.newPage();
/* covers are flattened to one image: transparent gradients over photos
   render with a colour cast in some PDF viewers (including pdf.js) */
const shotCtx = await b.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
const shotPage = await shotCtx.newPage();
async function printCover(query, file) {
  await shotPage.goto(BASE + query, { waitUntil: "networkidle" });
  await shotPage.evaluate(() => document.fonts.ready);
  const jpg = await shotPage.screenshot({ type: "jpeg", quality: 86 });
  await page.setContent(
    '<html><head><style>@page{size:A4;margin:0}html,body{margin:0}img{display:block;width:210mm;height:297mm}</style></head><body><img src="data:image/jpeg;base64,' + jpg.toString("base64") + '"></body></html>'
  );
  await page.pdf({ path: file, format: "A4", printBackground: true, preferCSSPageSize: true });
}
const courses = await (async () => {
  await page.goto(BASE + "?c=psychology&part=cover");
  return page.evaluate(() => Object.keys(Academy.PDFS).map((id) => ({ id, docs: Academy.PDFS[id] })));
})();

async function print(query, file, body, footer) {
  await page.goto(BASE + query, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({
    path: file,
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: body ? { top: "16mm", bottom: "18mm", left: "17mm", right: "17mm" } : { top: 0, bottom: 0, left: 0, right: 0 },
    displayHeaderFooter: !!body,
    headerTemplate: "<span></span>",
    footerTemplate: body
      ? '<div style="width:100%;padding:0 17mm;font:7.5pt IBM Plex Mono,monospace;color:#6b7280;display:flex;justify-content:space-between"><span>The1% Academy · ' + footer + '</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>'
      : "<span></span>",
  });
}

for (const { id, docs } of courses) {
  for (const d of docs) {
    const q = d.id === "workbook" ? "?c=" + id : "?doc=" + d.id;
    const cover = join(tmp, id + d.id + "-c.pdf");
    const body = join(tmp, id + d.id + "-b.pdf");
    await printCover(q + "&part=cover", cover);
    await print(q + "&part=body", body, true, d.title.replace(/^The1% /, ""));
    const dest = OUT + d.file.split("/").pop();
    execFileSync("python3", [new URL("merge-pdf.py", import.meta.url).pathname, dest, d.title, d.desc, cover, body], { stdio: "inherit" });
  }
}
await b.close();
