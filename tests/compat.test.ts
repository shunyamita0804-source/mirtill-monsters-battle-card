import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { APP_INFO } from '../src/config/app.ts';
import { createBackup, parseBackup, serializeBackup } from '../src/game/save/backup.ts';
import { createStarterDeck } from '../src/game/deck/deck.ts';
import { MemoryStorage, SAVE_KEY } from '../src/game/save/saveRepository.ts';
import { DEFAULT_SETTINGS, effectiveSeVolume, normalizeSettings, SETTINGS_KEY } from '../src/game/settings/settings.ts';
import { getLanguage, setLanguage } from '../src/i18n/i18n.ts';
import { GameStore } from '../src/ui/gameStore.ts';
import { sound } from '../src/ui/sound.ts';
import { PAGES_BASE } from '../vite.config.ts';

afterEach(() => setLanguage('ja'));

/**
 * 改名前（ミストリア時代・2026-10-22 公開版 142470a）の形式のセーブ。
 * カード・所持金・デッキ・大会・欠片・現在地・ダンジョン記録を持つ。
 */
const OLD_SAVE = {
  version: 2,
  createdAt: '2026-10-22T00:00:00.000Z',
  updatedAt: '2026-10-22T03:00:00.000Z',
  player: { gender: 'female' },
  coins: 777,
  collection: {
    'mon-a': 1,
    'mon-b': 1,
    'mon-c': 1,
    'mon-e': 1,
    ...Object.fromEntries(['a', 'b', 'c'].flatMap((k) => [1, 2, 3, 4, 5, 6].map((n) => [`skl-${k}-${n}`, 3]))),
    'sup-1': 3,
    'sup-2': 3,
  },
  deck: createStarterDeck(),
  rank: 'D',
  unlockedPacks: ['pack-01', 'pack-02'],
  tournaments: { 'tournament-e': { entries: 1, wins: 1, firstWinClaimed: true } },
  activeTournament: null,
  claimedEntries: ['entry-old'],
  dungeons: { 'dungeon-01': { openedChests: ['b2-chest-1'], bossDefeated: false, clears: 0 } },
  activeDungeon: null,
  fragments: ['fragment-01', 'fragment-03', 'fragment-07'],
  hiddenRestored: false,
  location: { mapId: 'town', x: 7, y: 15, dir: 'down' },
  processedTransactions: ['purchase-old'],
  stats: { battlesWon: 4, battlesLost: 1, packsOpened: 2 },
};

describe('改名前のセーブを新しい名前のアプリで読む', () => {
  it('同じ保存キーのまま、すべての進行を保ったまま読める', () => {
    const storage = new MemoryStorage();
    storage.setItem('mistria-battle-card/save', JSON.stringify(OLD_SAVE));
    expect(SAVE_KEY).toBe('mistria-battle-card/save');
    const store = new GameStore(storage);
    expect(store.loadResult.status).toBe('loaded');
    const s = store.save;
    expect(s.coins).toBe(777);
    expect(s.collection).toEqual(OLD_SAVE.collection);
    expect(s.deck).toEqual(OLD_SAVE.deck);
    expect(s.tournaments).toEqual(OLD_SAVE.tournaments);
    expect(s.fragments).toEqual(OLD_SAVE.fragments);
    expect(s.location).toEqual(OLD_SAVE.location);
    expect(s.dungeons).toEqual(OLD_SAVE.dungeons);
    expect(s.rank).toBe('D');
  });

  it('バックアップ → 復元しても同じ状態', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(OLD_SAVE));
    const store = new GameStore(storage);
    const before = store.save;
    const r = parseBackup(serializeBackup(createBackup(before, store.settings.value)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const other = new GameStore(new MemoryStorage());
    expect(other.restoreSave(r.save)).toBe(true);
    expect(other.save).toEqual(before);
  });
});

describe('設定（言語・音量）', () => {
  it('壊れた値は既定値、範囲外は 0〜100 に収める', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ language: 'fr', seVolume: 250, bgmVolume: -3, muted: 'yes' })).toEqual({
      language: 'ja',
      seVolume: 100,
      bgmVolume: 0,
      muted: false,
    });
  });

  it('保存した言語・音量は次の起動でも使われ、セーブとは別に保存される', () => {
    const storage = new MemoryStorage();
    const store = new GameStore(storage);
    store.newGame('male');
    const saveBefore = storage.getItem(SAVE_KEY);
    store.settings.update({ language: 'en', seVolume: 30 });
    expect(getLanguage()).toBe('en');
    expect(sound.volume).toBeCloseTo(0.3);
    expect(storage.getItem(SAVE_KEY)).toBe(saveBefore);
    setLanguage('ja');
    const again = new GameStore(storage);
    expect(getLanguage()).toBe('en');
    expect(again.settings.value.seVolume).toBe(30);
    expect(JSON.parse(storage.getItem(SETTINGS_KEY) ?? '{}').language).toBe('en');
  });

  it('ミュート・音量0なら鳴らさない', () => {
    expect(effectiveSeVolume({ ...DEFAULT_SETTINGS, muted: true })).toBe(0);
    expect(effectiveSeVolume({ ...DEFAULT_SETTINGS, seVolume: 0 })).toBe(0);
    expect(effectiveSeVolume({ ...DEFAULT_SETTINGS, seVolume: 50 })).toBe(0.5);
  });

  it('言語を変えても進行は変わらない', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, JSON.stringify(OLD_SAVE));
    const store = new GameStore(storage);
    const before = storage.getItem(SAVE_KEY);
    store.settings.update({ language: 'en' });
    store.settings.update({ language: 'ja' });
    expect(storage.getItem(SAVE_KEY)).toBe(before);
  });
});

describe('アプリ名・PWA・配信先（正式名称）', () => {
  const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
  const html = readFileSync('index.html', 'utf8');

  it('manifest は正式名称・短縮名・正式アイコン', () => {
    expect(manifest.name).toBe(APP_INFO.gameName);
    expect(manifest.short_name).toBe('セイクリッドBC');
    expect(manifest.start_url).toBe('./');
    expect(manifest.icons.map((i: { src: string }) => i.src)).toEqual(['icons/icon-192.png', 'icons/icon-512.png']);
  });

  it('index.html の題名・ホーム画面名・アイコン', () => {
    expect(html).toContain(`<title>${APP_INFO.gameName}</title>`);
    expect(html).toContain('content="セイクリッドBC"');
    expect(html).toContain('href="/icons/apple-touch-icon.png"');
    expect(html).toContain('href="/icons/favicon-32.png"');
  });

  it('画面・アプリ情報に旧称が残っていない', () => {
    for (const text of [html, JSON.stringify(manifest), JSON.stringify(APP_INFO)]) {
      expect(text).not.toMatch(/ミストリア|ミルティル|Mistria|Mirtill/);
    }
  });

  it('Pages の base は新しいリポジトリ名', () => {
    expect(PAGES_BASE).toBe('/sacred-monsters-battle-card/');
  });

  it('アイコンの画像は決まった大きさ', () => {
    const size = (file: string): [number, number] => {
      const b = readFileSync(file);
      return [b.readUInt32BE(16), b.readUInt32BE(20)];
    };
    expect(size('public/icons/icon-512.png')).toEqual([512, 512]);
    expect(size('public/icons/icon-192.png')).toEqual([192, 192]);
    expect(size('public/icons/apple-touch-icon.png')).toEqual([180, 180]);
    expect(size('public/icons/favicon-32.png')).toEqual([32, 32]);
    expect(size('public/icons/favicon-16.png')).toEqual([16, 16]);
    expect(size('assets/images/icons/sacred-monsters-bc-official-icon.png')).toEqual([1254, 1254]);
  });
});
