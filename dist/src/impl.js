"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.O = exports.R = void 0;
// Realize pure f: (x)=>y  as R(f): (x)=>Promise(y)
const R = (f) => async (...a) => f(...a);
exports.R = R;
// Observability wrapper (O)
const O = (name, f) => async (...a) => {
    // start span(name); inc counter
    try {
        return await f(...a);
    }
    finally { /* end span */ }
};
exports.O = O;
// Export for CommonJS compatibility
module.exports = { M: undefined, R: exports.R, O: exports.O };
