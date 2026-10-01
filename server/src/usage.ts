// Daily usage tallies for the owner's usage page. Pure functions; the Worker stores the
// result in KV under `u:<YYYY-MM-DD>`.

/** US dollars per million tokens (input, output). Estimates only; the Anthropic console is the bill. */
export const PRICES: Record<string, { input: number; output: number }> = {
  "claude-opus-5-5": { input: 4, output: 20 },
  "claude-opus-5": { input: 5, output: 25 },
  "claude-opus-4-8": { input: 5, output: 25 },
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export interface ModelTally {
  requests: number;
  input: number;
  output: number;
}

export interface DayUsage {
  requests: number;
  /** Phones that used AI that day (counted at each phone's first request; no IDs kept). */
  phones: number;
  /** Requests signed by an App Attest key (a genuine copy of the app). */
  verified?: number;
  models: Record<string, ModelTally>;
}

export const emptyDay = (): DayUsage => ({ requests: 0, phones: 0, models: {} });

/**
 * Adds one answered request. `model` is the model that actually answered (a fallback may differ);
 * `firstToday` is true for a phone's first request of the day.
 */
export function addRequest(day: DayUsage, model: string, input: number, output: number, firstToday = false,
                           verified = false): DayUsage {
  const current = day.models[model] ?? { requests: 0, input: 0, output: 0 };
  return {
    requests: day.requests + 1,
    phones: (day.phones ?? 0) + (firstToday ? 1 : 0),
    verified: (day.verified ?? 0) + (verified ? 1 : 0),
    models: {
      ...day.models,
      [model]: { requests: current.requests + 1, input: current.input + input, output: current.output + output },
    },
  };
}

/** Estimated dollars; models without a known price count at the most expensive listed rate. */
export function costOf(day: DayUsage): number {
  const fallback = { input: 5, output: 25 };
  let total = 0;
  for (const [model, tally] of Object.entries(day.models)) {
    const price = PRICES[model] ?? fallback;
    total += (tally.input * price.input + tally.output * price.output) / 1_000_000;
  }
  return total;
}

export function parseDay(raw: string | null): DayUsage {
  if (!raw) return emptyDay();
  try {
    const value = JSON.parse(raw) as DayUsage;
    return typeof value.requests === "number" && value.models ? value : emptyDay();
  } catch {
    return emptyDay();
  }
}

/** The last `count` UTC days, newest first. */
export function lastDays(now: Date, count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    return day.toISOString().slice(0, 10);
  });
}
