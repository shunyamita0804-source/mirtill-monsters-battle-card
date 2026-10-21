import { DESIGN_RESOLUTION } from '../config/app.ts';

/** 論理解像度のステージを実画面に収めるための配置情報 */
export interface StageLayout {
  /** 拡大縮小率（論理px → 実px） */
  readonly scale: number;
  /** ステージの論理幅（常に基準幅） */
  readonly width: number;
  /** ステージの論理高さ（基準高さ以上。縦長の端末では余った分だけ伸ばす） */
  readonly height: number;
  /** 表示領域内での左上位置（実px） */
  readonly offsetX: number;
  readonly offsetY: number;
}

export interface BaseResolution {
  readonly width: number;
  readonly height: number;
}

/**
 * セーフエリアを除いた表示領域（実px）に、基準解像度のステージを収める。
 *
 * - 基準の 390×844 が必ず全部見えるように縮小・拡大する（UIが欠けない）
 * - 基準より縦長の端末では、余白を作らずステージの論理高さを伸ばす
 * - 基準より横長の端末（タブレット・PC・横持ち）では左右に余白を作り中央寄せ
 */
export function computeStageLayout(
  availableWidth: number,
  availableHeight: number,
  base: BaseResolution = DESIGN_RESOLUTION,
): StageLayout {
  if (!(availableWidth > 0) || !(availableHeight > 0)) {
    return { scale: 1, width: base.width, height: base.height, offsetX: 0, offsetY: 0 };
  }
  const scale = Math.min(availableWidth / base.width, availableHeight / base.height);
  const width = base.width;
  const height = Math.max(base.height, Math.floor(availableHeight / scale));
  return {
    scale,
    width,
    height,
    offsetX: (availableWidth - width * scale) / 2,
    offsetY: (availableHeight - height * scale) / 2,
  };
}
