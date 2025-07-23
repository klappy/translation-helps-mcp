import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log("🔍 HOMEPAGE STYLING DIAGNOSIS\n");

  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(msg.text());
    }
  });

  try {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");

    // Check basic page structure
    const title = await page.title();
    console.log("✅ Page Title:", title);

    // Check for major elements
    const header = await page.$("header");
    const nav = await page.$("nav");
    const main = await page.$("main");

    console.log("✅ Header exists:", !!header);
    console.log("✅ Nav exists:", !!nav);
    console.log("✅ Main exists:", !!main);

    // Check CSS compilation
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = getComputedStyle(body);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontFamily: computed.fontFamily,
        classes: Array.from(body.classList),
      };
    });

    console.log("\n🎨 BODY STYLING:");
    console.log("  Background Color:", bodyStyles.backgroundColor);
    console.log("  Text Color:", bodyStyles.color);
    console.log("  Font Family:", bodyStyles.fontFamily);
    console.log("  CSS Classes:", bodyStyles.classes);

    // Check navigation visibility
    const navInfo = await page.evaluate(() => {
      const nav = document.querySelector("nav");
      if (!nav) return null;
      const computed = getComputedStyle(nav);
      const links = Array.from(nav.querySelectorAll("a")).map((link) => ({
        text: link.textContent.trim(),
        visible: link.offsetWidth > 0 && link.offsetHeight > 0,
        href: link.href,
      }));
      return {
        display: computed.display,
        visibility: computed.visibility,
        backgroundColor: computed.backgroundColor,
        links: links,
      };
    });

    console.log("\n🧭 NAVIGATION INFO:");
    if (navInfo) {
      console.log("  Display:", navInfo.display);
      console.log("  Visibility:", navInfo.visibility);
      console.log("  Background:", navInfo.backgroundColor);
      console.log("  Links Count:", navInfo.links.length);
      navInfo.links.forEach((link, i) => {
        console.log(`    ${i + 1}. ${link.text} (visible: ${link.visible})`);
      });
    } else {
      console.log("  ❌ Navigation not found!");
    }

    // Check for CSS loading issues
    const stylesheets = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      return sheets.map((sheet) => ({
        href: sheet.href || "inline",
        disabled: sheet.disabled,
        media: sheet.media.mediaText,
        rules: sheet.cssRules ? sheet.cssRules.length : "blocked",
      }));
    });

    console.log("\n📄 STYLESHEETS:");
    stylesheets.forEach((sheet, i) => {
      console.log(`  ${i + 1}. ${sheet.href} (${sheet.rules} rules, disabled: ${sheet.disabled})`);
    });

    // Take screenshot for visual verification
    await page.screenshot({ path: "homepage-debug.png", fullPage: true });
    console.log("\n📸 Screenshot saved as homepage-debug.png");

    // Check console errors
    if (errors.length > 0) {
      console.log("\n❌ CONSOLE ERRORS:");
      errors.forEach((error) => console.log("  -", error));
    } else {
      console.log("\n✅ No console errors detected");
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  } finally {
    await browser.close();
  }
})();
