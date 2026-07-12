const QUALITY_VALUES = new Set(["low", "medium", "high", "ultra"]);
const COMPLIMENT_FONT_VALUES = new Set(["orbitron", "audiowide", "monoton"]);
const MIN_AUDIO_HZ = 20;
const MAX_AUDIO_HZ = 20000;
const MIN_BAND_WIDTH_HZ = 20;

export function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function createDefaultControls() {
  return {
    sliceCount: 6,
    faceEchoes: 6,
    baseRotationSpeed: 0.045,
    faceRotationSpeed: -0.075,
    faceOpacity: 0.76,
    faceBrightness: 1.14,
    faceContrast: 1.12,
    faceScale: 1.55,
    faceHue: 0,
    faceSaturation: 0.78,
    faceRadiusResponse: 0.55,
    edgeAbstraction: 0.58,
    colorGrade: 0.72,
    mandalaHue: 0,
    mandalaColorSaturation: 0.78,
    mandalaBrightness: 1,
    mandalaContrast: 1.08,
    audioSensitivity: 1,
    bassIntensity: 0.88,
    midIntensity: 0.72,
    highIntensity: 0.64,
    bassSensitivity: 1.8,
    midSensitivity: 1,
    highSensitivity: 1,
    bassStartHz: 20,
    bassEndHz: 500,
    midStartHz: 500,
    midEndHz: 3500,
    highStartHz: 3500,
    highEndHz: 12000,
    starfield: 0.52,
    starHue: 0,
    starSaturation: 0.72,
    starBrightness: 2.35,
    starContrast: 1.7,
    starburstBrightness: 0.5,
    starburstScale: 0.2,
    complimentEnabled: 0,
    complimentRate: 1,
    complimentLockSeconds: 3,
    complimentCooldownSeconds: 15,
    complimentSize: 1,
    complimentGlow: 1,
    complimentReactivity: 1,
    complimentBrightness: 1.25,
    complimentFont: "orbitron",
    starSpeed: 1.15,
    starStreaks: 1.1,
    starDensity: 1.15,
    waveHue: 0.52,
    waveSaturation: 0.88,
    waveBrightness: 1.35,
    waveContrast: 1.45,
    waveSharpness: 0.72,
    waveScale: 1,
    waveReactivity: 1,
    glowStrength: 0.74,
    quality: "high"
  };
}

export function normalizeAudioBandRanges(input = {}, sampleRate = 48000) {
  const defaults = createDefaultControls();
  const source = input && typeof input === "object" ? input : {};
  const legacyBassEnd = 110 + clamp(source.bassRange ?? 0.58, 0, 1) * 650;
  const legacyMidEnd = 1200 + clamp(source.midRange ?? 0.3, 0, 1) * 5200;
  const nyquist = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate * 0.5 : 24000;
  const maxHz = Math.max(MIN_AUDIO_HZ + MIN_BAND_WIDTH_HZ, Math.min(MAX_AUDIO_HZ, nyquist));

  const constrainStart = (value, fallback) => clamp(value ?? fallback, MIN_AUDIO_HZ, maxHz - MIN_BAND_WIDTH_HZ);
  const constrainEnd = (value, fallback, start) => clamp(value ?? fallback, start + MIN_BAND_WIDTH_HZ, maxHz);

  const bassStartHz = constrainStart(source.bassStartHz, defaults.bassStartHz);
  const bassEndHz = constrainEnd(source.bassEndHz, "bassEndHz" in source ? source.bassEndHz : legacyBassEnd, bassStartHz);
  const midStartHz = constrainStart(source.midStartHz, "midStartHz" in source ? source.midStartHz : bassEndHz);
  const midEndHz = constrainEnd(source.midEndHz, "midEndHz" in source ? source.midEndHz : legacyMidEnd, midStartHz);
  const highStartHz = constrainStart(source.highStartHz, "highStartHz" in source ? source.highStartHz : midEndHz);
  const highEndHz = constrainEnd(source.highEndHz, defaults.highEndHz, highStartHz);

  return {
    bassStartHz: Math.round(bassStartHz),
    bassEndHz: Math.round(bassEndHz),
    midStartHz: Math.round(midStartHz),
    midEndHz: Math.round(midEndHz),
    highStartHz: Math.round(highStartHz),
    highEndHz: Math.round(highEndHz)
  };
}

export function normalizeControls(input = {}) {
  const defaults = createDefaultControls();
  const merged = { ...defaults, ...(input && typeof input === "object" ? input : {}) };
  const quality = QUALITY_VALUES.has(merged.quality) ? merged.quality : defaults.quality;
  const audioRanges = normalizeAudioBandRanges(input);
  return {
    sliceCount: Math.round(clamp(merged.sliceCount, 3, 16)),
    faceEchoes: Math.round(clamp(merged.faceEchoes, 1, 16)),
    baseRotationSpeed: clamp(merged.baseRotationSpeed, -0.4, 0.4),
    faceRotationSpeed: clamp(merged.faceRotationSpeed, -0.5, 0.5),
    faceOpacity: clamp(merged.faceOpacity, 0, 1),
    faceBrightness: clamp(merged.faceBrightness, 0, 3),
    faceContrast: clamp(merged.faceContrast, 0, 3),
    faceScale: clamp(merged.faceScale, 0.55, 3.2),
    faceHue: clamp(merged.faceHue, 0, 1),
    faceSaturation: clamp(merged.faceSaturation, 0, 1),
    faceRadiusResponse: clamp(merged.faceRadiusResponse, 0, 1),
    edgeAbstraction: clamp(merged.edgeAbstraction, 0, 1),
    colorGrade: clamp(merged.colorGrade, 0, 1),
    mandalaHue: clamp(merged.mandalaHue, 0, 1),
    mandalaColorSaturation: clamp(merged.mandalaColorSaturation, 0, 1),
    mandalaBrightness: clamp(merged.mandalaBrightness, 0, 3),
    mandalaContrast: clamp(merged.mandalaContrast, 0, 3),
    audioSensitivity: clamp(merged.audioSensitivity, 0, 2.5),
    bassIntensity: clamp(merged.bassIntensity, 0, 1.8),
    midIntensity: clamp(merged.midIntensity, 0, 1.8),
    highIntensity: clamp(merged.highIntensity, 0, 1.8),
    bassSensitivity: clamp(merged.bassSensitivity, 0, 4),
    midSensitivity: clamp(merged.midSensitivity, 0, 4),
    highSensitivity: clamp(merged.highSensitivity, 0, 4),
    bassStartHz: audioRanges.bassStartHz,
    bassEndHz: audioRanges.bassEndHz,
    midStartHz: audioRanges.midStartHz,
    midEndHz: audioRanges.midEndHz,
    highStartHz: audioRanges.highStartHz,
    highEndHz: audioRanges.highEndHz,
    starfield: clamp(merged.starfield, 0, 1),
    starHue: clamp(merged.starHue, 0, 1),
    starSaturation: clamp(merged.starSaturation, 0, 1),
    starBrightness: clamp(merged.starBrightness, 0, 4),
    starContrast: clamp(merged.starContrast, 0, 3),
    starburstBrightness: clamp(merged.starburstBrightness, 0, 4),
    starburstScale: clamp(merged.starburstScale, 0.2, 3),
    complimentEnabled: Math.round(clamp(merged.complimentEnabled, 0, 1)),
    complimentRate: clamp(merged.complimentRate, 0.2, 2.5),
    complimentLockSeconds: Math.round(clamp(merged.complimentLockSeconds, 0, 30)),
    complimentCooldownSeconds: Math.round(clamp(merged.complimentCooldownSeconds, 2, 180)),
    complimentSize: clamp(merged.complimentSize, 0.5, 2.2),
    complimentGlow: clamp(merged.complimentGlow, 0, 2.5),
    complimentReactivity: clamp(merged.complimentReactivity, 0, 2.5),
    complimentBrightness: clamp(merged.complimentBrightness, 0, 3),
    complimentFont: COMPLIMENT_FONT_VALUES.has(merged.complimentFont) ? merged.complimentFont : defaults.complimentFont,
    starSpeed: clamp(merged.starSpeed, 0, 3),
    starStreaks: clamp(merged.starStreaks, 0, 2),
    starDensity: clamp(merged.starDensity, 0, 2),
    waveHue: clamp(merged.waveHue, 0, 1),
    waveSaturation: clamp(merged.waveSaturation, 0, 1),
    waveBrightness: clamp(merged.waveBrightness, 0, 3),
    waveContrast: clamp(merged.waveContrast, 0, 3),
    waveSharpness: clamp(merged.waveSharpness, 0, 1),
    waveScale: clamp(merged.waveScale, 0.4, 1.8),
    waveReactivity: clamp(merged.waveReactivity, 0, 2.5),
    glowStrength: clamp(merged.glowStrength, 0, 1),
    quality
  };
}

export function mapHeadYToFaceRadius(headY, response = 0.55) {
  const y = clamp(headY, 0, 1);
  const lift = 1 - y;
  const responseScale = 0.34 + clamp(response, 0, 1) * 0.44;
  return clamp(0.18 + Math.pow(lift, 1.08) * responseScale, 0.18, 0.78);
}

function isLandmark(point) {
  return point && Number.isFinite(point.x) && Number.isFinite(point.y);
}

function averageLandmarks(landmarks, indices) {
  let totalX = 0;
  let totalY = 0;
  let count = 0;
  for (const index of indices) {
    const point = landmarks[index];
    if (!isLandmark(point)) continue;
    totalX += point.x;
    totalY += point.y;
    count++;
  }
  return count ? { x: totalX / count, y: totalY / count } : null;
}

export function deriveFaceAnchor(landmarks) {
  if (!landmarks || !landmarks.length) return null;
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  let count = 0;

  for (const point of landmarks) {
    if (!isLandmark(point)) continue;
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
    count++;
  }

  if (!count) return null;
  const width = maxX - minX;
  const height = maxY - minY;
  if (width <= 0 || height <= 0) return null;

  const eyeCenter = averageLandmarks(landmarks, [33, 133, 263, 362]);
  const noseCenter = averageLandmarks(landmarks, [1, 4, 168]);
  const mouthCenter = averageLandmarks(landmarks, [13, 14, 61, 291]);
  let x = (minX + maxX) * 0.5;
  let y = (minY + maxY) * 0.5;

  if (eyeCenter && noseCenter && mouthCenter) {
    x = eyeCenter.x * 0.35 + noseCenter.x * 0.4 + mouthCenter.x * 0.25;
    y = eyeCenter.y * 0.25 + noseCenter.y * 0.35 + mouthCenter.y * 0.4;
  }

  return {
    x: clamp(x, minX, maxX),
    y: clamp(y, minY, maxY),
    size: clamp(Math.max(width, height), 0.04, 0.9),
    width: clamp(width, 0.02, 1),
    height: clamp(height, 0.02, 1),
    confidence: 1
  };
}

export function calculateFaceCrop(face, videoWidth, videoHeight) {
  const videoW = Math.max(1, Number(videoWidth) || 1);
  const videoH = Math.max(1, Number(videoHeight) || 1);
  const width = clamp(face?.width ?? face?.size ?? 0.2, 0.02, 1);
  const height = clamp(face?.height ?? face?.size ?? 0.2, 0.02, 1);
  const centerX = clamp(face?.x ?? 0.5, 0, 1) * videoW;
  const centerY = clamp(face?.y ?? 0.5, 0, 1) * videoH;
  const cropSize = Math.min(
    Math.max(videoW, videoH),
    Math.max(48, width * videoW * 1.55, height * videoH * 1.38)
  );

  return {
    cropSize,
    sourceX: clamp(centerX - cropSize * 0.5, 0, Math.max(0, videoW - cropSize)),
    sourceY: clamp(centerY - cropSize * 0.5, 0, Math.max(0, videoH - cropSize))
  };
}

export function smoothFaceState(previous, detected, alpha = 0.28) {
  const mix = clamp(alpha, 0.01, 1);
  if (!detected) {
    if (!previous) return { x: 0.5, y: 0.5, size: 0.2, width: 0.16, height: 0.22, confidence: 0, hasFace: false };
    return {
      x: previous.x,
      y: previous.y,
      size: previous.size,
      width: previous.width ?? previous.size,
      height: previous.height ?? previous.size,
      confidence: clamp(previous.confidence * (1 - mix), 0, 1),
      hasFace: false
    };
  }

  const next = {
    x: clamp(detected.x, 0, 1),
    y: clamp(detected.y, 0, 1),
    size: clamp(detected.size, 0.02, 1),
    width: clamp(detected.width ?? detected.size, 0.02, 1),
    height: clamp(detected.height ?? detected.size, 0.02, 1),
    confidence: clamp(detected.confidence ?? 1, 0, 1),
    hasFace: true
  };

  if (!previous) return next;
  return {
    x: previous.x + (next.x - previous.x) * mix,
    y: previous.y + (next.y - previous.y) * mix,
    size: previous.size + (next.size - previous.size) * mix,
    width: (previous.width ?? previous.size) + (next.width - (previous.width ?? previous.size)) * mix,
    height: (previous.height ?? previous.size) + (next.height - (previous.height ?? previous.size)) * mix,
    confidence: previous.confidence + (next.confidence - previous.confidence) * mix,
    hasFace: true
  };
}

export function sampleFrequencyBand(data, sampleRate, fromHz, toHz) {
  if (!data || !data.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
  const nyquist = sampleRate * 0.5;
  const binHz = nyquist / data.length;
  const start = Math.floor(clamp(fromHz, 0, nyquist) / binHz);
  const end = Math.floor(clamp(toHz, 0, nyquist) / binHz) + 1;
  const safeStart = Math.min(data.length - 1, Math.max(0, start));
  const safeEnd = Math.min(data.length, Math.max(safeStart + 1, end));
  let total = 0;
  for (let i = safeStart; i < safeEnd; i++) total += data[i];
  return clamp(total / (safeEnd - safeStart) / 255, 0, 1);
}

export function sampleFrequencyBandPeak(data, sampleRate, fromHz, toHz) {
  if (!data || !data.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
  const nyquist = sampleRate * 0.5;
  const binHz = nyquist / data.length;
  const start = Math.floor(clamp(fromHz, 0, nyquist) / binHz);
  const end = Math.floor(clamp(toHz, 0, nyquist) / binHz) + 1;
  const safeStart = Math.min(data.length - 1, Math.max(0, start));
  const safeEnd = Math.min(data.length, Math.max(safeStart + 1, end));
  let peak = 0;
  for (let i = safeStart; i < safeEnd; i++) peak = Math.max(peak, data[i]);
  return clamp(peak / 255, 0, 1);
}

export function sampleBassImpact(data, sampleRate, bassRange = 0.58) {
  if (!data || !data.length || !Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
  const range = clamp(bassRange, 0, 1);
  const bodyTop = 1800 + range * 2400;
  const bodyPeak = sampleFrequencyBandPeak(data, sampleRate, 120, bodyTop) * 0.58;
  const bodyAverage = sampleFrequencyBand(data, sampleRate, 80, bodyTop) * 1.35;
  return clamp(Math.max(bodyPeak, bodyAverage), 0, 1);
}

export function sampleAudioBands(data, sampleRate, controls = {}) {
  const ranges = normalizeAudioBandRanges(controls, sampleRate);
  const readBand = (fromHz, toHz) => {
    const average = sampleFrequencyBand(data, sampleRate, fromHz, toHz);
    const peak = sampleFrequencyBandPeak(data, sampleRate, fromHz, toHz);
    return {
      average,
      peak,
      level: clamp(Math.max(average * 1.25, peak * 0.86), 0, 1)
    };
  };
  const bass = readBand(ranges.bassStartHz, ranges.bassEndHz);
  const mid = readBand(ranges.midStartHz, ranges.midEndHz);
  const high = readBand(ranges.highStartHz, ranges.highEndHz);

  return {
    bass: bass.level,
    mid: mid.level,
    high: high.level,
    peaks: { bass: bass.peak, mid: mid.peak, high: high.peak },
    averages: { bass: bass.average, mid: mid.average, high: high.average },
    ranges
  };
}

export function computeVisualAudioBands(rawBands = {}, smoothedBands = {}, controls = {}) {
  const normalized = normalizeControls(controls);
  const bassRawDrive = Math.pow(clamp((rawBands.bass ?? 0) * normalized.audioSensitivity * normalized.bassSensitivity, 0, 1.35), 0.72);
  const bassSignal = Math.max(smoothedBands.bass ?? 0, bassRawDrive);
  return {
    bass: clamp(Math.max(bassSignal * normalized.bassIntensity, bassRawDrive * 0.72), 0, 1.8),
    mid: clamp((smoothedBands.mid ?? 0) * normalized.midIntensity, 0, 1.8),
    high: clamp((smoothedBands.high ?? 0) * normalized.highIntensity, 0, 1.8)
  };
}

function parseCsvFirstCell(line) {
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      break;
    } else {
      value += char;
    }
  }
  return value.trim();
}

export function parseComplimentsCsv(csv) {
  if (typeof csv !== "string") return [];
  const rows = csv
    .split(/\r?\n/)
    .map(parseCsvFirstCell)
    .map(row => row.replace(/^\uFEFF/, "").trim())
    .filter(Boolean);

  if (rows[0] && /^compliment$/i.test(rows[0])) rows.shift();
  return [...new Set(rows)];
}

export function pickCompliment(compliments, recent = [], random = Math.random) {
  const pool = Array.isArray(compliments) ? compliments.filter(Boolean) : [];
  if (!pool.length) return "";
  const recentSet = new Set(Array.isArray(recent) ? recent : []);
  const available = pool.filter(item => !recentSet.has(item));
  const source = available.length ? available : pool;
  const index = Math.min(source.length - 1, Math.floor(clamp(random(), 0, 0.999999) * source.length));
  return source[index];
}

export function advanceComplimentAutoTrigger({
  enabled = 0,
  hasLayer = false,
  face = null,
  faceLockedSince = 0,
  lastAt = 0,
  now = 0,
  lockSeconds = 3,
  cooldownSeconds = 15,
  confidenceThreshold = 0.28
} = {}) {
  const confidence = clamp(face?.confidence ?? 0, 0, 1);
  const faceReady = confidence >= confidenceThreshold;
  if (!enabled || !hasLayer || !faceReady) {
    return { shouldTrigger: false, faceLockedSince: 0 };
  }

  const startedAt = faceLockedSince || now;
  const faceLockMs = clamp(lockSeconds, 0, 30) * 1000;
  const cooldownMs = clamp(cooldownSeconds, 2, 180) * 1000;

  return {
    shouldTrigger: now - startedAt >= faceLockMs && (!lastAt || now - lastAt >= cooldownMs),
    faceLockedSince: startedAt
  };
}

export function encodePresetBlob(presets) {
  return JSON.stringify(presets && typeof presets === "object" && !Array.isArray(presets) ? presets : {});
}

export function decodePresetBlob(blob) {
  try {
    const parsed = JSON.parse(blob);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}
