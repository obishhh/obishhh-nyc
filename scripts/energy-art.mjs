// Paints the backgrounds of the deck's energy notes, one per type, into assets/energy/<type>.webp: the way each type's
// energy looks on a real card, from water's ripples to fire's flames. Painted once here, so a card just shows a picture.
//
// By hand, after changing a type's look: npm i --no-save playwright, then node scripts/energy-art.mjs [type …].
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../assets/energy/', import.meta.url));
// The card's panel, at twice its size.
const SIZE = { width: 480, height: 672 };
const QUALITY = 0.86;

// Runs in the page: everything it needs is in here.
function paint([type, { width, height, quality }]) {
  // A random sequence that's the same every time for the same seed.
  const random = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const next = random([...type].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7));
  const between = (low, high) => low + next() * (high - low);

  // Smooth noise, and layers of it, for anything organic.
  const lattice = new Float32Array(256 * 256).map(() => next());
  const smooth = (t) => t * t * (3 - 2 * t);
  const at = (x, y) => lattice[((y & 255) << 8) | (x & 255)];
  function noise(x, y) {
    const [ix, iy] = [Math.floor(x), Math.floor(y)];
    const [fx, fy] = [smooth(x - ix), smooth(y - iy)];
    const top = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * fx;
    const bottom = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * fx;
    return top + (bottom - top) * fy;
  }
  function fbm(x, y, octaves = 5) {
    let [sum, amp, freq, total] = [0, 0.5, 1, 0];
    for (let o = 0; o < octaves; o += 1) {
      sum += noise(x * freq, y * freq) * amp;
      total += amp;
      amp *= 0.5;
      freq *= 2.03;
    }
    return sum / total;
  }

  const canvas = Object.assign(document.createElement('canvas'), { width, height });
  const pen = canvas.getContext('2d', { willReadFrequently: true });
  pen.fillStyle = '#000';
  pen.fillRect(0, 0, width, height);
  const [cx, cy] = [width / 2, height / 2];
  const reach = Math.hypot(cx, cy);
  const hex = (value) => [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const ramp = (stops, t) => {
    const clamped = Math.min(1, Math.max(0, t));
    for (let i = 1; i < stops.length; i += 1) {
      if (clamped <= stops[i][0]) {
        const [p0, c0] = stops[i - 1];
        const [p1, c1] = stops[i];
        return mix(hex(c0), hex(c1), (clamped - p0) / (p1 - p0 || 1));
      }
    }
    return hex(stops.at(-1)[1]);
  };

  // A field painted pixel by pixel: `shade(x, y, r, angle)` gives a colour and how much of it to lay over what's there.
  function field(shade) {
    const image = pen.getImageData(0, 0, width, height);
    const { data } = image;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const [dx, dy] = [x - cx, y - cy];
        const out = shade(x / width, y / height, Math.hypot(dx, dy) / reach, Math.atan2(dy, dx));
        if (!out) continue;
        const [colour, alpha] = out;
        const i = (y * width + x) * 4;
        for (let c = 0; c < 3; c += 1) data[i + c] += (colour[c] - data[i + c]) * alpha;
        data[i + 3] = 255;
      }
    }
    pen.putImageData(image, 0, 0);
  }

  // The type's colour, deep at the edges and lit up in the middle where the orb sits.
  function base(stops) {
    field((x, y, r) => [ramp(stops, 1 - r * 1.25), 1]);
  }

  // A soft light behind the orb.
  function glow(colour, size, strength) {
    const light = pen.createRadialGradient(cx, cy, 0, cx, cy, size);
    light.addColorStop(0, `rgb(${hex(colour).join(' ')} / ${strength})`);
    light.addColorStop(1, `rgb(${hex(colour).join(' ')} / 0)`);
    pen.fillStyle = light;
    pen.fillRect(0, 0, width, height);
  }

  function sparkle(x, y, size, colour, alpha = 1) {
    pen.save();
    pen.translate(x, y);
    pen.globalAlpha = alpha;
    pen.fillStyle = colour;
    pen.shadowColor = colour;
    pen.shadowBlur = size * 2;
    pen.beginPath();
    for (let i = 0; i < 8; i += 1) {
      const radius = i % 2 ? size * 0.22 : size;
      const angle = (i / 8) * Math.PI * 2;
      pen.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    pen.fill();
    pen.restore();
  }

  function bolt(x0, y0, x1, y1, spread, depth, widths) {
    let points = [[x0, y0], [x1, y1]];
    for (let d = 0; d < depth; d += 1) {
      const finer = [points[0]];
      for (let i = 1; i < points.length; i += 1) {
        const [a, b] = [points[i - 1], points[i]];
        const [mx, my] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const [nx, ny] = [-(b[1] - a[1]), b[0] - a[0]];
        const shift = between(-spread, spread) / 2 ** d;
        const length = Math.hypot(nx, ny) || 1;
        finer.push([mx + (nx / length) * shift, my + (ny / length) * shift], b);
      }
      points = finer;
    }
    for (const [lineWidth, colour, blur] of widths) {
      pen.save();
      pen.strokeStyle = colour;
      pen.lineWidth = lineWidth;
      pen.shadowColor = colour;
      pen.shadowBlur = blur;
      pen.lineJoin = 'round';
      pen.lineCap = 'round';
      pen.beginPath();
      points.forEach(([x, y], i) => (i ? pen.lineTo(x, y) : pen.moveTo(x, y)));
      pen.stroke();
      pen.restore();
    }
    return points;
  }

  const looks = {
    // Under the surface: light coming down through it in shafts, caustic webs where the ripples focus it, rings
    // spreading out from the middle, and bubbles on their way up.
    ink() {
      base([[0, '#0b3a78'], [0.45, '#1e6fc4'], [0.8, '#4fa6ea'], [1, '#bfe6ff']]);
      for (let i = 0; i < 6; i += 1) {
        const x = between(-0.2, 1.1) * width;
        const shaft = pen.createLinearGradient(x, 0, x + width * 0.25, height);
        shaft.addColorStop(0, 'rgb(220 245 255 / 0.32)');
        shaft.addColorStop(1, 'rgb(220 245 255 / 0)');
        pen.fillStyle = shaft;
        pen.beginPath();
        const w = between(18, 60);
        pen.moveTo(x, 0);
        pen.lineTo(x + w, 0);
        pen.lineTo(x + w + width * 0.3, height);
        pen.lineTo(x + width * 0.3, height);
        pen.fill();
      }
      field((x, y) => {
        const [wx, wy] = [x * 5 + fbm(x * 3 + 7, y * 3) * 2.2, y * 5 + fbm(x * 3, y * 3 + 4) * 2.2];
        const ridge = (u, v) => (1 - Math.abs(fbm(u, v, 4) * 2 - 1)) ** 10;
        const web = Math.max(ridge(wx, wy), ridge(wx * 1.7 + 3, wy * 1.7) * 0.7);
        return [[226, 248, 255], web * (0.75 - y * 0.4)];
      });
      for (let i = 0; i < 7; i += 1) {
        pen.save();
        pen.strokeStyle = `rgb(225 245 255 / ${0.42 - i * 0.05})`;
        pen.lineWidth = 2.4 - i * 0.25;
        pen.beginPath();
        const radius = 60 + i * 34;
        for (let a = 0; a <= Math.PI * 2 + 0.05; a += 0.05) {
          const wobble = (fbm(Math.cos(a) * 2 + i, Math.sin(a) * 2) - 0.5) * 16;
          pen.lineTo(cx + Math.cos(a) * (radius + wobble), cy + Math.sin(a) * (radius + wobble) * 0.9);
        }
        pen.stroke();
        pen.restore();
      }
      for (let i = 0; i < 46; i += 1) {
        const r = between(2, 13) * (next() < 0.15 ? 1.8 : 1);
        const x = between(0, width);
        const y = between(0, height) ** 1 * (next() < 0.6 ? 0.7 : 1);
        pen.save();
        pen.strokeStyle = 'rgb(235 250 255 / 0.75)';
        pen.lineWidth = Math.max(1, r * 0.16);
        pen.fillStyle = 'rgb(200 235 255 / 0.12)';
        pen.beginPath();
        pen.arc(x, y, r, 0, Math.PI * 2);
        pen.fill();
        pen.stroke();
        pen.fillStyle = 'rgb(255 255 255 / 0.85)';
        pen.beginPath();
        pen.arc(x - r * 0.35, y - r * 0.35, r * 0.22, 0, Math.PI * 2);
        pen.fill();
        pen.restore();
      }
      glow('#e6f6ff', 170, 0.85);
    },

    // A blaze: tongues of flame bursting out from the middle in every direction, hotter at the roots, with embers
    // drifting up off it.
    ember() {
      base([[0, '#5e0c06'], [0.4, '#b5220f'], [0.75, '#e8562b'], [1, '#ffb15e']]);
      field((x, y, r, angle) => {
        const [around, out] = [Math.cos(angle) * 2.4, Math.sin(angle) * 2.4];
        const lick = fbm(around + 3 + r * 1.2, out - r * 3.2 - fbm(x * 4, y * 4) * 1.4, 5);
        const heat = lick * 1.55 - r * 1.25 + 0.15;
        if (heat <= 0) return null;
        const colour = ramp([[0, '#c2280f'], [0.35, '#f26a1b'], [0.6, '#ffb02e'], [0.85, '#ffe58a'], [1, '#fffbe6']], heat * 1.6);
        return [colour, Math.min(1, heat * 2.2)];
      });
      field((x, y) => {
        const rise = fbm(x * 6, y * 2.2 + 5, 4);
        const tongue = Math.max(0, rise - 0.52) * 3.2 * (y ** 1.6);
        return tongue > 0 ? [[255, 196, 92], Math.min(0.8, tongue)] : null;
      });
      for (let i = 0; i < 70; i += 1) {
        const x = between(0, width);
        const y = between(0, height);
        const size = between(1, 3.4);
        pen.save();
        pen.fillStyle = next() < 0.5 ? '#ffe9a8' : '#ffb347';
        pen.shadowColor = '#ff8a2a';
        pen.shadowBlur = size * 5;
        pen.globalAlpha = between(0.5, 1);
        pen.beginPath();
        pen.ellipse(x, y, size * 0.7, size * 1.6, between(-0.4, 0.4), 0, Math.PI * 2);
        pen.fill();
        pen.restore();
      }
      glow('#fff2c6', 150, 0.9);
    },

    // Undergrowth: leaves layered from deep in the shade to bright at the front, and dappled sun through them.
    wire() {
      base([[0, '#0c3d1a'], [0.45, '#1f7a35'], [0.8, '#4fb35a'], [1, '#c8f0b6']]);
      const leaf = (x, y, size, angle, colour, alpha, blur) => {
        pen.save();
        pen.translate(x, y);
        pen.rotate(angle);
        pen.globalAlpha = alpha;
        pen.filter = blur ? `blur(${blur}px)` : 'none';
        pen.fillStyle = colour;
        pen.beginPath();
        pen.moveTo(0, -size);
        pen.bezierCurveTo(size * 0.62, -size * 0.55, size * 0.6, size * 0.45, 0, size);
        pen.bezierCurveTo(-size * 0.6, size * 0.45, -size * 0.62, -size * 0.55, 0, -size);
        pen.fill();
        if (!blur) {
          pen.strokeStyle = 'rgb(255 255 255 / 0.28)';
          pen.lineWidth = Math.max(1, size * 0.04);
          pen.beginPath();
          pen.moveTo(0, -size * 0.9);
          pen.lineTo(0, size * 0.95);
          for (let v = -0.5; v < 0.8; v += 0.32) {
            pen.moveTo(0, size * v);
            pen.lineTo(size * 0.38, size * (v - 0.22));
            pen.moveTo(0, size * v);
            pen.lineTo(-size * 0.38, size * (v - 0.22));
          }
          pen.stroke();
        }
        pen.restore();
      };
      const layers = [
        [44, [46, 90], '#0b4a1d', 0.7, 4],
        [40, [38, 72], '#18702c', 0.75, 1.6],
        [34, [30, 58], '#2f9140', 0.85, 0],
        [18, [24, 44], '#7cc95a', 0.9, 0],
      ];
      for (const [count, [low, high], colour, alpha, blur] of layers) {
        for (let i = 0; i < count; i += 1) {
          const angle = between(0, Math.PI * 2);
          const distance = between(0.36, 1.1) * reach * 0.66;
          leaf(cx + Math.cos(angle) * distance * 1.05, cy + Math.sin(angle) * distance * 1.25, between(low, high), angle + Math.PI / 2 + between(-0.6, 0.6), colour, alpha, blur);
        }
      }
      field((x, y) => {
        const dapple = fbm(x * 5 + 11, y * 5, 4);
        return dapple > 0.6 ? [[235, 255, 200], (dapple - 0.6) * 1.1] : null;
      });
      glow('#f1ffe0', 160, 0.88);
    },

    // A storm in a bottle: bolts forking out from the middle, crackling into finer branches, over a charged haze.
    spark() {
      base([[0, '#6b4a00'], [0.4, '#c99300'], [0.75, '#f2c418'], [1, '#fff2a6']]);
      field((x, y) => {
        const charge = fbm(x * 7, y * 7, 4);
        const lines = (1 - Math.abs(Math.sin((charge * 9 + x * 3) * Math.PI))) ** 14;
        return [[255, 252, 220], lines * 0.35];
      });
      const arms = 11;
      for (let i = 0; i < arms; i += 1) {
        const angle = (i / arms) * Math.PI * 2 + between(-0.2, 0.2);
        const length = between(0.55, 0.95) * reach;
        const end = [cx + Math.cos(angle) * length, cy + Math.sin(angle) * length];
        const points = bolt(cx, cy, end[0], end[1], length * 0.28, 6, [[7, 'rgb(255 214 64 / 0.45)', 22], [3.2, '#fff7c2', 8], [1.4, '#ffffff', 2]]);
        for (let b = 0; b < 2; b += 1) {
          const from = points[Math.floor(between(0.3, 0.7) * points.length)];
          const turn = angle + between(-0.9, 0.9);
          const branch = length * between(0.18, 0.35);
          bolt(from[0], from[1], from[0] + Math.cos(turn) * branch, from[1] + Math.sin(turn) * branch, branch * 0.35, 4, [[3, 'rgb(255 214 64 / 0.4)', 12], [1.4, '#fffbe0', 4]]);
        }
      }
      glow('#fffbe0', 150, 0.9);
    },

    // Bedrock: strata bent by pressure, cracks running through them, and grit over everything.
    stone() {
      base([[0, '#4a2f14'], [0.4, '#8c5e2c'], [0.75, '#c08a4e'], [1, '#f2dcb2']]);
      field((x, y) => {
        const bend = fbm(x * 2.5, y * 2.5 + 3, 5) * 2.4;
        const band = Math.sin((y * 11 + bend * 3 + x * 1.2) * Math.PI);
        const tone = band > 0 ? [246, 222, 178] : [74, 46, 20];
        return [tone, Math.abs(band) ** 3 * 0.32];
      });
      for (let i = 0; i < 9; i += 1) {
        pen.save();
        pen.strokeStyle = 'rgb(48 28 10 / 0.6)';
        pen.lineWidth = between(1.2, 2.6);
        pen.beginPath();
        let [x, y] = [between(0, width), between(0, height)];
        let heading = between(0, Math.PI * 2);
        pen.moveTo(x, y);
        for (let s = 0; s < 22; s += 1) {
          heading += between(-0.7, 0.7);
          x += Math.cos(heading) * between(8, 18);
          y += Math.sin(heading) * between(8, 18);
          pen.lineTo(x, y);
        }
        pen.stroke();
        pen.strokeStyle = 'rgb(255 236 200 / 0.25)';
        pen.lineWidth = 1;
        pen.translate(1.4, 1.4);
        pen.stroke();
        pen.restore();
      }
      for (let i = 0; i < 2400; i += 1) {
        pen.fillStyle = next() < 0.5 ? 'rgb(255 240 210 / 0.35)' : 'rgb(50 30 12 / 0.35)';
        pen.fillRect(between(0, width), between(0, height), between(0.8, 2.2), between(0.8, 2.2));
      }
      for (let i = 0; i < 14; i += 1) {
        const [x, y, r] = [between(0, width), between(0, height), between(6, 18)];
        const stone = pen.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r);
        stone.addColorStop(0, 'rgb(240 214 170 / 0.9)');
        stone.addColorStop(1, 'rgb(110 74 36 / 0.9)');
        pen.fillStyle = stone;
        pen.beginPath();
        pen.ellipse(x, y, r, r * between(0.6, 0.9), between(0, Math.PI), 0, Math.PI * 2);
        pen.fill();
      }
      glow('#fff1d6', 150, 0.85);
    },

    // The mind's eye: a vortex spiralling in on the middle, rings of shimmer around it, and stars caught in it.
    ghost() {
      base([[0, '#2c0f4a'], [0.4, '#6a2b98'], [0.75, '#a965d6'], [1, '#f1d8ff']]);
      field((x, y, r, angle) => {
        const twist = Math.log(r + 0.04) * 5.5 - (angle * 3) / Math.PI + fbm(x * 3, y * 3, 4) * 3;
        const band = (Math.sin(twist * Math.PI) + 1) / 2;
        return [band > 0.5 ? [255, 214, 250] : [50, 10, 80], Math.abs(band - 0.5) * 0.55 * (1 - r * 0.4)];
      });
      for (let i = 0; i < 9; i += 1) {
        pen.save();
        pen.strokeStyle = `rgb(255 225 255 / ${0.32 - i * 0.03})`;
        pen.lineWidth = 1.6;
        pen.setLineDash([between(4, 18), between(4, 14)]);
        pen.beginPath();
        pen.ellipse(cx, cy, 70 + i * 26, (70 + i * 26) * 0.92, between(0, Math.PI), 0, Math.PI * 2);
        pen.stroke();
        pen.restore();
      }
      for (let i = 0; i < 36; i += 1) sparkle(between(0, width), between(0, height), between(2.5, 7), next() < 0.4 ? '#ffe7ff' : '#ffffff', between(0.5, 1));
      glow('#fbeaff', 160, 0.9);
    },

    // Plain light: soft rays from the middle and stars twinkling all over, cream and gold.
    plain() {
      base([[0, '#b7b0a1'], [0.45, '#d8d2c5'], [0.8, '#efebe2'], [1, '#ffffff']]);
      field((x, y, r, angle) => {
        const ray = (Math.sin(angle * 18 + fbm(x * 2, y * 2) * 4) + 1) / 2;
        return [[255, 252, 240], ray ** 3 * 0.45 * (1 - r)];
      });
      for (let i = 0; i < 44; i += 1) sparkle(between(0, width), between(0, height), between(3, 11), next() < 0.45 ? '#f6e3a4' : '#ffffff', between(0.6, 1));
      for (let i = 0; i < 160; i += 1) {
        pen.fillStyle = next() < 0.5 ? 'rgb(214 196 140 / 0.5)' : 'rgb(255 255 255 / 0.8)';
        pen.beginPath();
        pen.arc(between(0, width), between(0, height), between(0.8, 2), 0, Math.PI * 2);
        pen.fill();
      }
      glow('#ffffff', 170, 0.95);
    },

    // Night: smoke curling through the dark, a crescent of light catching the middle, and a few cold stars.
    dark() {
      base([[0, '#07060c'], [0.45, '#1d1830'], [0.8, '#3d3460'], [1, '#7f73a8']]);
      field((x, y) => {
        const curl = fbm(x * 2.6 + fbm(x * 3, y * 3) * 1.8, y * 2.6 + 9, 6);
        const smoke = Math.max(0, curl - 0.48) * 2.6;
        return smoke > 0 ? [[150, 136, 196], Math.min(0.55, smoke)] : null;
      });
      pen.save();
      pen.shadowColor = '#c9bfff';
      pen.shadowBlur = 40;
      pen.strokeStyle = 'rgb(214 206 255 / 0.5)';
      pen.lineWidth = 7;
      pen.lineCap = 'round';
      pen.beginPath();
      pen.arc(cx, cy, 168, Math.PI * 0.6, Math.PI * 1.5);
      pen.stroke();
      pen.lineWidth = 2;
      pen.strokeStyle = 'rgb(214 206 255 / 0.3)';
      pen.beginPath();
      pen.arc(cx, cy, 190, Math.PI * 0.68, Math.PI * 1.38);
      pen.stroke();
      pen.restore();
      for (let i = 0; i < 26; i += 1) sparkle(between(0, width), between(0, height), between(1.5, 4.5), '#d8d2ff', between(0.4, 0.9));
      glow('#8e83c0', 150, 0.7);
    },
  };

  looks[type]();
  return canvas.toDataURL('image/webp', quality);
}

const TYPES = ['ink', 'ember', 'wire', 'spark', 'stone', 'ghost', 'plain', 'dark'];
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : TYPES;

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync(OUT, { recursive: true });
for (const type of wanted) {
  const url = await page.evaluate(paint, [type, { ...SIZE, quality: QUALITY }]).catch((error) => {
    throw new Error(`${type}: ${error.message}`);
  });
  writeFileSync(`${OUT}${type}.webp`, Buffer.from(url.split(',')[1], 'base64'));
  console.log(`painted ${type}`);
}
await browser.close();
