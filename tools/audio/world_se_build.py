"""街・ダンジョンの効果音を作る（2026-10-23。ユーザー提供の効果音 ZIP「Downloads 2」・利用確認済み）。

1. 足音：「〇〇の上を走る」の録音（数秒〜十数秒の連続した足音）から、1歩ぶんの音を何個か切り出して
   <書き出し先>/steps/<名前>_<番号>.mp3 に書き出す。ゲームでは人物の足が地面に着くコマで1個ずつ鳴らす。
2. 水中の環境音：「水中.mp3」の終わりを頭へなめらかにつないだループ（<書き出し先>/underwater_loop.mp3）

使い方：
  python3 -I tools/audio/world_se_build.py <受け取った mp3 のフォルダ> assets/audio/se

- 音の大きさの山（1歩の始まり）を探し、山の少し前から LEN 秒を切り出して最後をフェードアウトする
- 大きくはっきりした山から、ほかの山と離れているものを COUNT 個選ぶ
- 切り出した音どうしの大きさをそろえる（いちばん大きいところを -3dB に）。音色は変えない
"""

import subprocess
import sys
from pathlib import Path

import numpy as np

RATE = 44100
COUNT = 4
LEN = 0.22
PRE = 0.012
FADE = 0.08

# 書き出し名 → 受け取ったファイル名
SOURCES = {
    'stone': 'アスファルトの上を走る2.mp3',
    'grass': '芝生の上を走る.mp3',
    'wood': '体育館で走る.mp3',
    'gravel': '砂利の上を走る.mp3',
    'dirt': '土の上を走る.mp3',
    'sand': '砂の上を走る.mp3',
    'snow': '雪の上を走る2.mp3',
    'wet': 'プールサイドを走る.mp3',
}


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(RATE), '-f', 's16le', '-'],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768.0


def onsets(x: np.ndarray) -> list[int]:
    hop = 256
    n = len(x) // hop
    env = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1))
    smooth = np.convolve(env, np.ones(3) / 3, mode='same')
    floor = np.median(smooth)
    found: list[tuple[float, int]] = []
    min_gap = int(0.16 * RATE / hop)
    for i in range(1, n - 1):
        if smooth[i] > smooth[i - 1] and smooth[i] >= smooth[i + 1] and smooth[i] > floor * 2.5:
            found.append((float(smooth[i]), i))
    found.sort(reverse=True)
    picked: list[int] = []
    for _, i in found:
        if all(abs(i - j) > min_gap for j in picked):
            picked.append(i)
    # 山の位置から、立ち上がり（山の 30% を超えたところ）までさかのぼる
    starts = []
    for i in picked:
        j = i
        while j > 0 and smooth[j] > smooth[i] * 0.3:
            j -= 1
        starts.append(j * hop)
    return starts


def cut(x: np.ndarray, start: int) -> np.ndarray:
    a = max(0, start - int(PRE * RATE))
    seg = x[a : a + int(LEN * RATE)].copy()
    f = int(FADE * RATE)
    seg[-f:] *= np.linspace(1, 0, f)
    seg[: int(0.003 * RATE)] *= np.linspace(0, 1, int(0.003 * RATE))
    peak = float(np.max(np.abs(seg))) or 1.0
    return seg * (10 ** (-3 / 20) / peak)


def write(seg: np.ndarray, out: Path, bitrate: str = '64k') -> None:
    pcm = (np.clip(seg, -1, 1) * 32767).astype(np.int16).tobytes()
    subprocess.run(
        ['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(RATE), '-ac', '1', '-i', '-', '-b:a', bitrate, str(out)],
        input=pcm, check=True,
    )


def make_loop(src: Path, out: Path, join: float = 1.0) -> None:
    """終わりの join 秒を頭の join 秒に重ねて、頭から繰り返せば切れ目なく続くようにする"""
    x = decode(src)
    f = int(join * RATE)
    body = x[f:].copy()
    ramp = np.linspace(0, 1, f)
    body[-f:] = body[-f:] * (1 - ramp) + x[:f] * ramp
    write(body, out, '96k')


def main() -> None:
    src_dir, base = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir = base / 'steps'
    out_dir.mkdir(parents=True, exist_ok=True)
    make_loop(src_dir / '水中.mp3', base / 'underwater_loop.mp3')
    for name, file in SOURCES.items():
        x = decode(src_dir / file)
        starts = sorted(onsets(x)[:COUNT])
        if len(starts) < COUNT:
            raise SystemExit(f'{file}: 足音が {COUNT} 個見つからない')
        for k, s in enumerate(starts, 1):
            write(cut(x, s), out_dir / f'{name}_{k}.mp3')
        print(name, [round(s / RATE, 2) for s in starts])


if __name__ == '__main__':
    main()
