import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);
await page.getByRole('button', { name: '盘口' }).click();
await page.waitForTimeout(800);

// 卖方向：悬停卖盘第一档 → 卖按钮
const askRow = page.locator('[data-testid="ob-ask"]').first();
await askRow.hover();
await page.waitForTimeout(200);
const sellBtn = page.locator('[data-testid="qo-sell"]');
console.log('SELL_BTN:', await sellBtn.count());
await sellBtn.click();
await page.waitForTimeout(400);
const qo = page.locator('[data-testid="quick-order"]');
console.log('SELL_PANEL_TEXT:', JSON.stringify((await qo.innerText()).slice(0, 80)));
await page.locator('[data-testid="qo-confirm"]').click();
await page.waitForTimeout(600);
const body = await page.evaluate(() => document.body.innerText);
console.log('HAS_SHORT_LABEL:', /做空|空头|Short/.test(body));
console.log('HAS_FLOATING:', /浮动盈亏/.test(body));
// 仓位面板入口输入框的值（入场价）
const inputs = await page.locator('input').allInputValues();
console.log('INPUTS:', JSON.stringify(inputs.slice(0, 6)));
await browser.close();
