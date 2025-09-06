"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunk = exports.fold = exports.genEvents = exports.genEvent = void 0;
const fast_check_1 = __importDefault(require("fast-check"));
// Simple event generator aligned with URL shortener spec
// Keep it simple to avoid prototype pollution issues
exports.genEvent = fast_check_1.default.constantFrom({ kind: "Created", short: "abc123", long: "https://example.com/test1", id: "evt1", timestamp: "2023-01-01T00:00:00Z" }, { kind: "Created", short: "def456", long: "https://example.com/test2", id: "evt2", timestamp: "2023-01-01T01:00:00Z" }, { kind: "Clicked", short: "abc123", id: "evt3", timestamp: "2023-01-01T02:00:00Z" }, { kind: "Clicked", short: "def456", id: "evt4", timestamp: "2023-01-01T03:00:00Z" }, { kind: "Expired", short: "abc123", id: "evt5", timestamp: "2023-01-01T04:00:00Z" }, { kind: "CustomTaken", custom: "taken", id: "evt6", timestamp: "2023-01-01T05:00:00Z" });
exports.genEvents = fast_check_1.default.array(exports.genEvent, { maxLength: 50 });
// generic folds/helpers used by your tests
const fold = (f, s0, es) => es.reduce(f, s0);
exports.fold = fold;
const chunk = (xs, n) => {
    const out = [];
    for (let i = 0; i < xs.length; i += n)
        out.push(xs.slice(i, i + n));
    return out;
};
exports.chunk = chunk;
