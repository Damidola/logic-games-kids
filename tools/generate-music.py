"""Create the original, seamless background loop. Requires numpy and ffmpeg."""
from pathlib import Path
import subprocess
import tempfile
import wave

import numpy as np

RATE = 32000
BEAT = 60 / 84
BARS = 16
LENGTH = round(BARS * 4 * BEAT * RATE)
mix = np.zeros((LENGTH, 2), dtype=np.float64)


def note(midi, beat, beats, level, pan=0, pad=False):
    t = np.arange(round(beats * BEAT * RATE)) / RATE
    freq = 440 * 2 ** ((midi - 69) / 12)
    if pad:
        envelope = np.minimum(t / 0.4, 1) * np.minimum((t[-1] - t) / 0.8, 1)
        signal = np.sin(2 * np.pi * freq * t) * envelope
    else:
        envelope = (1 - np.exp(-t / 0.012)) * np.exp(-t / 0.7)
        envelope *= np.minimum((t[-1] - t) / 0.08, 1)
        signal = (np.sin(2 * np.pi * freq * t)
                  + 0.18 * np.sin(2 * np.pi * freq * 2 * t)
                  + 0.05 * np.sin(2 * np.pi * freq * 3 * t)) * envelope
    stereo = signal[:, None] * np.sqrt([(1 - pan) / 2, (1 + pan) / 2]) * level
    # Wrap note tails and echoes into the start, so the loop has no silent seam.
    start = round(beat * BEAT * RATE)
    for delay, gain in [(0, 1), (0.21, 0.13), (0.43, 0.07)]:
        indices = (start + round(delay * RATE) + np.arange(len(t))) % LENGTH
        mix[indices] += stereo * gain


# Cmaj7, Am7, Fmaj7, G6: soft pads, a music-box arpeggio and a sparse melody.
chords = [(48, 55, 59, 64), (45, 52, 55, 60), (41, 48, 52, 57), (43, 50, 55, 59)]
melody = [(76, 79, 74, 76), (72, 76, 79, 76), (72, 77, 76, 72), (71, 74, 69, 67)]
for bar in range(BARS):
    chord = chords[bar % 4]
    for pitch in chord:
        note(pitch, bar * 4, 5, 0.045, pad=True)
    for step, index in enumerate([0, 2, 1, 3, 2, 1, 3, 2]):
        note(chord[index] + 12, bar * 4 + step / 2, 2, 0.12, pan=(-0.25 if step % 2 else 0.25))
    for step, pitch in enumerate(melody[bar % 4]):
        if (bar + step) % 3 != 0:
            note(pitch, bar * 4 + step, 2.5, 0.10, pan=-0.1)

mix *= 0.8 / max(1e-9, np.abs(mix).max())
output = Path(__file__).resolve().parents[1] / 'shared/sounds/background.mp3'
with tempfile.TemporaryDirectory() as tmp:
    wav = Path(tmp) / 'background.wav'
    with wave.open(str(wav), 'wb') as f:
        f.setnchannels(2)
        f.setsampwidth(2)
        f.setframerate(RATE)
        f.writeframes((mix * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav),
                    '-codec:a', 'libmp3lame', '-b:a', '64k', '-map_metadata', '-1', str(output)], check=True)
print(output)
