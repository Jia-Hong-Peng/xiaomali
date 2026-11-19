// 跑燈動畫控制器。結果由引擎先決定，這裡只負責把燈「走到」指定位置。
// 動畫計時永遠不是隨機來源。
import { NUM_LAMPS, SPIN } from './config.js';

const easeOut = (t) => 1 - (1 - t) ** 2;

/**
 * 產生跑燈排程：每一步 { pos, delay }，delay 是「走到 pos 之前」等待的毫秒數。
 * 最後一步的 pos 必定等於 target。純函式，可測試。
 */
export function buildSchedule(from, target, opts = SPIN) {
  const { laps, accelSteps, decelSteps, startDelay, fastDelay, endDelay } = opts;
  const gap = (((target - from) % NUM_LAMPS) + NUM_LAMPS) % NUM_LAMPS;
  const total = NUM_LAMPS * laps + gap;
  const steps = [];
  for (let i = 0; i < total; i++) {
    let delay;
    if (i < accelSteps) {
      delay = startDelay + (fastDelay - startDelay) * easeOut((i + 1) / accelSteps);
    } else if (i >= total - decelSteps) {
      const j = (i - (total - decelSteps) + 1) / decelSteps; // (0,1]
      delay = fastDelay + (endDelay - fastDelay) * j ** 2.3;
    } else {
      delay = fastDelay;
    }
    steps.push({ pos: (from + i + 1) % NUM_LAMPS, delay: Math.round(delay) });
  }
  return steps;
}

export function scheduleDuration(steps) {
  return steps.reduce((a, s) => a + s.delay, 0);
}

/**
 * 依排程驅動跑燈。timer 可注入（測試用）。
 * onStep(pos, index, total, delay)；onDone(lastPos)；回傳 { cancel, finishNow }。
 */
export function runSchedule(steps, { onStep, onDone, timer = { set: (fn, ms) => setTimeout(fn, ms), clear: (h) => clearTimeout(h) } }) {
  let i = 0;
  let handle = null;
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    if (handle != null) timer.clear(handle);
    onDone(steps.length ? steps[steps.length - 1].pos : null);
  };
  const next = () => {
    if (finished) return;
    if (i >= steps.length) { finish(); return; }
    const s = steps[i];
    handle = timer.set(() => {
      handle = null;
      if (finished) return;
      onStep(s.pos, i, steps.length, s.delay);
      i += 1;
      if (i >= steps.length) finish(); else next();
    }, s.delay);
  };
  next();
  return {
    cancel() { finished = true; if (handle != null) timer.clear(handle); },
    /** 切回分頁等情況：直接跳到終點。 */
    finishNow() {
      if (finished) return;
      if (steps.length) onStep(steps[steps.length - 1].pos, steps.length - 1, steps.length, 0);
      finish();
    },
    get done() { return finished; },
  };
}
