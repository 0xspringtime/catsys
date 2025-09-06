export type M<A> = Promise<A>;
export declare const R: <A extends any[], B>(f: (...a: A) => B) => (...a: A) => Promise<B>;
export declare const O: <A extends any[], B>(name: string, f: (...a: A) => Promise<B>) => (...a: A) => Promise<B>;
