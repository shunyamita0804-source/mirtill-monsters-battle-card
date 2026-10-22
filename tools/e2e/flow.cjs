// 最小縦断体験の E2E：街→家（デッキ・図鑑・ベッド）→ショップ（一覧・ガチャ）→ダンジョンB1〜B3ボス→大会→報酬→再読み込み
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const OUT = process.env.E2E_OUT || require('node:os').tmpdir();
const BASE = process.argv[2];
const t0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s]`, ...a);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  let n = 0;
  const shot = async (name) => { await page.waitForTimeout(250); await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png` }); await overflow(name); };
  const overflow = async (name) => {
    const bad = await page.evaluate(() => {
      const stage = document.querySelector('.stage'); const s = stage.getBoundingClientRect(); const out = [];
      for (const el of stage.querySelectorAll('*')) {
        const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
        let p = el.parentElement, skip = false;
        while (p && p !== stage) { const o = getComputedStyle(p); if (/(auto|scroll|hidden)/.test(o.overflowX + o.overflowY) && p !== stage) { skip = true; break; } p = p.parentElement; }
        if (skip) continue;
        if (r.left < s.left - 1 || r.top < s.top - 1 || r.right > s.right + 1 || r.bottom > s.bottom + 1) out.push(el.className);
      }
      return out.slice(0, 5);
    });
    if (bad.length) log('OVERFLOW', name, bad.join(' | '));
  };
  const screen = () => page.evaluate(() => document.querySelector('.stage').dataset.screen);
  const mapId = () => page.evaluate(() => document.querySelector('.world')?.dataset.map ?? null);
  const pos = () => page.evaluate(() => { const w = document.querySelector('.world'); return w ? [Number(w.dataset.px), Number(w.dataset.py)] : null; });
  const closeModals = async () => { for (let i = 0; i < 5; i++) { const b = await page.$('.modal .btn--primary'); if (!b) return; await b.click(); await page.waitForTimeout(150); } };
  /** 会話が開いていたらスキップする（序盤イベントの声かけなど） */
  const skipTalk = async () => {
    for (let i = 0; i < 10 && !(await page.$('.talk')); i++) await page.waitForTimeout(200);
    const s = await page.$('.talk__skip');
    if (s) { await s.click(); await page.waitForTimeout(200); log('talk skipped'); }
  };
  const waitScreen = async (id, timeout = 15000) => { await page.waitForFunction((id) => document.querySelector('.stage').dataset.screen === id, id, { timeout }); };
  // 画面外のマスは、その方向で画面内に見えている一番遠いマスをタップする（人が操作するのと同じ）
  const tapTile = async (x, y) => {
    const r = await page.evaluate(([x, y]) => {
      const m = document.querySelector('.world__map'); const rect = m.getBoundingClientRect(); const w = m.offsetWidth; const s = rect.width / w;
      const v = document.querySelector('.world__viewport').getBoundingClientRect();
      const cx = rect.left + (x + 0.5) * 40 * s, cy = rect.top + (y + 0.5) * 40 * s;
      const pad = 24 * s;
      return { cx: Math.min(Math.max(cx, v.left + pad), v.right - pad), cy: Math.min(Math.max(cy, v.top + pad), v.bottom - pad), inside: cx >= v.left && cx <= v.right && cy >= v.top && cy <= v.bottom };
    }, [x, y]);
    await page.mouse.click(r.cx, r.cy);
  };
  /** 指定マスへ歩く（地図外のときはカメラが追うので数回タップ） */
  const walkTo = async (x, y, { untilMap, timeout = 20000 } = {}) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
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
  const playBattle = async (label) => {
    await waitScreen('battle');
    // 先攻・後攻のカードを1枚選ぶ → 手札が配られる
    await page.click('.battle-order__card[data-index="0"]');
    await page.waitForSelector('.battle__qa', { timeout: 5000 });
    await shot(`battle-${label}-start`);
    await page.click('text=QA:オート');
    const bt = Date.now();
    await page.waitForSelector('.battle__result', { timeout: 240000 });
    const winner = await page.evaluate(() => document.querySelector('.battle').dataset.winner);
    const turns = await page.evaluate(() => document.querySelector('.battle__result-sub').textContent);
    log(`battle ${label}: winner=${winner} ${turns} (${((Date.now() - bt) / 1000).toFixed(0)}s auto)`);
    await shot(`battle-${label}-result`);
    await page.click('text=つづける');
    return winner;
  };

  await page.goto(BASE + '?qa=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.click('text=はじめから');
  await page.click('[data-gender="female"]');
  await waitScreen('world');
  await closeModals();
  // 新しく始めると自分の家の中から始まる
  log('start map', await mapId());
  await shot('home');
  await walkTo(1, 6); await waitScreen('deck'); await shot('deck');
  log('deck status:', await page.textContent('.deck__status'));
  await page.click('[data-id="skl-a-1"] .deck__row-card'); await shot('deck-card-detail'); await closeModals();
  await page.click('text=‹ 戻る'); await waitScreen('world');
  await walkTo(8, 1); await waitScreen('collection'); await shot('collection'); await page.click('text=‹ 戻る'); await waitScreen('world');
  await walkTo(1, 1); await waitScreen('settings'); await shot('settings'); await page.click('text=‹ 戻る'); await waitScreen('world');

  // 欠片：街の (16,7) で調べる（最初に街へ出たときの声かけはスキップ）
  log('to town', await walkTo(4, 8, { untilMap: 'town' }));
  await skipTalk();
  await shot('town-start');
  await walkTo(16, 7);
  await page.click('.world__action');
  log('examine:', (await page.textContent('.modal')).replace(/\s+/g, ' '));
  await shot('fragment');
  await closeModals();

  // ショップ
  log('to shop', await walkTo(4, 14, { untilMap: 'shop' }));
  await shot('shop');
  await walkTo(4, 2); await waitScreen('shopMenu'); await shot('shop-menu');
  await page.click('text=カードを見る'); await waitScreen('cardList'); await shot('card-list');
  await page.click('.card-grid__item >> nth=0'); await shot('card-list-detail'); await closeModals();
  await page.click('text=‹ 戻る'); await waitScreen('shopMenu');
  await page.click('text=カードガチャ'); await waitScreen('gacha'); await shot('gacha');
  await page.click('[data-id="pack-01"] >> text=収録・提供割合'); await shot('gacha-rates');
  log('rates total:', await page.textContent('.gacha-rates__table tfoot'));
  await closeModals();
  const coins0 = await page.evaluate(() => JSON.parse(localStorage.getItem('mistria-battle-card/save')).coins);
  await page.click('[data-id="pack-01"] >> text=購入');
  await shot('gacha-confirm');
  // 二重タップ：購入ボタンを素早く2回
  await page.click('.modal >> text=購入する', { clickCount: 2 }).catch(() => {});
  await page.waitForTimeout(2600);
  await shot('gacha-open');
  const coins1 = await page.evaluate(() => JSON.parse(localStorage.getItem('mistria-battle-card/save')).coins);
  log(`coins ${coins0} -> ${coins1} (double tap test)`);
  await closeModals();
  await page.click('.pack-open >> text=閉じる');
  await closeModals();
  await page.click('text=‹ 戻る'); await waitScreen('shopMenu');
  await shot('shop-menu-restore');
  await page.click('text=特別復元'); await shot('restore-not-ready'); await closeModals();
  await page.click('text=‹ 戻る'); await waitScreen('world');

  // ダンジョン
  await walkTo(4, 8, { untilMap: 'town' });
  await walkTo(14, 14, { untilMap: 'home' });
  await walkTo(5, 1); await waitScreen('dungeonSelect'); await shot('dungeon-select');
  await page.click('text=出発する'); await waitScreen('world');
  log('dungeon map', await mapId());
  await shot('b1');
  let dungeonDone = false;
  for (let attempt = 1; attempt <= 6 && !dungeonDone; attempt++) {
    if ((await mapId()) !== 'dungeon-01-b1') {
      await closeModals();
      await walkTo(5, 1); await waitScreen('dungeonSelect'); await page.click('text=出発する'); await waitScreen('world');
    }
    log('attempt', attempt);
    // B1: 敵1 (4,5) と戦ってから階段へ
    const r1 = await walkTo(4, 5);
    if (r1 === 'modal') { await closeModals(); if ((await playBattle('b1')) !== 'player') { await waitScreen('world'); continue; } await waitScreen('world'); await closeModals(); }
    log('b1 -> b2', await walkTo(2, 2, { untilMap: 'dungeon-01-b2' }));
    await closeModals();
    await shot('b2');
    // B2: 宝箱の番人 (2,4) を倒して宝箱 (3,1)
    const r2 = await walkTo(2, 4);
    if (r2 === 'modal') { await closeModals(); if ((await playBattle('b2')) !== 'player') { await waitScreen('world'); continue; } await waitScreen('world'); await closeModals(); }
    await walkTo(3, 1);
    await closeModals();
    log('chest opened');
    log('b2 -> b3', await walkTo(6, 3, { untilMap: 'dungeon-01-b3' }));
    await closeModals();
    await shot('b3');
    for (const [x, y] of [[6, 13], [1, 13], [3, 11], [3, 9], [3, 7], [6, 7], [6, 5], [8, 5], [8, 3], [6, 2]]) {
      const r = await walkTo(x, y);
      if (r !== 'arrived') { log('B3 route interrupted', r, x, y); break; }
    }
    const r3 = await walkTo(5, 2);
    if (r3 === 'modal') { await shot('boss-appear'); await closeModals(); const w = await playBattle('boss'); await waitScreen('world'); await shot('after-boss'); log('after boss:', (await page.textContent('.modal').catch(() => '')).replace(/\s+/g, ' ')); await closeModals(); if (w === 'player') dungeonDone = true; }
  }
  log('dungeon cleared:', dungeonDone, 'map', await mapId());
  await closeModals();

  // 大会
  await walkTo(4, 8, { untilMap: 'town' });
  await walkTo(10, 4, { untilMap: 'hall' });
  await shot('hall');
  await walkTo(5, 7); await waitScreen('tournament'); await shot('tournament');
  let won = false;
  for (let entry = 1; entry <= 4 && !won; entry++) {
    await page.click('[data-id="tournament-e"] >> text=参加する');
    await page.click('.modal >> text=参加する');
    await shot(`tournament-bracket-${entry}`);
    for (let round = 0; round < 3; round++) {
      const fight = await page.$('text=を戦う');
      if (!fight) break;
      await fight.click();
      const w = await playBattle(`t${entry}-r${round + 1}`);
      await waitScreen('tournament');
      if (w !== 'player') break;
    }
    await shot(`tournament-result-${entry}`);
    won = (await page.textContent('.tournament__result-title')).includes('優勝');
    await page.click('text=景品を受け取る');
    await shot(`tournament-reward-${entry}`);
    log('reward:', (await page.textContent('.modal')).replace(/\s+/g, ' '));
    await closeModals();
  }
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('mistria-battle-card/save')));
  log('rank', save.rank, 'packs', save.unlockedPacks.join(','), 'coins', save.coins, 'tournaments', JSON.stringify(save.tournaments), 'claimed', save.claimedEntries.length);

  // 再読み込みでの復帰
  await page.click('text=‹ 戻る'); await waitScreen('world');
  const before = [await mapId(), await pos()];
  await page.reload();
  await page.click('text=つづきから'); await waitScreen('world');
  const after = [await mapId(), await pos()];
  log('reload resume', JSON.stringify(before), '->', JSON.stringify(after));
  await shot('resumed');
  log('errors:', errors.length ? errors.join('\n') : 'none');
  log('total', ((Date.now() - t0) / 1000).toFixed(0), 's');
  await browser.close();
})().catch(async (e) => { console.error('FAILED', e); process.exit(1); });
