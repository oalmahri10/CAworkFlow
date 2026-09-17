import { chromium } from "playwright";

const BASE = "http://localhost:3000";
const SHOTS = "C:/Users/student/AppData/Local/Temp/preview-shots";

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 } });
  const errors = [];
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });

  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[autocomplete="email"]', "admin@bisb.local");
  await page.fill('input[autocomplete="current-password"]', "AdminPass123!");
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => location.pathname === "/dashboard", null, { timeout: 20000 });
  await page.waitForSelector("text=Credit Journey", { timeout: 20000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SHOTS}/12-dashboard-v2.png`, fullPage: true });

  await page.goto(BASE + "/intelligence", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Application Flow", { timeout: 20000 });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${SHOTS}/13-intelligence-v2.png`, fullPage: true });

  const apps = await page.evaluate(() => fetch("/api/applications?pageSize=1").then((r) => r.json()));
  const appId = apps.items[0]?.id;
  if (appId) {
    await page.goto(BASE + `/applications/${appId}`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Credit Passport", { timeout: 20000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${SHOTS}/14-passport-v2.png`, fullPage: true });
  }

  console.log("ERRORS:", JSON.stringify(errors));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
