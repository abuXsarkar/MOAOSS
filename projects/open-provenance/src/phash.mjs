// Perceptual hash (64-bit DCT pHash), implemented to match durable/lib.py's phash_bits so a
// registry built by the Python tools is usable directly in the browser. Pure functions, no
// dependencies: pass raw pixels (browser: from a canvas; Node: from an image decoder).
//
// Pipeline mirrors OpenCV: area-average downscale to 32x32 with luma weights
// 0.299R+0.587G+0.114B, then an orthonormal 2D DCT-II, then threshold the top-left 8x8 block
// against the median of its AC coefficients.
const N = 32;

const COS = (() => {
  const m = new Float64Array(N * N);
  for (let k = 0; k < N; k++) for (let n = 0; n < N; n++) m[k * N + n] = Math.cos(Math.PI * (2 * n + 1) * k / (2 * N));
  return m;
})();

/** Area-average downscale of an interleaved pixel buffer to a 32x32 grayscale Float64Array. */
export function grayResize32(px, w, h, channels) {
  const out = new Float64Array(N * N);
  for (let oy = 0; oy < N; oy++) {
    const y0 = Math.floor(oy * h / N), y1 = Math.max(y0 + 1, Math.floor((oy + 1) * h / N));
    for (let ox = 0; ox < N; ox++) {
      const x0 = Math.floor(ox * w / N), x1 = Math.max(x0 + 1, Math.floor((ox + 1) * w / N));
      let s = 0, cnt = 0;
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const i = (y * w + x) * channels;
          s += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
          cnt++;
        }
      }
      out[oy * N + ox] = s / cnt;
    }
  }
  return out;
}

function dct1d(vec, out) {
  for (let k = 0; k < N; k++) {
    let s = 0;
    for (let n = 0; n < N; n++) s += vec[n] * COS[k * N + n];
    out[k] = (k === 0 ? Math.sqrt(1 / N) : Math.sqrt(2 / N)) * s;
  }
}

function dct2(gray) {
  const tmp = new Float64Array(N * N), row = new Float64Array(N), drow = new Float64Array(N);
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) row[c] = gray[r * N + c];
    dct1d(row, drow);
    for (let c = 0; c < N; c++) tmp[r * N + c] = drow[c];
  }
  const out = new Float64Array(N * N), col = new Float64Array(N), dcol = new Float64Array(N);
  for (let c = 0; c < N; c++) {
    for (let r = 0; r < N; r++) col[r] = tmp[r * N + c];
    dct1d(col, dcol);
    for (let r = 0; r < N; r++) out[r * N + c] = dcol[r];
  }
  return out;
}

/** 64-bit pHash as a boolean array, from a 32x32 grayscale Float64Array. */
export function phashBits(gray32) {
  const d = dct2(gray32);
  const vals = new Array(64);
  for (let u = 0; u < 8; u++) for (let v = 0; v < 8; v++) vals[u * 8 + v] = d[u * N + v];
  const rest = vals.slice(1).sort((a, b) => a - b);
  const m = rest.length;
  const med = m % 2 ? rest[(m - 1) / 2] : (rest[m / 2 - 1] + rest[m / 2]) / 2;
  return vals.map((x) => x > med);
}

export function bitsToHex(bits) {
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4).map((b) => (b ? '1' : '0')).join(''), 2).toString(16);
  }
  return hex;
}

export function hexToBits(hex) {
  const bits = [];
  for (const ch of hex) {
    const n = parseInt(ch, 16);
    for (let b = 3; b >= 0; b--) bits.push(((n >> b) & 1) === 1);
  }
  return bits;
}

export function hamming(a, b) {
  let d = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) d++;
  return d;
}
