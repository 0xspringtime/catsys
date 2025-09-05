import fc from "fast-check";
import type { Event } from "../src/spec";

// Simple event generator aligned with URL shortener spec
// Keep it simple to avoid prototype pollution issues
export const genEvent: fc.Arbitrary<Event> = fc.constantFrom(
  { kind: "Created", short: "abc123", long: "https://example.com/test1", id: "evt1", timestamp: "2023-01-01T00:00:00Z" } as Event,
  { kind: "Created", short: "def456", long: "https://example.com/test2", id: "evt2", timestamp: "2023-01-01T01:00:00Z" } as Event,
  { kind: "Clicked", short: "abc123", id: "evt3", timestamp: "2023-01-01T02:00:00Z" } as Event,
  { kind: "Clicked", short: "def456", id: "evt4", timestamp: "2023-01-01T03:00:00Z" } as Event,
  { kind: "Expired", short: "abc123", id: "evt5", timestamp: "2023-01-01T04:00:00Z" } as Event,
  { kind: "CustomTaken", custom: "taken", id: "evt6", timestamp: "2023-01-01T05:00:00Z" } as Event
);

export const genEvents = fc.array(genEvent, { maxLength: 50 });

// generic folds/helpers used by your tests
export const fold = <S, E>(f: (s: S, e: E) => S, s0: S, es: ReadonlyArray<E>): S =>
  es.reduce(f, s0);

export const chunk = <T>(xs: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};
