"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const impl_1 = require("../src/impl");
const spec_1 = require("../src/spec");
test("R functoriality (id & composition)", async () => {
    const id = (x) => x;
    const R_id = (0, impl_1.R)(id);
    expect(await R_id(42)).toBe(42);
    const f = (v, e) => (0, spec_1.project)(v, e);
    const g = (v, e) => (0, spec_1.project)(v, e);
    const e1 = { kind: "Created", short: "test", long: "https://test.com", id: "1", timestamp: "2023-01-01T00:00:00Z" };
    const e2 = { kind: "Clicked", short: "test", id: "2", timestamp: "2023-01-01T01:00:00Z" };
    const left = await (0, impl_1.O)("g", (0, impl_1.R)(g))(await (0, impl_1.O)("f", (0, impl_1.R)(f))(spec_1.v0, e1), e2);
    const comp = (v, e1, e2) => (0, spec_1.project)((0, spec_1.project)(v, e1), e2);
    const right = await (0, impl_1.O)("g∘f", (0, impl_1.R)((v, e1, e2) => comp(v, e1, e2)))(spec_1.v0, e1, e2);
    expect(left).toEqual(right);
});
