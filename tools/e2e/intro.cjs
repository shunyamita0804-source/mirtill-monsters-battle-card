// 序盤イベントの E2E：新しく始める → 家から街へ → となりの家の女性の声かけ → 練習場へ → 練習試合（ヒント）→ 対戦後 → 後日の再開
// 2つ目の流れ：「あとで」→ 街で話しかけて誘い直し／スキップ。英語表示でも崩れないか
// 使い方：PLAYWRIGHT_MODULE=... E2E_OUT=<保存先> node tools/e2e/intro.cjs http://127.0.0.1:4173/
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const OUT = process.env.E2E_OUT || require('node:os').tmpdir();
const BASE = process.argv[2];
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

async function run(name, gender, lang, steps) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  let n = 0;
  const shot = async (label) => { await page.waitForTimeout(300); await page.screenshot({ path: `${OUT}/${name}-${String(++n).padStart(2, '0')}-${label}.png` }); };
  const screen = () => page.evaluate(() => document.querySelector('.stage').dataset.screen);
  const mapId = () => page.evaluate(() => document.querySelector('.world')?.dataset.map ?? null);
  const intro = () => page.evaluate(() => document.querySelector('.world')?.dataset.intro ?? null);
  const pos = () => page.evaluate(() => { const w = document.querySelector('.world'); return w ? [Number(w.dataset.px), Number(w.dataset.py)] : null; });
  const waitScreen = async (id, timeout = 15000) => { await page.waitForFunction((id) => document.querySelector('.stage').dataset.screen === id, id, { timeout }); };
  const closeModals = async () => { for (let i = 0; i < 5; i++) { const b = await page.$('.modal .btn--primary'); if (!b) return; await b.click(); await page.waitForTimeout(200); } };
  const tapTile = async (x, y) => {
    const r = await page.evaluate(([x, y]) => {
      const m = document.querySelector('.world__map'); const rect = m.getBoundingClientRect(); const w = m.offsetWidth; const s = rect.width / w;
      const v = document.querySelector('.world__viewport').getBoundingClientRect();
      const cx = rect.left + (x + 0.5) * 40 * s, cy = rect.top + (y + 0.5) * 40 * s; const pad = 24 * s;
      return { cx: Math.min(Math.max(cx, v.left + pad), v.right - pad), cy: Math.min(Math.max(cy, v.top + pad), v.bottom - pad) };
    }, [x, y]);
    await page.mouse.click(r.cx, r.cy);
  };
  const walkTo = async (x, y, { untilMap, timeout = 25000 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await page.$('.talk')) return 'talk';
      if (await page.$('.modal')) return 'modal';
      if ((await screen()) !== 'world') return 'screen';
      if (untilMap && (await mapId()) === untilMap) return 'map';
      const p = await pos();
      if (!untilMap && p && p[0] === x && p[1] === y) return 'arrived';
      await tapTile(x, y);
      await page.waitForTimeout(900);
    }
    throw new Error(`walkTo(${x},${y}) timeout at ${await pos()} map=${await mapId()}`);
  };
  /** 会話を進める（選択肢が出たら止まる）。返り値：'choice' | 'end' */
  const talk = async (label) => {
    let shotDone = false;
    for (let i = 0; i < 60; i++) {
      if (!(await page.$('.talk'))) return 'end';
      if (await page.$('.talk__choice')) { if (label) await shot(label + '-choice'); return 'choice'; }
      if (label && !shotDone) { await page.waitForTimeout(1500); await shot(label); shotDone = true; }
      await page.click('.talk__window');
      await page.waitForTimeout(160);
    }
    throw new Error('talk loop');
  };
  const choose = async (index) => { await page.click(`.talk__choice >> nth=${index}`); await page.waitForTimeout(200); };
  const talkToGuide = async () => {
    const g = await page.evaluate(() => { const el = document.querySelector('.world__npc'); return el ? [Math.round(parseFloat(el.style.left) / 40), Math.round(parseFloat(el.style.top) / 40)] : null; });
    if (!g) throw new Error('guide not shown');
    await tapTile(g[0], g[1]);
    for (let i = 0; i < 20 && !(await page.$('.talk')); i++) await page.waitForTimeout(400);
  };

  await page.goto(BASE + '?qa=1');
  if (lang === 'en') {
    await page.evaluate(() => localStorage.setItem('mistria-battle-card/settings', JSON.stringify({ language: 'en' })));
    await page.reload();
  }
  await page.click('.title__buttons .btn--large >> nth=-1');
  await page.waitForSelector('[data-gender]');
  await page.click(`[data-gender="${gender}"]`);
  await waitScreen('world');
  await closeModals();
  log(name, 'start map', await mapId(), 'intro', await intro());
  await steps({ page, shot, screen, mapId, intro, pos, waitScreen, closeModals, walkTo, talk, choose, talkToGuide, log: (...a) => log(name, ...a) });
  log(name, 'errors', errors.length ? errors : 'none');
  await browser.close();
  return errors.length;
}

(async () => {
  let bad = 0;
  // 1：最初から練習試合まで（男性・日本語）
  bad += await run('main', 'male', 'ja', async (c) => {
    c.log('to town', await c.walkTo(4, 8, { untilMap: 'town' }));
    for (let i = 0; i < 20 && !(await c.page.$('.talk')); i++) await c.page.waitForTimeout(300);
    c.log('intro after leaving home', await c.intro());
    await c.talk('invite');
    await c.choose(0); // まだ
    await c.talk('invite2');
    await c.choose(0); // 練習してみる
    await c.talk('accept');
    c.log('after accept', await c.intro());
    await c.shot('town-goal');
    c.log('to practice', await c.walkTo(4, 4, { untilMap: 'practice' }));
    for (let i = 0; i < 20 && !(await c.page.$('.talk')); i++) await c.page.waitForTimeout(300);
    await c.talk('arrive');
    await c.choose(0); // 対戦してみる
    await c.talk('explain');
    await c.waitScreen('battle');
    await c.page.click('.battle-order__card[data-index="0"]');
    let hints = [];
    for (let i = 0; i < 40 && hints.length < 3; i++) {
      const h = await c.page.$('.battle__hint');
      if (h) {
        const id = await h.getAttribute('data-hint');
        hints.push(id);
        await c.shot('hint-' + id);
        await c.page.click('.battle__hint .command-button, .battle__hint button');
      }
      await c.page.waitForTimeout(700);
    }
    c.log('hints', hints.join(','));
    await c.page.click('text=QA:即勝利').catch(() => c.page.click('.battle__qa button >> nth=1'));
    await c.page.waitForSelector('.battle__hint[data-hint="result"]', { timeout: 5000 });
    await c.shot('hint-result');
    await c.page.click('.battle__hint button');
    await c.page.click('.battle__result button');
    await c.waitScreen('world');
    for (let i = 0; i < 20 && !(await c.page.$('.talk')); i++) await c.page.waitForTimeout(300);
    await c.talk('after-win');
    c.log('after practice', await c.mapId(), await c.intro());
    await c.talkToGuide();
    const r = await c.talk('replay');
    c.log('replay', r);
    if (r === 'choice') await c.choose(1);
    c.log('back to town', await c.walkTo(4, 8, { untilMap: 'town' }));
    await c.shot('town-free');
  });
  // 2：「あとで」→ 話しかけて誘い直し → スキップ（女性・英語）
  bad += await run('later', 'female', 'en', async (c) => {
    await c.walkTo(4, 8, { untilMap: 'town' });
    for (let i = 0; i < 20 && !(await c.page.$('.talk')); i++) await c.page.waitForTimeout(300);
    await c.talk('invite-en');
    await c.choose(1);
    await c.talk('invite2-en');
    await c.choose(1); // Maybe later
    await c.talk();
    c.log('after later', await c.intro());
    await c.shot('town-later');
    await c.talkToGuide();
    await c.talk('reinvite-en');
    await c.page.click('.talk__skip');
    c.log('after skip', await c.intro(), 'talk open', !!(await c.page.$('.talk')));
    c.log('to practice', await c.walkTo(4, 4, { untilMap: 'practice' }));
    c.log('guide in practice?', !!(await c.page.$('.world__npc')));
    // 案内役がいないときの練習テーブル：地の文で練習試合を勧める
    c.log('table', await c.walkTo(2, 3));
    const t = await c.page.evaluate(() => !!document.querySelector('.talk'));
    c.log('table offer open', t);
    if (t) { await c.talk('table-offer-en'); await c.choose(1); }
  });
  log('done. pages with errors:', bad);
})();
