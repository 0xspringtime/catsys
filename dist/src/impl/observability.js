"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withMetrics = void 0;
// src/impl/observability.ts
const withMetrics = (name, f) => async (...a) => {
    const t0 = performance.now();
    // increment counter(name+"_calls_total")
    try {
        const r = await f(...a);
        // record histogram(name+"_latency_ms", performance.now()-t0)
        return r;
    }
    catch (err) {
        // increment counter(name+"_errors_total")
        throw err;
    }
};
exports.withMetrics = withMetrics;
