export type M<A> = Promise<A>;

// Realize pure f: (x)=>y  as R(f): (x)=>Promise(y)
export const R = <A extends any[], B>(f: (...a: A) => B) =>
  async (...a: A): Promise<B> => f(...a);

// Observability wrapper (O)
export const O = <A extends any[], B>(name: string, f: (...a: A) => Promise<B>) =>
  async (...a: A): Promise<B> => {
    // start span(name); inc counter
    try { return await f(...a); }
    finally { /* end span */ }
  };

// Export for CommonJS compatibility
module.exports = { M: undefined, R, O };
