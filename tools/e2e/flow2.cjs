const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const OUT = process.env.E2E_OUT || require('node:os').tmpdir();
const BASE = process.argv[2];
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);
const SAVE_KEY = 'mistria-battle-card/save';

async function setup(browser, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    const patch = sessionStorage.getItem('qa-patch');
    if (!patch) return;
    sessionStorage.removeItem('qa-patch');
    const k = 'mistria-battle-card/save';
    const s = JSON.parse(localStorage.getItem(k));
    Object.assign(s, JSON.parse(patch));
    localStorage.setItem(k, JSON.stringify(s));
  });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push('console: ' + m.text()); });
  return page;
}
const overflow = (page) => page.evaluate(() => {
  const stage = document.querySelector('.stage'); const s = stage.getBoundingClientRect(); const out = [];
  for (const el of stage.querySelectorAll('*')) {
    const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    let p = el.parentElement, skip = false;
    while (p && p !== stage) { const o = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(o.overflowX + o.overflowY)) { skip = true; break; } p = p.parentElement; }
    if (skip) continue;
    if (r.left < s.left - 1 || r.top < s.top - 1 || r.right > s.right + 1 || r.bottom > s.bottom + 1) out.push(el.className);
  }
  return out.slice(0, 5);
});
const patchReload = async (page, patch) => { await page.evaluate((p) => sessionStorage.setItem('qa-patch', JSON.stringify(p)), patch); await page.reload(); };
const waitScreen = (page, id) => page.waitForFunction((id) => document.querySelector('.stage').dataset.screen === id, id, { timeout: 15000 });

(async () => {
  const browser = await chromium.launch();

  // ===== 1. 手動バトル（人の操作）=====
  {
    const page = await setup(browser, { width: 390, height: 844 });
    await page.goto(BASE + '?qa=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click('text=はじめから'); await page.click('[data-gender="male"]'); await waitScreen(page, 'world');
    await page.click('.modal .btn--primary');
    // 大会の受付まで歩かずに、セーブの位置を会場にしてから続きから
    await patchReload(page, { location: { mapId: 'hall', x: 5, y: 9, dir: 'up' } });
    await page.click('text=つづきから'); await waitScreen(page, 'world');
    await page.click('.world__action'); // 正面は受付カウンター
    await waitScreen(page, 'tournament');
    await page.click('[data-id="tournament-e"] >> text=参加する'); await page.click('.modal >> text=参加する');
    await page.click('text=を戦う'); await waitScreen(page, 'battle');
    await page.click('.battle-order__card[data-index="0"]');
    await page.waitForSelector('.battle__hand', { timeout: 5000 });
    let manualActions = 0, sawPreview = false, sawTarget = false, sawDefense = false, sawUnusable = false;
    const deadline = Date.now() + 300000;
    while (Date.now() < deadline) {
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => { const b = document.querySelector('.battle'); return b ? { phase: b.dataset.phase, acting: b.dataset.acting } : null; });
      if (!st) break;
      if (st.phase === 'ended') break;
      if (await page.$('.battle__defense')) {
        sawDefense = true;
        if (!(await page.$('.battle__defense-panel'))) continue;
        await page.screenshot({ path: `${OUT}/manual-defense.png` });
        const usable = await page.$('.battle__defense-card:not([disabled])');
        if (usable) await usable.click(); else await page.click('.battle__defense >> text=防御しない');
        manualActions++; continue;
      }
      if (st.acting !== 'player' || st.phase !== 'main') continue;
      // 使えるカードを選ぶ → 拡大表示 → 使う → 対象選択
      const unusable = await page.$('.battle__hand-card.is-unusable');
      if (unusable && !sawUnusable) { sawUnusable = true; await unusable.click(); await page.screenshot({ path: `${OUT}/manual-unusable.png` }); log('unusable reason:', await page.textContent('.battle-text__ng')); }
      const card = await page.$('.battle__hand-card.is-usable');
      if (!card) { await page.click('.battle__footer >> text=ターン終了'); manualActions++; continue; }
      await card.click(); sawPreview = true;
      if (manualActions < 2) await page.screenshot({ path: `${OUT}/manual-preview-${manualActions}.png` });
      await page.click('.battle__footer >> text=使う'); manualActions++;
      await page.waitForTimeout(100);
      const target = await page.$('.battle__monster.is-target');
      if (target) { sawTarget = true; if (manualActions < 4) await page.screenshot({ path: `${OUT}/manual-target.png` }); await target.click({ force: true }); }
    }
    const winner = await page.evaluate(() => document.querySelector('.battle')?.dataset.winner);
    await page.screenshot({ path: `${OUT}/manual-result.png` });
    log(`manual battle: winner=${winner} actions=${manualActions} preview=${sawPreview} target=${sawTarget} defense=${sawDefense} unusable=${sawUnusable}`);
    log('overflow battle:', JSON.stringify(await overflow(page)));
    // QA 即勝利で大会を最後まで進め、初回優勝の景品を確認
    await page.click('text=つづける'); await waitScreen(page, 'tournament');
    for (let i = 0; i < 3; i++) {
      const fight = await page.$('text=を戦う'); if (!fight) break;
      await fight.click(); await waitScreen(page, 'battle'); await page.click('.battle-order__card[data-index="0"]'); await page.waitForSelector('.battle__qa'); await page.click('text=QA:即勝利'); await page.click('text=つづける'); await waitScreen(page, 'tournament');
    }
    await page.screenshot({ path: `${OUT}/t-won.png` });
    log('result:', await page.textContent('.tournament__result-title'));
    await page.click('text=景品を受け取る');
    await page.screenshot({ path: `${OUT}/t-reward.png` });
    log('reward:', (await page.textContent('.modal')).replace(/\s+/g, ' '));
    // 二重受け取り：ボタンが消えていること
    await page.click('.modal .btn--primary');
    log('claim button after:', await page.$('text=景品を受け取る') ? 'STILL VISIBLE' : 'gone');
    const save = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SAVE_KEY);
    log('rank', save.rank, 'packs', save.unlockedPacks.join(','), 'eRecord', JSON.stringify(save.tournaments['tournament-e']));
    await page.screenshot({ path: `${OUT}/t-after.png` });
    log('D tournament join enabled:', !(await page.isDisabled('[data-id="tournament-d"] >> text=参加する')));
    log('errors:', page.errors.join('\n') || 'none');
    await page.context().close();
  }

  // ===== 2. 欠片10個と特別復元 =====
  {
    const page = await setup(browser, { width: 390, height: 844 });
    await page.goto(BASE);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.click('text=はじめから'); await page.click('[data-gender="female"]'); await waitScreen(page, 'world'); await page.click('.modal .btn--primary');
    // 9個持っている状態にして、10個目（街 1,2）を調べて拾う
    await patchReload(page, { fragments: ['fragment-02','fragment-03','fragment-04','fragment-05','fragment-06','fragment-07','fragment-08','fragment-09','fragment-10'], location: { mapId: 'town', x: 1, y: 3, dir: 'up' } });
    await page.click('text=つづきから'); await waitScreen(page, 'world');
    await page.click('.world__action');
    log('examine front:', (await page.textContent('.modal')).replace(/\s+/g, ' '));
    await page.click('.modal .btn--primary');
    await page.click('.world__pad-btn--up', { delay: 260 }).catch(() => {});
    await page.waitForTimeout(600);
    log('pos', await page.evaluate(() => [document.querySelector('.world').dataset.px, document.querySelector('.world').dataset.py]));
    await page.click('.world__action');
    log('examine here:', (await page.textContent('.modal')).replace(/\s+/g, ' '));
    await page.click('.modal .btn--primary');
    await page.click('.world__action');
    log('examine again:', (await page.textContent('.modal')).replace(/\s+/g, ' '));
    await page.click('.modal .btn--primary');
    // ショップへ（位置を書き換えて）
    await patchReload(page, { location: { mapId: 'shop', x: 4, y: 4, dir: 'up' } });
    await page.click('text=つづきから'); await waitScreen(page, 'world');
    await page.click('.world__action'); await waitScreen(page, 'shopMenu');
    await page.click('text=特別復元'); await page.screenshot({ path: `${OUT}/restore-confirm.png` });
    await page.click('.modal >> text=復元する', { clickCount: 2 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}/restore-done.png` });
    log('restore:', (await page.textContent('.modal')).replace(/\s+/g, ' '));
    const save = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SAVE_KEY);
    log('hidden count', save.collection['mon-hidden'], 'restored', save.hiddenRestored, 'hidden skills', save.collection['skl-hidden-1'] ?? 0);
    await page.click('.modal .btn--primary');
    await page.click('text=特別復元');
    log('restore again:', (await page.textContent('.modal')).replace(/\s+/g, ' '));
    log('errors:', page.errors.join('\n') || 'none');
    await page.context().close();
  }

  // ===== 3. 画面サイズ別のはみ出し確認 =====
  for (const vp of [{ width: 375, height: 667 }, { width: 430, height: 932 }, { width: 390, height: 844 }]) {
    const page = await setup(browser, vp);
    await page.goto(BASE + '?qa=1');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const results = [];
    await page.click('text=はじめから'); await page.click('[data-gender="male"]'); await waitScreen(page, 'world'); await page.click('.modal .btn--primary');
    results.push(['world', await overflow(page)]);
    for (const [loc, screen, clickSel] of [
      [{ mapId: 'home', x: 1, y: 7, dir: 'up' }, 'deck'],
      [{ mapId: 'home', x: 5, y: 2, dir: 'up' }, 'dungeonSelect'],
      [{ mapId: 'home', x: 8, y: 3, dir: 'up' }, 'collection'],
      [{ mapId: 'home', x: 3, y: 1, dir: 'left' }, 'settings'],
      [{ mapId: 'shop', x: 4, y: 4, dir: 'up' }, 'shopMenu'],
      [{ mapId: 'hall', x: 5, y: 9, dir: 'up' }, 'tournament'],
    ]) {
      await patchReload(page, { location: loc });
      await page.click('text=つづきから'); await waitScreen(page, 'world');
      await page.click('.world__action'); await waitScreen(page, screen);
      results.push([screen, await overflow(page)]);
      await page.screenshot({ path: `${OUT}/vp${vp.width}-${screen}.png` });
      if (screen === 'shopMenu') { await page.click('text=カードガチャ'); await waitScreen(page, 'gacha'); results.push(['gacha', await overflow(page)]); await page.screenshot({ path: `${OUT}/vp${vp.width}-gacha.png` }); }
      if (screen === 'tournament') {
        await page.click('[data-id="tournament-e"] >> text=参加する'); await page.click('.modal >> text=参加する');
        await page.click('text=を戦う'); await waitScreen(page, 'battle');
        await page.click('.battle-order__card[data-index="0"]');
        await page.waitForTimeout(1200);
        results.push(['battle', await overflow(page)]);
        await page.screenshot({ path: `${OUT}/vp${vp.width}-battle.png` });
      }
    }
    log(`viewport ${vp.width}x${vp.height}:`, results.map(([n, o]) => `${n}=${o.length ? o.join('|') : 'ok'}`).join(' '));
    log('errors:', page.errors.join('\n') || 'none');
    await page.context().close();
  }
  await browser.close();
})().catch((e) => { console.error('FAILED', e); process.exit(1); });
