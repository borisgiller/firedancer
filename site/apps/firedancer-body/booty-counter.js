export function createBootyCounterConfig(overrides = {}) {
  return {
    enabled: true,
    goal: 69,
    resetAfterIdleMs: 1000,
    showStatusCopy: false,
    showDebugPanel: true,
    strictness: 1,
    minPoseConfidence: 0.08,
    minShakeDistance: 0.012,
    minMsBetweenPoints: 180,
    maxCycleMs: 900,
    smoothing: 0.35,
    winningImageUrl: "assets/winning-outline.png",
    winningImageUrls: ["surprise.png", "surprise2.png"],
    winningText: "You win! Nice butt",
    winCaptureEnabled: true,
    winCaptureUploadEnabled: true,
    winCaptureUploadEndpoint: "/api/win-captures",
    winCapturePreWinCount: 3,
    ...overrides
  };
}

export function extractPelvisShakeSample(landmarks) {
  const left = landmarks?.[23];
  const right = landmarks?.[24];
  const leftOk = isUsableHip(left);
  const rightOk = isUsableHip(right);
  if (!leftOk && !rightOk) return { y: 0, ok: false, confidence: 0 };
  if (leftOk && rightOk) {
    return {
      y: (left.y + right.y) * 0.5,
      ok: true,
      confidence: Math.max(left.visibility ?? 1, right.visibility ?? 1)
    };
  }
  const hip = leftOk ? left : right;
  return { y: hip.y, ok: true, confidence: hip.visibility ?? 1 };
}

function isUsableHip(point) {
  return Boolean(
    point &&
    Number.isFinite(point.y) &&
    point.y >= -0.2 &&
    point.y <= 1.2 &&
    (point.visibility ?? 1) >= 0.05
  );
}

export class BootyShakeCounter {
  constructor(config = createBootyCounterConfig()) {
    this.config = createBootyCounterConfig(config);
    this.resetAll();
  }

  resetAll() {
    this.points = 0;
    this.phase = "idle";
    this.event = "";
    this.won = false;
    this.smoothedY = null;
    this.anchorY = null;
    this.phaseStartedAt = 0;
    this.lastPointAt = 0;
    this.lastMovementAt = 0;
    this.currentTravel = 0;
  }

  resetScore(now = 0) {
    this.points = 0;
    this.phase = "idle";
    this.event = "reset";
    this.won = false;
    this.anchorY = this.smoothedY;
    this.phaseStartedAt = now;
    this.lastPointAt = 0;
    this.lastMovementAt = now;
    this.currentTravel = 0;
  }

  reset(now = 0) {
    this.resetAll();
    return this.snapshot(now);
  }

  updateConfig(config = {}) {
    this.config = createBootyCounterConfig({ ...this.config, ...config });
    if (this.points > this.config.goal) this.points = this.config.goal;
    return this.snapshot(0);
  }

  update(sample, now) {
    this.event = "";
    if (!this.config.enabled) return this.snapshot(now);

    const confidence = sample?.confidence ?? 1;
    if (!sample?.ok || confidence < this.config.minPoseConfidence) {
      if (this.lastMovementAt && now - this.lastMovementAt > this.config.resetAfterIdleMs && this.points > 0) {
        this.resetScore(now);
      }
      return this.snapshot(now);
    }

    const y = Number(sample.y);
    if (!Number.isFinite(y)) return this.snapshot(now);

    const smooth = this.config.smoothing;
    this.smoothedY = this.smoothedY === null ? y : this.smoothedY * (1 - smooth) + y * smooth;
    if (this.anchorY === null) {
      this.anchorY = this.smoothedY;
      this.phaseStartedAt = now;
      this.lastMovementAt = now;
      return this.snapshot(now);
    }

    const threshold = this.config.minShakeDistance * this.config.strictness;
    const cooldown = this.config.minMsBetweenPoints * Math.max(0.6, this.config.strictness);
    const delta = this.smoothedY - this.anchorY;
    const travel = Math.abs(delta);
    this.currentTravel = travel;

    if (travel >= threshold * 0.35) {
      this.lastMovementAt = now;
    } else if (this.points > 0 && now - this.lastMovementAt > this.config.resetAfterIdleMs) {
      this.resetScore(now);
      return this.snapshot(now);
    }

    if (now - this.phaseStartedAt > this.config.maxCycleMs) {
      this.phase = "idle";
      this.anchorY = this.smoothedY;
      this.phaseStartedAt = now;
      return this.snapshot(now);
    }

    if (this.phase === "idle" && travel >= threshold) {
      this.phase = delta > 0 ? "down" : "up";
      this.anchorY = this.smoothedY;
      this.phaseStartedAt = now;
      return this.snapshot(now);
    }

    if (this.phase !== "idle" && travel >= threshold) {
      const reversed = (this.phase === "down" && delta < 0) || (this.phase === "up" && delta > 0);
      if (reversed && now - this.lastPointAt >= cooldown) {
        this.points += 1;
        this.event = "point";
        this.lastPointAt = now;
        this.lastMovementAt = now;
        this.won = this.points >= this.config.goal;
        this.phase = "idle";
        this.anchorY = this.smoothedY;
        this.phaseStartedAt = now;
      }
    }

    return this.snapshot(now);
  }

  snapshot(now = 0) {
    return {
      points: this.points,
      goal: this.config.goal,
      progress: this.config.goal > 0 ? Math.min(1, this.points / this.config.goal) : 0,
      phase: this.phase,
      event: this.event,
      won: this.won,
      travel: this.currentTravel,
      strictness: this.config.strictness,
      idleRemainingMs: Math.max(0, this.config.resetAfterIdleMs - (this.lastMovementAt ? now - this.lastMovementAt : 0))
    };
  }
}
