import { LLMRequest } from "../types/llm.types";

export type DirectorRole = "planner" | "executor";

export interface Telemetry {
  lastOutcomeSuccess: boolean;
  timeoutOccurred?: boolean;
  loopSignal?: number;
  hardError?: boolean;
}

export interface ControlState {
  emaSuccess: number;
  emaTimeouts: number;
  emaLoop: number;
  e: number;
  g: number;
  frustration: number;
}

export interface DirectorDirectives {
  allowCrossSite: boolean;
  allowPartialResults: boolean;
  relaxFormatRequirements: boolean;
  encourageAlternateStrategies: boolean;
}

const ALPHA_SUCCESS = 0.3;
const ALPHA_TIMEOUT = 0.35;
const ALPHA_LOOP = 0.25;
const WEIGHT_FAIL = 0.7;
const WEIGHT_TIMEOUT = 0.2;
const WEIGHT_LOOP = 0.1;
const SNAP_SUCCESS_RESET = true;

const DEFAULT_DIRECTIVES: DirectorDirectives = {
  allowCrossSite: false,
  allowPartialResults: false,
  relaxFormatRequirements: false,
  encourageAlternateStrategies: false,
};

export const DEFAULT_CONTROL_STATE: ControlState = {
  emaSuccess: 1,
  emaTimeouts: 0,
  emaLoop: 0,
  e: 0,
  g: 0,
  frustration: 0,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function smoothstep(x: number, edge0: number, edge1: number): number {
  if (edge0 === edge1) {
    return x < edge0 ? 0 : 1;
  }
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function updateControl(
  prev: ControlState,
  telemetry: Telemetry
): ControlState {
  const successValue = telemetry.lastOutcomeSuccess ? 1 : 0;
  const timeoutValue = telemetry.timeoutOccurred ? 1 : 0;
  const loopValue = telemetry.loopSignal ?? 0;

  let emaSuccess =
    ALPHA_SUCCESS * successValue + (1 - ALPHA_SUCCESS) * prev.emaSuccess;
  let emaTimeouts =
    ALPHA_TIMEOUT * timeoutValue + (1 - ALPHA_TIMEOUT) * prev.emaTimeouts;
  let emaLoop = ALPHA_LOOP * loopValue + (1 - ALPHA_LOOP) * prev.emaLoop;

  let failureSignal = 1 - emaSuccess;
  if (telemetry.hardError) {
    failureSignal = clamp(failureSignal + 0.2, 0, 1);
  }

  const frustration =
    WEIGHT_FAIL * failureSignal +
    WEIGHT_TIMEOUT * emaTimeouts +
    WEIGHT_LOOP * emaLoop;

  let e = clamp(0.5 * Math.tanh(2.2 * frustration) + 0.5, 0, 1);
  let g = e > 0.45 ? smoothstep(e, 0.45, 0.9) : 0;

  if (telemetry.lastOutcomeSuccess && SNAP_SUCCESS_RESET) {
    emaTimeouts *= 0.4;
    emaLoop *= 0.4;
    e = Math.min(e, 0.2);
    g = e > 0.55 ? smoothstep(e, 0.55, 0.9) : 0;
  }

  return {
    emaSuccess: clamp(emaSuccess, 0, 1),
    emaTimeouts: clamp(emaTimeouts, 0, 1),
    emaLoop: clamp(emaLoop, 0, 1),
    e,
    g,
    frustration: clamp(frustration, 0, 1.5),
  };
}

export function tuneLLMSettings(
  role: DirectorRole,
  base: LLMRequest,
  control: ControlState
): LLMRequest {
  const tuned: LLMRequest = { ...base };
  const baseTemperature =
    typeof base.temperature === "number"
      ? base.temperature
      : role === "planner"
      ? 0.7
      : 0.35;
  const temperatureCap = role === "planner" ? 1.2 : 0.9;
  const explorationBoost = role === "planner" ? 0.7 : 0.45;
  tuned.temperature = clamp(
    baseTemperature + explorationBoost * control.e,
    0,
    temperatureCap
  );

  if (typeof base.topP === "number") {
    tuned.topP = clamp(base.topP + 0.1 * control.e, 0, 1);
  }

  if (typeof base.topK === "number") {
    tuned.topK = Math.round(
      clamp(base.topK + Math.max(1, base.topK * 0.25 * control.e), 1, 200)
    );
  }

  if (typeof base.maxTokens === "number") {
    const expansion = 1 + 0.35 * control.e;
    tuned.maxTokens = Math.round(base.maxTokens * expansion);
  }

  return tuned;
}

export function getDirectorDirectives(
  g: number = 0
): DirectorDirectives {
  if (g <= 0) {
    return { ...DEFAULT_DIRECTIVES };
  }
  return {
    allowCrossSite: g >= 0.45,
    allowPartialResults: g >= 0.5,
    relaxFormatRequirements: g >= 0.6,
    encourageAlternateStrategies: g >= 0.35,
  };
}
