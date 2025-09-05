// src/impl/observability.ts
export const withMetrics =
  <A extends any[], R>(name: string, f: (...a: A) => Promise<R>) =>
  async (...a: A): Promise<R> => {
    const t0 = performance.now();
    // increment counter(name+"_calls_total")
    try {
      const r = await f(...a);
      // record histogram(name+"_latency_ms", performance.now()-t0)
      return r;
    } catch (err) {
      // increment counter(name+"_errors_total")
      throw err;
    }
  };
