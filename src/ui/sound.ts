import cardDrawOgg from '@assets/audio/se/card_draw.ogg';
import cardDrawM4a from '@assets/audio/se/card_draw.m4a';
import turnOrderOgg from '@assets/audio/se/turn_order_select.ogg';
import turnOrderM4a from '@assets/audio/se/turn_order_select.m4a';

/**
 * 効果音（SE）。
 *
 * - 素材の差し替えは SE_REGISTRY を書き換えるだけ（音の出どころは docs/audio-credits.md）
 * - Web Audio（AudioContext）で鳴らす。iPhone Safari は最初のタップまで音を出せないため、
 *   最初の pointerdown で AudioContext を再開してから読み込む
 * - 同じ音を短い間隔で何度でも重ねて鳴らせる（カードを1枚ずつ配る音）
 * - 音が鳴らせない環境では何もしない（ゲームは止めない）
 */
export type SoundId = 'cardDraw' | 'turnOrderSelect';

interface SoundEntry {
  /** OGG（Chrome・Firefox など）と M4A（iPhone Safari など）。再生できる方を使う */
  readonly ogg: string;
  readonly m4a: string;
  /** 音量（1 = 元のまま） */
  readonly gain: number;
}

export const SE_REGISTRY: Readonly<Record<SoundId, SoundEntry>> = {
  // カードを引く・配る：ミスティックモンスターズの UI_SELECT と同じ音（Interface SFX Pack 1 / ObsydianX・CC0）
  cardDraw: { ogg: cardDrawOgg, m4a: cardDrawM4a, gain: 2.0 },
  // 先攻・後攻のカードを選んだ瞬間：ミスティックモンスターズ正式素材「分かれ道の選択」（15_branch_select）
  turnOrderSelect: { ogg: turnOrderOgg, m4a: turnOrderM4a, gain: 1.0 },
};

type AudioContextCtor = typeof AudioContext;

class SoundPlayer {
  #ctx: AudioContext | null = null;
  #buffers = new Map<SoundId, AudioBuffer>();
  #loading = new Map<SoundId, Promise<void>>();
  #unlockInstalled = false;

  /** 最初のタップで音を使えるようにする（何度呼んでもよい） */
  installUnlock(): void {
    if (this.#unlockInstalled || typeof window === 'undefined') return;
    this.#unlockInstalled = true;
    const unlock = (): void => {
      const ctx = this.#context();
      if (ctx && ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
      this.preload();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
  }

  #context(): AudioContext | null {
    if (this.#ctx) return this.#ctx;
    if (typeof window === 'undefined') return null;
    const Ctor = (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext) as
      | AudioContextCtor
      | undefined;
    if (!Ctor) return null;
    try {
      this.#ctx = new Ctor();
    } catch {
      this.#ctx = null;
    }
    return this.#ctx;
  }

  #source(entry: SoundEntry): string {
    const probe = typeof document !== 'undefined' ? document.createElement('audio') : null;
    const ogg = probe?.canPlayType('audio/ogg; codecs="vorbis"') ?? '';
    return ogg !== '' ? entry.ogg : entry.m4a;
  }

  preload(): void {
    for (const id of Object.keys(SE_REGISTRY) as SoundId[]) void this.#load(id);
  }

  #load(id: SoundId): Promise<void> {
    const existing = this.#loading.get(id);
    if (existing) return existing;
    const ctx = this.#context();
    if (!ctx) return Promise.resolve();
    const task = fetch(this.#source(SE_REGISTRY[id]))
      .then((r) => r.arrayBuffer())
      .then(
        (data) =>
          new Promise<AudioBuffer>((resolve, reject) => {
            // 古い Safari はコールバック形式のみ。Promise も返れば両方に備える
            const r = ctx.decodeAudioData(data, resolve, reject) as Promise<AudioBuffer> | undefined;
            if (r && typeof r.then === 'function') r.then(resolve, reject);
          }),
      )
      .then((buffer) => {
        this.#buffers.set(id, buffer);
      })
      .catch(() => {
        // 読み込めなければ無音のまま
      });
    this.#loading.set(id, task);
    return task;
  }

  /** delayMs 後に鳴らす（カードを1枚ずつ配るときの時間差に使う） */
  play(id: SoundId, delayMs = 0): void {
    const ctx = this.#context();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const buffer = this.#buffers.get(id);
    if (!buffer) {
      void this.#load(id);
      return;
    }
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = SE_REGISTRY[id].gain;
      source.connect(gain).connect(ctx.destination);
      source.start(ctx.currentTime + Math.max(0, delayMs) / 1000);
    } catch {
      // 鳴らせなくてもゲームは続ける
    }
  }
}

export const sound = new SoundPlayer();
