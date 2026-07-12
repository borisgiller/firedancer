import {
  clamp,
  createDefaultControls,
  normalizeControls,
  deriveFaceAnchor,
  calculateFaceCrop,
  mapHeadYToFaceRadius,
  smoothFaceState,
  sampleAudioBands,
  computeVisualAudioBands,
  parseComplimentsCsv,
  pickCompliment,
  advanceComplimentAutoTrigger,
  encodePresetBlob,
  decodePresetBlob
} from "./core.js";

const PRESET_STORAGE_KEY = "galacticaKaleidoscopePresets";
const ACTIVE_PRESET_STORAGE_KEY = "galacticaKaleidoscopeActivePreset";
const BUNDLE_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/vision_bundle.mjs";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_MODEL_URL = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const COMPLIMENT_FONT_CLASSES = new Set(["orbitron", "audiowide", "monoton"]);
const ASSET_VERSION = "20260627-compliments-final-v5";
const BUILTIN_PRESETS = {
  good: createDefaultControls()
};
const FALLBACK_COMPLIMENTS = [
  "culo cósmico",
  "Qué porte tan cabrón",
  "Hasta Saturno volteó a verte",
  "Te ves como el final feliz de la noche",
  "Tu sombra también se ve buena",
  "Qué sabrosura de persona",
  "El cosmos celebra ese culo",
  "Qué perra elegancia espacial",
  "Qué guapura tan descarada",
  "Qué delicia tan luminosa",
  "nalgatorio celestial",
  "La noche mejoró xq viniste",
  "Ese look está criminal",
  "Estás más buen@ que el chisme",
  "Nice butt",
  "You're so good looking",
  "Do you have a permit to be this sexy?",
  "Yummm"
];

const elements = {
  canvas: document.getElementById("stage"),
  video: document.getElementById("videoPreview"),
  complimentLayer: document.getElementById("complimentLayer"),
  complimentNowBtn: document.getElementById("complimentNowBtn"),
  statusText: document.getElementById("statusText"),
  errorText: document.getElementById("errorText"),
  startOverlay: document.getElementById("startOverlay"),
  startBtn: document.getElementById("startBtn"),
  fullscreenBtn: document.getElementById("fullscreenBtn"),
  projectionBtn: document.getElementById("projectionBtn"),
  projectionExit: document.getElementById("projectionExit"),
  resetBtn: document.getElementById("resetBtn"),
  presetSelect: document.getElementById("presetSelect"),
  presetName: document.getElementById("presetName"),
  savePresetBtn: document.getElementById("savePresetBtn"),
  loadPresetBtn: document.getElementById("loadPresetBtn"),
  deletePresetBtn: document.getElementById("deletePresetBtn"),
  exportPresetBtn: document.getElementById("exportPresetBtn"),
  importPresetBtn: document.getElementById("importPresetBtn")
};

const controlInputs = Array.from(document.querySelectorAll("[data-control]"));
const HZ_CONTROLS = new Set(["bassStartHz", "bassEndHz", "midStartHz", "midEndHz", "highStartHz", "highEndHz"]);
const SECONDS_CONTROLS = new Set(["complimentLockSeconds", "complimentCooldownSeconds"]);
const audioMeters = {
  bass: {
    meter: document.getElementById("bassLevelMeter"),
    readout: document.getElementById("bassLevelReadout")
  },
  mid: {
    meter: document.getElementById("midLevelMeter"),
    readout: document.getElementById("midLevelReadout")
  },
  high: {
    meter: document.getElementById("highLevelMeter"),
    readout: document.getElementById("highLevelReadout")
  }
};
const initialPresets = loadPresets();
const initialPresetName = loadActivePresetName(initialPresets);

const state = {
  controls: normalizeControls(initialPresets[initialPresetName] || BUILTIN_PRESETS.good),
  presets: initialPresets,
  activePresetName: initialPresetName,
  running: false,
  mpVision: null,
  faceLandmarker: null,
  lastVideoTime: -1,
  lastFrameAt: 0,
  lastDetectAt: 0,
  detectEveryMs: 48,
  face: { x: 0.5, y: 0.5, size: 0.2, width: 0.16, height: 0.22, confidence: 0, hasFace: false },
  faceRadius: 0.34,
  faceCanvas: document.createElement("canvas"),
  faceMaskCanvas: document.createElement("canvas"),
  renderer: null,
  audioContext: null,
  analyser: null,
  audioData: null,
  audioBands: { bass: 0, mid: 0, high: 0 },
  audioRawBands: { bass: 0, mid: 0, high: 0 },
  audioVisualBands: { bass: 0, mid: 0, high: 0 },
  audioIdlePhase: 0,
  compliments: {
    items: FALLBACK_COMPLIMENTS,
    recent: [],
    lastAt: 0,
    lastHitAt: 0,
    faceLockedSince: 0
  }
};

state.faceCanvas.width = 256;
state.faceCanvas.height = 256;
state.faceCtx = state.faceCanvas.getContext("2d", { alpha: true });
state.faceMaskCanvas.width = 256;
state.faceMaskCanvas.height = 256;
state.faceMaskCtx = state.faceMaskCanvas.getContext("2d", { alpha: true });

function setStatus(message) {
  if (elements.statusText) elements.statusText.textContent = message;
}

function setError(message) {
  if (elements.errorText) elements.errorText.textContent = message;
}

async function setupCamera() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("Camera API is not available in this browser.");
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: "user",
      width: { ideal: 960 },
      height: { ideal: 540 },
      frameRate: { ideal: 30, max: 30 }
    },
    audio: false
  });

  elements.video.srcObject = stream;
  await elements.video.play();
  return stream;
}

async function setupMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: false,
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) throw new Error("Web Audio is not available in this browser.");
    state.audioContext = new AudioCtx();
    if (state.audioContext.state === "suspended") await state.audioContext.resume();
    const source = state.audioContext.createMediaStreamSource(stream);
    const gain = state.audioContext.createGain();
    gain.gain.value = 1.8;
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 1024;
    state.analyser.smoothingTimeConstant = 0.68;
    state.audioData = new Uint8Array(state.analyser.frequencyBinCount);
    source.connect(gain);
    gain.connect(state.analyser);
    return true;
  } catch (error) {
    console.warn("Microphone unavailable; using idle rings.", error);
    state.analyser = null;
    state.audioData = null;
    setStatus("Camera live. Microphone unavailable, idle rings active.");
    return false;
  }
}

async function createFaceLandmarker() {
  if (!state.mpVision) state.mpVision = await import(BUNDLE_URL);
  const { FilesetResolver, FaceLandmarker } = state.mpVision;
  const vision = await FilesetResolver.forVisionTasks(WASM_URL);
  return FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: FACE_MODEL_URL },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false
  });
}

function updateFaceTracking(now) {
  if (!state.faceLandmarker || elements.video.readyState < 2) {
    state.face = smoothFaceState(state.face, null, 0.08);
    return;
  }

  if (now - state.lastDetectAt < state.detectEveryMs || elements.video.currentTime === state.lastVideoTime) return;
  state.lastDetectAt = now;
  state.lastVideoTime = elements.video.currentTime;

  let detected = null;
  try {
    const result = state.faceLandmarker.detectForVideo(elements.video, now);
    detected = deriveFaceAnchor(result?.faceLandmarks?.[0]);
  } catch (error) {
    console.warn("Face tracking failed for this frame.", error);
  }

  state.face = smoothFaceState(state.face, detected, detected ? 0.42 : 0.08);
  state.faceRadius = mapHeadYToFaceRadius(state.face.y, state.controls.faceRadiusResponse);
}

function updateAudioBands(dt) {
  const sensitivity = state.controls.audioSensitivity;
  if (!state.analyser || !state.audioData || !state.audioContext) {
    state.audioIdlePhase += dt * 0.8;
    state.audioBands.bass = 0.06 + Math.sin(state.audioIdlePhase) * 0.025;
    state.audioBands.mid = 0.045 + Math.sin(state.audioIdlePhase * 1.7 + 1.2) * 0.018;
    state.audioBands.high = 0.035 + Math.sin(state.audioIdlePhase * 2.9 + 0.4) * 0.014;
    state.audioRawBands.bass = clamp(state.audioBands.bass, 0, 1);
    state.audioRawBands.mid = clamp(state.audioBands.mid, 0, 1);
    state.audioRawBands.high = clamp(state.audioBands.high, 0, 1);
    return;
  }

  state.analyser.getByteFrequencyData(state.audioData);
  const sampleRate = state.audioContext.sampleRate;
  const bands = sampleAudioBands(state.audioData, sampleRate, state.controls);
  state.audioRawBands.bass = bands.bass;
  state.audioRawBands.mid = bands.mid;
  state.audioRawBands.high = bands.high;
  state.audioBands.bass = state.audioBands.bass * 0.55 + Math.pow(clamp(bands.bass * sensitivity * state.controls.bassSensitivity * 4.8, 0, 1.35), 0.72) * 0.45;
  state.audioBands.mid = state.audioBands.mid * 0.78 + Math.pow(clamp(bands.mid * sensitivity * state.controls.midSensitivity * 2.4, 0, 1.25), 1.02) * 0.22;
  state.audioBands.high = state.audioBands.high * 0.74 + Math.pow(clamp(bands.high * sensitivity * state.controls.highSensitivity * 2.6, 0, 1.25), 1.02) * 0.26;
}

function updateAudioMeters() {
  for (const band of ["bass", "mid", "high"]) {
    const level = clamp(state.audioRawBands[band] ?? 0, 0, 1);
    const visual = clamp(state.audioVisualBands[band] ?? 0, 0, 1);
    const meter = audioMeters[band]?.meter;
    if (meter) {
      meter.value = level;
      meter.style.setProperty("--level", level.toFixed(3));
    }
    if (audioMeters[band]?.readout) {
      audioMeters[band].readout.textContent = `${Math.round(level * 100)}/${Math.round(visual * 100)}%`;
    }
  }
}

async function loadCompliments() {
  try {
    const response = await fetch(`./compliments.csv?v=${ASSET_VERSION}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Compliments CSV returned ${response.status}`);
    const loaded = parseComplimentsCsv(await response.text());
    if (loaded.length) state.compliments.items = loaded;
  } catch (error) {
    console.warn("Compliments CSV unavailable; using built-in compliments.", error);
  }
}

function spawnCompliment(text, audioEnergy) {
  if (!elements.complimentLayer || !text) return;

  const burst = document.createElement("div");
  const power = clamp(0.32 + audioEnergy * state.controls.complimentReactivity, 0.28, 1.6);
  const driftX = (Math.random() - 0.5) * 90 * (0.5 + power);
  const driftY = -(32 + Math.random() * 62) * (0.45 + power * 0.35);
  const spin = (Math.random() - 0.5) * 10;

  burst.className = "complimentBurst";
  const fontClass = COMPLIMENT_FONT_CLASSES.has(state.controls.complimentFont) ? state.controls.complimentFont : "orbitron";
  const brightness = clamp(state.controls.complimentBrightness, 0, 3);
  burst.classList.add(`font-${fontClass}`);
  burst.textContent = text;
  burst.dataset.text = text;
  burst.style.setProperty("--compliment-size", state.controls.complimentSize);
  burst.style.setProperty("--compliment-glow", state.controls.complimentGlow);
  burst.style.setProperty("--compliment-brightness", brightness);
  burst.style.setProperty("--compliment-brightness-flash", (brightness * 2.2).toFixed(2));
  burst.style.setProperty("--compliment-brightness-settle", (brightness * 1.35).toFixed(2));
  burst.style.setProperty("--burst-power", power);
  burst.style.setProperty("--drift-x", `${driftX.toFixed(1)}px`);
  burst.style.setProperty("--drift-y", `${driftY.toFixed(1)}px`);
  burst.style.setProperty("--spin", `${spin.toFixed(2)}deg`);
  elements.complimentLayer.appendChild(burst);

  window.setTimeout(() => burst.remove(), 6600);
}

function updateCompliments(now) {
  const controls = state.controls;
  const autoTrigger = advanceComplimentAutoTrigger({
    enabled: controls.complimentEnabled,
    hasLayer: Boolean(elements.complimentLayer),
    face: state.face,
    faceLockedSince: state.compliments.faceLockedSince,
    lastAt: state.compliments.lastAt,
    now,
    lockSeconds: controls.complimentLockSeconds,
    cooldownSeconds: controls.complimentCooldownSeconds
  });
  state.compliments.faceLockedSince = autoTrigger.faceLockedSince;
  if (!autoTrigger.shouldTrigger) {
    return;
  }

  const audioEnergy = clamp(state.audioBands.bass * 0.78 + state.audioBands.mid * 0.44 + state.audioBands.high * 0.28, 0, 1.8);
  const compliment = pickCompliment(state.compliments.items, state.compliments.recent);
  if (!compliment) return;

  spawnCompliment(compliment, audioEnergy);
  state.compliments.recent = [compliment, ...state.compliments.recent.filter(item => item !== compliment)].slice(0, 8);
  state.compliments.lastAt = now;
}

function triggerManualCompliment() {
  const audioEnergy = clamp(state.audioBands.bass * 0.78 + state.audioBands.mid * 0.44 + state.audioBands.high * 0.28, 0.35, 1.8);
  const compliment = pickCompliment(state.compliments.items, state.compliments.recent);
  if (!compliment) return;
  spawnCompliment(compliment, audioEnergy);
  state.compliments.recent = [compliment, ...state.compliments.recent.filter(item => item !== compliment)].slice(0, 8);
  state.compliments.lastAt = performance.now();
}

function createFaceTexture() {
  const ctx = state.faceCtx;
  const maskCtx = state.faceMaskCtx;
  const size = state.faceCanvas.width;
  ctx.clearRect(0, 0, size, size);
  maskCtx.clearRect(0, 0, size, size);

  if (elements.video.readyState < 2 || state.face.confidence <= 0.02) return state.faceCanvas;

  const videoW = elements.video.videoWidth || 1;
  const videoH = elements.video.videoHeight || 1;
  const { cropSize, sourceX, sourceY } = calculateFaceCrop(state.face, videoW, videoH);

  ctx.save();
  ctx.translate(size, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(elements.video, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);
  ctx.restore();

  const edge = clamp(state.controls.edgeAbstraction, 0, 1);
  maskCtx.save();
  maskCtx.translate(size * 0.5, size * 0.5);
  maskCtx.scale(0.78, 1.06);
  maskCtx.filter = `blur(${edge * 18}px)`;
  maskCtx.fillStyle = `rgba(255,255,255,${state.face.confidence})`;
  maskCtx.beginPath();
  maskCtx.ellipse(0, 0, size * 0.31, size * 0.41, 0, 0, Math.PI * 2);
  maskCtx.fill();
  maskCtx.restore();

  ctx.globalCompositeOperation = "destination-in";
  ctx.drawImage(state.faceMaskCanvas, 0, 0);

  const halo = ctx.createRadialGradient(size * 0.5, size * 0.5, size * 0.28, size * 0.5, size * 0.5, size * 0.52);
  halo.addColorStop(0, "rgba(255,255,255,0)");
  halo.addColorStop(0.72, `rgba(103,232,255,${0.08 * edge})`);
  halo.addColorStop(1, `rgba(255,91,214,${0.16 * edge})`);
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = "source-over";
  return state.faceCanvas;
}

const VERTEX_SHADER = `#version 300 es
in vec2 a_position;
out vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision highp float;

uniform sampler2D u_video;
uniform sampler2D u_face;
uniform vec2 u_resolution;
uniform vec2 u_faceOffset;
uniform vec3 u_audioBands;
uniform vec3 u_rawAudioBands;
uniform float u_time;
uniform float u_sliceCount;
uniform float u_faceEchoes;
uniform float u_baseRotation;
uniform float u_faceRotation;
uniform float u_faceOpacity;
uniform float u_faceRadius;
uniform float u_faceSize;
uniform float u_faceScale;
uniform float u_faceConfidence;
uniform float u_edgeAbstraction;
uniform float u_colorGrade;
uniform float u_mandalaHue;
uniform float u_mandalaColorSaturation;
uniform float u_mandalaBrightness;
uniform float u_mandalaContrast;
uniform float u_faceHue;
uniform float u_faceSaturation;
uniform float u_faceBrightness;
uniform float u_faceContrast;
uniform float u_starfield;
uniform float u_starHue;
uniform float u_starSaturation;
uniform float u_starBrightness;
uniform float u_starContrast;
uniform float u_starburstBrightness;
uniform float u_starburstScale;
uniform float u_starSpeed;
uniform float u_starStreaks;
uniform float u_starDensity;
uniform float u_waveHue;
uniform float u_waveSaturation;
uniform float u_waveBrightness;
uniform float u_waveContrast;
uniform float u_waveSharpness;
uniform float u_waveScale;
uniform float u_waveReactivity;
uniform float u_glowStrength;

in vec2 v_uv;
out vec4 outColor;

const float PI = 3.14159265359;
const float TAU = 6.28318530718;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

vec2 rotate(vec2 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
}

vec2 kaleidoscope(vec2 p, float slices, float rotation) {
  float r = length(p);
  float a = atan(p.y, p.x) + rotation;
  float sector = TAU / max(1.0, slices);
  a = mod(a, sector);
  a = abs(a - sector * 0.5);
  return vec2(cos(a), sin(a)) * r;
}

vec3 colorDodge(vec3 base, vec3 blend) {
  return min(vec3(1.0), base / max(vec3(0.08), 1.0 - blend));
}

vec3 adjustLayer(vec3 color, float brightness, float contrast) {
  return max(vec3(0.0), ((color - 0.5) * contrast + 0.5) * brightness);
}

vec3 hueWheel(float t) {
  vec3 rgb = clamp(abs(fract(t + vec3(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
  return rgb * rgb * (3.0 - 2.0 * rgb);
}

vec3 applySaturation(vec3 color, float saturation) {
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(gray), color, saturation);
}

float ring(float radius, float target, float width) {
  return 1.0 - smoothstep(0.0, width, abs(radius - target));
}

vec3 hyperdriveStars(vec2 p, float amount, float speed, float streaks, float density) {
  vec3 stars = vec3(0.0);
  float maxRadius = 1.35;
  for (int i = 0; i < 7; i++) {
    float layer = float(i);
    vec2 grid = floor(p * mix(16.0, 42.0, clamp(density, 0.0, 2.0) * 0.5) + layer * 17.0);
    float h = hash(grid + layer * 31.7);
    float ray = fract(h + u_time * (0.08 + speed * 0.18));
    float angle = h * TAU * 7.0 + ray * 0.7 + layer * 0.41;
    vec2 dir = vec2(cos(angle), sin(angle));
    vec2 starPos = dir * ray * maxRadius;
    float sparkleSize = mix(0.004, 0.014, clamp(streaks, 0.0, 2.0) * 0.5) * (0.8 + ray * 1.3);
    float dotStar = 1.0 - smoothstep(0.0, sparkleSize, length(p - starPos));
    float fade = smoothstep(0.0, 0.2, ray) * (1.0 - smoothstep(0.9, 1.0, ray));
    float seed = smoothstep(1.0 - 0.05 * max(0.05, density), 1.0, h);
    vec3 tint = mix(vec3(0.65, 0.9, 1.0), hueWheel(h + ray * 0.12 + u_starHue), 0.42);
    stars += tint * seed * dotStar * fade * (0.5 + ray * 1.8);
  }
  return applySaturation(stars, u_starSaturation) * amount * 0.95;
}

vec3 centerStarburst(vec2 p, vec3 bands) {
  float audio = clamp(bands.x * 0.85 + bands.y * 0.42 + bands.z * 0.32, 0.0, 1.8);
  float audioPop = smoothstep(0.08, 1.0, audio);
  float explosion = audioPop * 1.4;
  float scale = max(0.08, u_starburstScale);
  vec2 burstP = p / scale;
  float radius = length(burstP);
  float angle = atan(burstP.y, burstP.x);
  float raysA = pow(max(0.0, cos(angle * 18.0)), 18.0);
  float raysB = pow(max(0.0, cos(angle * 31.0)), 24.0);
  float core = exp(-radius * radius * mix(92.0, 28.0, clamp(explosion, 0.0, 1.0)));
  float halo = smoothstep(0.28 + audioPop * 0.42, 0.0, radius) * 0.22 * audioPop;
  float spikeReach = smoothstep(0.48 + audioPop * 0.78, 0.0, radius);
  float spikes = (raysA * 0.72 + raysB * 0.36) * spikeReach * audioPop * 2.3;
  float intensity = (core * audioPop * 3.4 + halo + spikes) * u_starburstBrightness;
  return vec3(clamp(intensity, 0.0, 1.0));
}

vec4 faceEchoLayer(vec2 p) {
  vec4 result = vec4(0.0);
  float echoes = clamp(u_faceEchoes, 1.0, 16.0);
  float faceScale = mix(0.2, 0.34, clamp(u_faceSize * 2.4, 0.0, 1.0)) * u_faceScale;
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    if (fi >= echoes) continue;
    float a = fi / echoes * TAU + u_faceRotation + u_faceOffset.x * 0.9;
    vec2 center = vec2(cos(a), sin(a)) * u_faceRadius;
    vec2 local = rotate(p - center, -a + PI * 0.5);
    vec2 faceUv = local / faceScale + 0.5;
    vec2 safeUv = clamp(faceUv, 0.0, 1.0);
    float inside = step(0.0, faceUv.x) * step(0.0, faceUv.y) * step(faceUv.x, 1.0) * step(faceUv.y, 1.0);
    vec4 face = texture(u_face, safeUv) * inside;
    float edge = smoothstep(0.34, 0.72, length(faceUv - 0.5));
    vec3 faceTint = hueWheel(fi / echoes + u_faceHue);
    vec3 edgeSignal = mix(vec3(0.16, 0.72, 1.0), vec3(1.0, 0.18, 0.78), hash(faceUv * 19.0 + fi));
    face.rgb = mix(face.rgb, face.rgb * faceTint * 1.65, u_faceSaturation);
    face.rgb = mix(face.rgb, face.rgb + edgeSignal * edge * u_edgeAbstraction, edge * 0.35);
    face.rgb = adjustLayer(face.rgb, u_faceBrightness, u_faceContrast);
    face.a *= u_faceOpacity * u_faceConfidence;
    result.rgb = mix(result.rgb, face.rgb, face.a * (1.0 - result.a));
    result.a = max(result.a, face.a);
  }
  return result;
}

void main() {
  vec2 uv = v_uv;
  vec2 p = (uv - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  float radius = length(p);
  float angle = atan(p.y, p.x);

  vec2 k = kaleidoscope(p, u_sliceCount, 0.0);
  vec2 sampleK = rotate(k, u_baseRotation);
  vec2 videoUv = vec2(0.5 - sampleK.x * 0.78, 0.5 + sampleK.y * 0.78);
  videoUv += vec2(sin(radius * 11.0 - u_time * 0.42), cos(angle * 3.0 + u_time * 0.22)) * 0.012 * u_colorGrade;
  vec3 video = texture(u_video, clamp(videoUv, 0.001, 0.999)).rgb;
  float luma = dot(video, vec3(0.299, 0.587, 0.114));

  vec3 deep = vec3(0.012, 0.018, 0.052);
  vec3 violet = vec3(0.19, 0.06, 0.38);
  vec3 cyan = vec3(0.05, 0.68, 0.92);
  vec3 magenta = vec3(0.94, 0.16, 0.72);
  vec3 amber = vec3(1.0, 0.67, 0.23);
  float outputAngle = angle + u_baseRotation;
  float sliceHue = floor(mod(outputAngle + TAU, TAU) / TAU * u_sliceCount) / max(1.0, u_sliceCount);
  vec3 grayVideo = vec3(luma);
  vec3 sliceTint = hueWheel(sliceHue + u_mandalaHue);
  vec3 colorizedVideo = mix(grayVideo, grayVideo * sliceTint * 1.75, u_mandalaColorSaturation);
  vec3 mandala = mix(deep, violet, smoothstep(0.05, 0.9, luma + radius * 0.2));
  mandala += colorizedVideo * (0.28 + u_colorGrade * 0.3);
  mandala += sliceTint * pow(max(0.0, sin(outputAngle * u_sliceCount + u_time * 0.6)), 8.0) * 0.13 * u_colorGrade;
  mandala += mix(cyan, magenta, 0.5 + 0.5 * sin(sliceHue * TAU)) * pow(max(0.0, sin(outputAngle * u_sliceCount * 0.5 - u_time * 0.35)), 6.0) * 0.1 * u_colorGrade;
  mandala = adjustLayer(mandala, u_mandalaBrightness, u_mandalaContrast);

  float bass = u_audioBands.x;
  float mid = u_audioBands.y;
  float high = u_audioBands.z;
  float bassDrive = bass;
  float wave = sin(angle * u_sliceCount + u_time * 1.4) * 0.01;
  float sharp = mix(1.0, 4.5, u_waveSharpness);
  float react = u_waveReactivity;
  float bassTarget = (0.2 + bassDrive * 0.42 * max(0.45, react) + wave * react) * u_waveScale;
  float midTarget = (0.43 + mid * 0.16 * react - wave * react) * u_waveScale;
  float highTarget = (0.62 + high * 0.12 * react + sin(angle * 18.0 + u_time * 2.2) * 0.012 * react) * u_waveScale;
  float bassRing = pow(ring(radius, bassTarget, 0.03 + bassDrive * 0.07 * max(0.45, react)), max(0.8, sharp * 0.65));
  float midRing = pow(ring(radius, midTarget, 0.011 + mid * 0.012 * react), sharp);
  float highRing = pow(ring(radius, highTarget, 0.006 + high * 0.01 * react), sharp);
  vec3 bassColor = applySaturation(hueWheel(u_waveHue), u_waveSaturation);
  vec3 midColor = applySaturation(hueWheel(u_waveHue + 0.3333333), u_waveSaturation);
  vec3 highColor = applySaturation(hueWheel(u_waveHue + 0.6666667), u_waveSaturation);
  vec3 waveLayer = (bassColor * bassRing * bassDrive * 4.2 + midColor * midRing * mid * 1.2 + highColor * highRing * high * 1.1) * mix(0.35, 1.65, clamp(react, 0.0, 1.0));
  vec3 signal = adjustLayer(waveLayer, u_waveBrightness, u_waveContrast);
  float bassImpact = pow(ring(radius, bassTarget, 0.02 + bassDrive * 0.08 * max(0.45, react)), max(0.75, sharp * 0.48));
  vec3 bassImpactLayer = adjustLayer(bassColor * bassImpact * pow(bassDrive, 0.58) * 5.8, u_waveBrightness, u_waveContrast);
  mandala = colorDodge(mandala, signal * 0.45) + signal * 0.52;

  float coreGlow = smoothstep(0.58, 0.0, radius) * (0.08 + bassDrive * 0.18) * u_glowStrength;
  mandala += mix(cyan, magenta, 0.45 + sin(u_time * 0.2) * 0.18) * coreGlow;

  float vignette = smoothstep(1.08, 0.18, radius);
  mandala *= 0.16 + vignette;
  mandala += vec3(0.015, 0.025, 0.05) * (1.0 - vignette);
  mandala = colorDodge(mandala, bassImpactLayer * 0.68);
  mandala += bassImpactLayer * 0.36;

  vec4 face = faceEchoLayer(p);
  mandala = colorDodge(mandala, face.rgb * face.a);
  mandala = mix(mandala, face.rgb + mandala * 0.28, face.a * 0.38);
  vec3 stars = adjustLayer(hyperdriveStars(p, u_starfield, u_starSpeed, u_starStreaks, u_starDensity), u_starBrightness, u_starContrast);
  mandala = colorDodge(mandala, stars);
  mandala += stars * 0.55;
  vec3 burst = centerStarburst(p, u_audioBands);
  mandala = colorDodge(mandala, burst);
  mandala += burst * 0.32;
  outColor = vec4(pow(max(mandala, 0.0), vec3(0.86)), 1.0);
}`;

function createRenderer(canvas) {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    alpha: false,
    preserveDrawingBuffer: true
  });
  if (!gl) throw new Error("WebGL2 is not available in this browser.");

  const program = createProgram(gl, VERTEX_SHADER, FRAGMENT_SHADER);
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const positionLocation = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {};
  for (const name of [
    "u_video",
    "u_face",
    "u_resolution",
    "u_faceOffset",
    "u_audioBands",
    "u_rawAudioBands",
    "u_time",
    "u_sliceCount",
    "u_faceEchoes",
    "u_baseRotation",
    "u_faceRotation",
    "u_faceOpacity",
    "u_faceRadius",
    "u_faceSize",
    "u_faceScale",
      "u_faceConfidence",
      "u_edgeAbstraction",
      "u_colorGrade",
      "u_mandalaHue",
      "u_mandalaColorSaturation",
      "u_mandalaBrightness",
      "u_mandalaContrast",
      "u_faceHue",
      "u_faceSaturation",
      "u_faceBrightness",
      "u_faceContrast",
      "u_starfield",
      "u_starHue",
      "u_starSaturation",
      "u_starBrightness",
      "u_starContrast",
      "u_starburstBrightness",
      "u_starburstScale",
      "u_starSpeed",
      "u_starStreaks",
      "u_starDensity",
      "u_waveHue",
      "u_waveSaturation",
      "u_waveBrightness",
    "u_waveContrast",
    "u_waveSharpness",
    "u_waveScale",
    "u_waveReactivity",
    "u_glowStrength"
  ]) {
    uniforms[name] = gl.getUniformLocation(program, name);
  }

  const videoTexture = createTexture(gl);
  const faceTexture = createTexture(gl);
  const fallback = createFallbackCanvas();
  uploadTexture(gl, videoTexture, fallback);
  uploadTexture(gl, faceTexture, state.faceCanvas);

  let width = 0;
  let height = 0;

  function resize(quality) {
    const maxDpr = { low: 1, medium: 1.15, high: 1.4, ultra: 1.8 }[quality] || 1.4;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const nextW = Math.max(1, Math.round(window.innerWidth * dpr));
    const nextH = Math.max(1, Math.round(window.innerHeight * dpr));
    if (nextW === width && nextH === height) return;
    width = nextW;
    height = nextH;
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    gl.viewport(0, 0, width, height);
  }

  function render(now) {
    const controls = state.controls;
    resize(controls.quality);
    if (elements.video.readyState >= 2 && elements.video.videoWidth) {
      uploadTexture(gl, videoTexture, elements.video);
    }
    uploadTexture(gl, faceTexture, state.faceCanvas);

    gl.useProgram(program);
    gl.bindVertexArray(vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, videoTexture);
    gl.uniform1i(uniforms.u_video, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, faceTexture);
    gl.uniform1i(uniforms.u_face, 1);

    const seconds = now * 0.001;
    const visualBands = computeVisualAudioBands(state.audioRawBands, state.audioBands, controls);
    state.audioVisualBands = visualBands;
    gl.uniform2f(uniforms.u_resolution, width, height);
    gl.uniform2f(uniforms.u_faceOffset, state.face.x - 0.5, state.face.y - 0.5);
    gl.uniform3f(
      uniforms.u_audioBands,
      visualBands.bass,
      visualBands.mid,
      visualBands.high
    );
    gl.uniform3f(
      uniforms.u_rawAudioBands,
      clamp(state.audioRawBands.bass, 0, 1),
      clamp(state.audioRawBands.mid, 0, 1),
      clamp(state.audioRawBands.high, 0, 1)
    );
    const baseSpin = controls.baseRotationSpeed;
    gl.uniform1f(uniforms.u_time, seconds);
    gl.uniform1f(uniforms.u_sliceCount, controls.sliceCount);
    gl.uniform1f(uniforms.u_faceEchoes, controls.sliceCount);
    gl.uniform1f(uniforms.u_baseRotation, seconds * baseSpin);
    gl.uniform1f(uniforms.u_faceRotation, seconds * controls.faceRotationSpeed);
    gl.uniform1f(uniforms.u_faceOpacity, controls.faceOpacity);
    gl.uniform1f(uniforms.u_faceRadius, state.faceRadius);
    gl.uniform1f(uniforms.u_faceSize, state.face.size);
    gl.uniform1f(uniforms.u_faceScale, controls.faceScale);
    gl.uniform1f(uniforms.u_faceConfidence, state.face.confidence);
    gl.uniform1f(uniforms.u_edgeAbstraction, controls.edgeAbstraction);
    gl.uniform1f(uniforms.u_colorGrade, controls.colorGrade);
    gl.uniform1f(uniforms.u_mandalaHue, controls.mandalaHue);
    gl.uniform1f(uniforms.u_mandalaColorSaturation, controls.mandalaColorSaturation);
    gl.uniform1f(uniforms.u_mandalaBrightness, controls.mandalaBrightness);
    gl.uniform1f(uniforms.u_mandalaContrast, controls.mandalaContrast);
    gl.uniform1f(uniforms.u_faceHue, controls.faceHue);
    gl.uniform1f(uniforms.u_faceSaturation, controls.faceSaturation);
    gl.uniform1f(uniforms.u_faceBrightness, controls.faceBrightness);
    gl.uniform1f(uniforms.u_faceContrast, controls.faceContrast);
    gl.uniform1f(uniforms.u_starfield, controls.starfield);
    gl.uniform1f(uniforms.u_starHue, controls.starHue);
    gl.uniform1f(uniforms.u_starSaturation, controls.starSaturation);
    gl.uniform1f(uniforms.u_starBrightness, controls.starBrightness);
    gl.uniform1f(uniforms.u_starContrast, controls.starContrast);
    gl.uniform1f(uniforms.u_starburstBrightness, controls.starburstBrightness);
    gl.uniform1f(uniforms.u_starburstScale, controls.starburstScale);
    gl.uniform1f(uniforms.u_starSpeed, controls.starSpeed);
    gl.uniform1f(uniforms.u_starStreaks, controls.starStreaks);
    gl.uniform1f(uniforms.u_starDensity, controls.starDensity);
    gl.uniform1f(uniforms.u_waveHue, controls.waveHue);
    gl.uniform1f(uniforms.u_waveSaturation, controls.waveSaturation);
    gl.uniform1f(uniforms.u_waveBrightness, controls.waveBrightness);
    gl.uniform1f(uniforms.u_waveContrast, controls.waveContrast);
    gl.uniform1f(uniforms.u_waveSharpness, controls.waveSharpness);
    gl.uniform1f(uniforms.u_waveScale, controls.waveScale);
    gl.uniform1f(uniforms.u_waveReactivity, controls.waveReactivity);
    gl.uniform1f(uniforms.u_glowStrength, controls.glowStrength);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  return { render };
}

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || "Shader compile failed.");
  }
  return shader;
}

function createProgram(gl, vertexSource, fragmentSource) {
  const vertex = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(log || "Program link failed.");
  }
  return program;
}

function createTexture(gl) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function uploadTexture(gl, texture, source) {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
}

function createFallbackCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(256, 256, 16, 256, 256, 256);
  gradient.addColorStop(0, "#e8fbff");
  gradient.addColorStop(0.18, "#36d7ff");
  gradient.addColorStop(0.42, "#7129db");
  gradient.addColorStop(0.7, "#180b46");
  gradient.addColorStop(1, "#02030b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  ctx.save();
  ctx.translate(256, 256);
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    const petal = ctx.createLinearGradient(0, 0, 240, 0);
    petal.addColorStop(0, "rgba(255,255,255,0.18)");
    petal.addColorStop(0.35, i % 2 ? "rgba(103,232,255,0.34)" : "rgba(255,91,214,0.3)");
    petal.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = petal;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.quadraticCurveTo(138, -88, 252, -20);
    ctx.lineTo(252, 20);
    ctx.quadraticCurveTo(138, 88, 0, 12);
    ctx.closePath();
    ctx.fill();
  }
  for (let r = 54; r <= 238; r += 46) {
    ctx.strokeStyle = r % 92 === 0 ? "rgba(255,91,214,0.28)" : "rgba(103,232,255,0.24)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalCompositeOperation = "screen";
  for (let i = 0; i < 240; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * 250;
    const x = 256 + Math.cos(a) * r;
    const y = 256 + Math.sin(a) * r;
    ctx.fillStyle = i % 5 === 0 ? "rgba(255,211,107,0.7)" : "rgba(103,232,255,0.55)";
    ctx.fillRect(x, y, Math.random() * 2.2 + 0.4, Math.random() * 2.2 + 0.4);
  }
  ctx.globalCompositeOperation = "source-over";
  return canvas;
}

function controlToInputValue(key, value) {
  if (key === "quality") return value;
  if (key === "complimentFont") return value;
  if (key === "sliceCount" || key === "faceEchoes") return String(Math.round(value));
  if (key === "complimentEnabled") return String(Math.round(value));
  if (HZ_CONTROLS.has(key)) return String(Math.round(value));
  if (SECONDS_CONTROLS.has(key)) return String(Math.round(value));
  if (key === "baseRotationSpeed" || key === "faceRotationSpeed") return String(Math.round(value * 100));
  if (key === "audioSensitivity" || key === "bassIntensity" || key === "midIntensity" || key === "highIntensity") {
    return String(Math.round(value * 100));
  }
  return String(Math.round(value * 100));
}

function inputValueToControl(key, value) {
  if (key === "quality") return value;
  if (key === "complimentFont") return value;
  const number = Number(value);
  if (key === "sliceCount" || key === "faceEchoes") return number;
  if (key === "complimentEnabled") return number;
  if (HZ_CONTROLS.has(key)) return number;
  if (SECONDS_CONTROLS.has(key)) return number;
  if (key === "baseRotationSpeed" || key === "faceRotationSpeed") return number / 100;
  if (key === "audioSensitivity" || key === "bassIntensity" || key === "midIntensity" || key === "highIntensity") return number / 100;
  return number / 100;
}

function readControlsFromInputs() {
  const next = { ...state.controls };
  for (const input of controlInputs) {
    next[input.dataset.control] = inputValueToControl(input.dataset.control, input.value);
  }
  return normalizeControls(next);
}

function syncControlsToInputs() {
  for (const input of controlInputs) {
    const key = input.dataset.control;
    input.value = controlToInputValue(key, state.controls[key]);
  }
  updateReadouts();
}

function updateReadouts() {
  for (const input of controlInputs) {
    const readout = document.getElementById(`${input.id}Readout`);
    if (!readout) continue;
    if (input.dataset.control === "quality") {
      readout.textContent = state.controls.quality;
    } else if (HZ_CONTROLS.has(input.dataset.control)) {
      readout.textContent = `${input.value}Hz`;
    } else if (SECONDS_CONTROLS.has(input.dataset.control)) {
      readout.textContent = `${input.value}s`;
    } else {
      readout.textContent = input.value;
    }
  }
}

function loadPresets() {
  const stored = decodePresetBlob(localStorage.getItem(PRESET_STORAGE_KEY) || "{}");
  const normalizedStored = Object.fromEntries(
    Object.entries(stored).map(([name, controls]) => [name, normalizeControls(controls)])
  );
  return { ...BUILTIN_PRESETS, ...normalizedStored };
}

function loadActivePresetName(presets) {
  const storedName = localStorage.getItem(ACTIVE_PRESET_STORAGE_KEY);
  if (storedName && presets[storedName]) return storedName;
  return "good";
}

function savePresets() {
  localStorage.setItem(PRESET_STORAGE_KEY, encodePresetBlob(state.presets));
}

function saveActivePresetName(name) {
  state.activePresetName = name;
  localStorage.setItem(ACTIVE_PRESET_STORAGE_KEY, name);
}

function refreshPresetSelect() {
  const names = Object.keys(state.presets).sort((a, b) => a.localeCompare(b));
  elements.presetSelect.innerHTML = '<option value="">Presets</option>';
  for (const name of names) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    elements.presetSelect.appendChild(option);
  }
}

function applyControls(controls) {
  state.controls = normalizeControls(controls);
  syncControlsToInputs();
}

function saveNamedPreset() {
  const name = elements.presetName.value.trim();
  if (!name) {
    setError("Enter a preset name.");
    return;
  }
  setError("");
  state.controls = readControlsFromInputs();
  state.presets[name] = normalizeControls(state.controls);
  savePresets();
  saveActivePresetName(name);
  refreshPresetSelect();
  elements.presetSelect.value = name;
  setStatus(`Saved preset ${name}.`);
}

function loadSelectedPreset() {
  const name = elements.presetSelect.value;
  if (!name || !state.presets[name]) return;
  elements.presetName.value = name;
  applyControls(state.presets[name]);
  saveActivePresetName(name);
  setStatus(`Loaded preset ${name}.`);
}

function deleteSelectedPreset() {
  const name = elements.presetSelect.value;
  if (!name || !state.presets[name]) return;
  delete state.presets[name];
  savePresets();
  if (state.activePresetName === name) saveActivePresetName("good");
  refreshPresetSelect();
  elements.presetName.value = "";
  setStatus(`Deleted preset ${name}.`);
}

function exportPresets() {
  window.prompt("Copy Galactica presets JSON", encodePresetBlob(state.presets));
}

function importPresets() {
  const pasted = window.prompt("Paste Galactica presets JSON");
  if (!pasted) return;
  const imported = Object.fromEntries(
    Object.entries(decodePresetBlob(pasted)).map(([name, controls]) => [name, normalizeControls(controls)])
  );
  state.presets = { ...BUILTIN_PRESETS, ...imported };
  savePresets();
  saveActivePresetName("good");
  refreshPresetSelect();
  elements.presetSelect.value = "good";
  elements.presetName.value = "good";
  setStatus("Imported presets.");
}

function requestProjection() {
  document.documentElement.requestFullscreen?.();
}

function updateProjectionMode() {
  document.body.classList.toggle("projection-mode", Boolean(document.fullscreenElement));
}

function beginLoop() {
  if (state.running) return;
  state.running = true;
  requestAnimationFrame(drawFrame);
}

function initializeRenderer() {
  try {
    state.renderer = createRenderer(elements.canvas);
    beginLoop();
  } catch (error) {
    console.error(error);
    state.renderer = null;
    setStatus("WebGL2 unavailable.");
    setError(error?.message || "WebGL2 renderer failed to start.");
  }
}

async function initializeFaceTracking(micReady) {
  setStatus("Mandala live. Loading face tracker...");
  try {
    state.faceLandmarker = await createFaceLandmarker();
    setStatus(micReady ? "Mandala live with face tracking and audio." : "Mandala live with face tracking and idle rings.");
  } catch (trackerError) {
    console.warn("Face tracker unavailable; continuing without face layer.", trackerError);
    state.faceLandmarker = null;
    setStatus(micReady ? "Mandala live. Face tracker unavailable." : "Mandala live. Face tracker and microphone unavailable.");
  }
}

async function start() {
  elements.startBtn.disabled = true;
  setError("");
  setStatus("Requesting camera...");
  try {
    await setupCamera();
    setStatus("Camera live. Requesting microphone...");
    const micReady = await setupMicrophone();
    elements.startOverlay.classList.add("hidden");
    beginLoop();
    initializeFaceTracking(micReady);
  } catch (error) {
    console.error(error);
    elements.startBtn.disabled = false;
    setStatus("Camera start failed.");
    setError(error?.message || "Unknown camera error.");
  }
}

function drawFrame(now) {
  const dt = state.lastFrameAt ? Math.min(0.08, (now - state.lastFrameAt) / 1000) : 1 / 60;
  state.lastFrameAt = now;
  updateAudioBands(dt);
  updateFaceTracking(now);
  updateCompliments(now);
  createFaceTexture();
  state.renderer?.render(now);
  updateAudioMeters();
  if (state.running) requestAnimationFrame(drawFrame);
}

function bindControls() {
  for (const input of controlInputs) {
    input.addEventListener("input", () => {
      state.controls = readControlsFromInputs();
      syncControlsToInputs();
      if (input.dataset.control === "complimentEnabled" || SECONDS_CONTROLS.has(input.dataset.control)) {
        state.compliments.faceLockedSince = 0;
        if (input.dataset.control === "complimentCooldownSeconds") state.compliments.lastAt = 0;
      }
    });
  }

  elements.resetBtn.addEventListener("click", () => applyControls(createDefaultControls()));
  elements.fullscreenBtn.addEventListener("click", requestProjection);
  elements.projectionBtn.addEventListener("click", requestProjection);
  elements.projectionExit.addEventListener("click", () => document.exitFullscreen?.());
  document.addEventListener("fullscreenchange", updateProjectionMode);

  elements.savePresetBtn.addEventListener("click", saveNamedPreset);
  elements.loadPresetBtn.addEventListener("click", loadSelectedPreset);
  elements.deletePresetBtn.addEventListener("click", deleteSelectedPreset);
  elements.exportPresetBtn.addEventListener("click", exportPresets);
  elements.importPresetBtn.addEventListener("click", importPresets);
  elements.complimentNowBtn.addEventListener("click", triggerManualCompliment);
  elements.presetSelect.addEventListener("change", () => {
    if (elements.presetSelect.value) elements.presetName.value = elements.presetSelect.value;
  });

  elements.startBtn.addEventListener("click", start);
}

syncControlsToInputs();
refreshPresetSelect();
elements.presetSelect.value = state.activePresetName;
elements.presetName.value = state.activePresetName;
bindControls();
initializeRenderer();
loadCompliments();
setStatus("Ready.");
