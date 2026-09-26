// Smoke test: loads the built preview in headless Chromium with a stubbed Claude,
// clicks through every tab and the main flows, and fails on any page error.
// Usage: node preview/smoke.js [path/to/fridge-preview.html] [screenshot-dir]
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const fs = require('fs'), path = require('path');
const file = process.argv[2] || path.join(__dirname, 'dist/fridge-preview.html');
const shots = process.argv[3] || path.join(__dirname, 'dist/shots');
fs.mkdirSync(shots, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const scheme of ['light', 'dark']) {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, colorScheme: scheme, deviceScaleFactor: 2 });
    p.on('pageerror', e => errs.push(`${scheme}: ${e.message}`));
    await p.setContent('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body><script>' + fs.readFileSync(path.join(__dirname, 'test-stub.js'), 'utf8') + '</script>' + fs.readFileSync(file, 'utf8') + '</body></html>');
    await p.waitForTimeout(400);
    for (const tab of ['tonight', 'fridge', 'recipes', 'plan', 'shopping']) {
      await p.click(`button.tab[data-value="${tab}"]`);
      await p.waitForTimeout(250);
      await p.screenshot({ path: path.join(shots, `${scheme}-${tab}.png`) });
    }
    await p.click('button.tab[data-value="recipes"]');
    const open = await p.$('[data-action="open-recipe"]');
    if (open) { await open.click(); await p.waitForTimeout(250); await p.screenshot({ path: path.join(shots, `${scheme}-recipe-detail.png`) }); }
    const cooked = await p.$('[data-action="cooked"]');
    if (cooked) { await cooked.click(); await p.waitForTimeout(400); await p.screenshot({ path: path.join(shots, `${scheme}-cook-sheet.png`) }); await p.keyboard.press('Escape'); }
    await p.click('button.tab[data-value="fridge"]');
    const ci = await p.$('[data-action="open-checkin"]');
    if (ci) { await ci.click(); await p.waitForTimeout(400); await p.screenshot({ path: path.join(shots, `${scheme}-checkin.png`) }); await p.keyboard.press('Escape'); }
    await p.close();
  }
  await b.close();
  if (errs.length) { console.error('PAGE ERRORS:\n' + errs.join('\n')); process.exit(1); }
  console.log('smoke ok; screenshots in ' + shots);
})();
