import fc from 'fast-check';
export interface LawVerificationResult {
    law: string;
    passed: boolean;
    error?: string;
    description: string;
}
export interface LawVerificationSuite {
    allPassed: boolean;
    results: LawVerificationResult[];
    passedCount: number;
    totalCount: number;
}
export interface DomainLaws<Raw, Domain, Command, Event, State, View, Answer> {
    normalize: (raw: Raw) => Domain;
    validate: (command: Command) => boolean;
    decide: (state: State, command: Command) => Event[];
    evolve: (state: State, event: Event) => State;
    project: (view: View, event: Event) => View;
    queries: (view: View) => Answer;
    deriveView: (state: State) => Answer;
    initialState: State;
    initialView: View;
    generateEvents: () => fc.Arbitrary<Event[]>;
    generateCommands: () => fc.Arbitrary<Command>;
    generateRaw: () => fc.Arbitrary<Raw>;
    fold: <S, E>(f: (s: S, e: E) => S, s0: S, events: ReadonlyArray<E>) => S;
}
export declare function verifyAllLaws<Raw, Domain, Command, Event, State, View, Answer>(laws: DomainLaws<Raw, Domain, Command, Event, State, View, Answer>): LawVerificationSuite;
export declare function enforceLaws<Raw, Domain, Command, Event, State, View, Answer>(laws: DomainLaws<Raw, Domain, Command, Event, State, View, Answer>): void;
