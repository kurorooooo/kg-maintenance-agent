// Record the production UI for the demo video: one continuous 1920x1080 WebM plus a JSON of timestamps
// (click / answered / chip) so the Remotion composition can cut and speed up each scene.
//
//   cd movie && npm run record            # -> out/rec/demo.webm, out/rec/marks.json
//   DEMO_URL=http://localhost:3000 npm run record
import { chromium } from "playwright";
import { copyFileSync, mkdirSync, renameSync, writeFileSync } from "node:fs";

const URL = process.env.DEMO_URL ?? "https://kg-web-7ikzkb2evq-an.a.run.app/";
const DIR = "out/rec";
mkdirSync(DIR, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({
  // a 1440x810 page scaled up to 1920x1080 so UI text stays legible in the video
  viewport: { width: 1440, height: 810 },
  deviceScaleFactor: 1,
  locale: "en-US",
  recordVideo: { dir: DIR, size: { width: 1920, height: 1080 } },
});
const page = await ctx.newPage();
await page.addInitScript(() => {
  try {
    localStorage.clear();
    localStorage.setItem("locale", "en");
  } catch {}
});

const t0 = Date.now();
const marks = [];
const mark = (name) => {
  marks.push({ name, t: +((Date.now() - t0) / 1000).toFixed(2) });
  console.log(`${marks.at(-1).t.toFixed(1).padStart(6)}s  ${name}`);
};
const hold = (s) => page.waitForTimeout(s * 1000);

async function askExample(label, text) {
  const before = await page.getByText("Answered in").count();
  await page.locator(`button:visible:has-text("${text}")`).first().click();
  mark(`${label}:click`);
  // wait until one more turn has finished (earlier turns already show "Answered in")
  await page.waitForFunction((n) => document.body.innerText.split("Answered in").length - 1 > n, before, { timeout: 150_000 });
  mark(`${label}:answered`);
  await page.waitForFunction(() => /\d+ nodes/.test(document.body.innerText), null, { timeout: 20_000 }).catch(() => {});
  mark(`${label}:evidence`);
}

await page.goto(URL, { waitUntil: "networkidle" });
mark("start");
await hold(3);

// Q1 with chip click
await askExample("q1", "The cooling pump P-301 on line 3");
await hold(4);
const chip = page.locator("button:has-text(\"WO-2026-020\"), button:has-text(\"WO-2024-006\")").first();
if (await chip.count()) {
  await chip.scrollIntoViewIfNeeded();
  await chip.click();
  mark("q1:chip");
}
await hold(7);

// Q2 follow-up
await askExample("q2", "Did pumps of the same model on other lines");
await hold(8);

// Q3 follow-up
await askExample("q3", "For that repair, which parts are in stock");
await hold(8);

// E1 in a fresh session
await page.locator("button:visible:has-text(\"Start over\")").first().click();
mark("reset");
await hold(1.5);
await askExample("e1", "Were there any bearing-related failures on P-302");
await hold(8);
mark("end");

const video = page.video();
await ctx.close();
const path = await video.path();
await browser.close();
renameSync(path, `${DIR}/demo.webm`);
writeFileSync(`${DIR}/marks.json`, JSON.stringify(marks, null, 1));
copyFileSync(`${DIR}/marks.json`, "src/marks.json");
console.log(`wrote ${DIR}/demo.webm and marks.json (copied to src/marks.json)`);
