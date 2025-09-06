import fc from "fast-check";
import type { Event } from "../src/spec";
export declare const genEvent: fc.Arbitrary<Event>;
export declare const genEvents: fc.Arbitrary<Event[]>;
export declare const fold: <S, E>(f: (s: S, e: E) => S, s0: S, es: ReadonlyArray<E>) => S;
export declare const chunk: <T>(xs: T[], n: number) => T[][];
