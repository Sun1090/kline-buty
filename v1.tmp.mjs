import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForTimeout(6000);

// 打开盘口
await page.getByRole('button', { name: '盘口' }).click();
await page.waitForTimeout(800);

// 悬停买盘第一档 → 买按钮出现
const bidRow = page.locator('[data-testid="ob-bid"]').first();
await bidRow.hover();
await page.waitForTimeout(200);
const buyBtn = page.locator('[data-testid="qo-buy"]');
console.log('BUY_BTN_VISIBLE:', await buyBtn.count());
await buyBtn.click();
await page.waitForTimeout(400);

// 快速下单面板
const qo = page.locator('[data-testid="quick-order"]');
console.log('QUICK_ORDER_VISIBLE:', await qo.count());
const priceVal = await page.locator('[data-testid="qo-price"]').inputValue();
const qtyVal = await page.locator('[data-testid="qo-qty"]').inputValue();
console.log('PRICE_PREFILL:', priceVal, 'QTY:', qtyVal);
const panelText = await qo.innerText();
console.log('PANEL_TEXT:', JSON.stringify(panelText.slice(0, 200)));

// 确认下单
await page.locator('[data-testid="qo-confirm"]').click();
await page.waitForTimeout(600);

// 仓位面板应打开
const posPanel = page.getByText('模拟仓位');
console.log('POS_PANEL_OPEN:', await posPanel.count());
// 仓位方向/数量信息
const body = await page.evaluate(() => document.body.innerText);
console.log('HAS_LONG:', /做多/.test(body), 'HAS_FLOATING:', /浮动盈亏/.test(body));

// 检查 localStorage 画线/仓位持久化（仓位不持久化到 localStorage？看位置线）
const stored = await page.evaluate(() => Object.keys(localStorage));
console.log('LS_KEYS:', JSON.stringify(stored));
await browser.close();
