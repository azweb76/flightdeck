import { USD_PER_MTOK_INPUT, USD_PER_MTOK_OUTPUT } from "./meta.ts";

export function usageUsd(inputTokens: number, outputTokens: number): number {
  return (
    (inputTokens / 1_000_000) * USD_PER_MTOK_INPUT +
    (outputTokens / 1_000_000) * USD_PER_MTOK_OUTPUT
  );
}

export function roundUsd(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}
