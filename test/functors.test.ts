import { R, O } from "../src/impl";
import { project, v0, evolve, s0, Event, View, State } from "../src/spec";

test("R functoriality (id & composition)", async () => {
  const id = <T>(x:T)=>x;
  const R_id = R(id);
  expect(await R_id(42)).toBe(42);

  const f = (v: View, e: Event) => project(v, e);
  const g = (v: View, e: Event) => project(v, e);
  const e1: Event = {kind:"Created", short:"test", long:"https://test.com", id:"1", timestamp:"2023-01-01T00:00:00Z"};
  const e2: Event = {kind:"Clicked", short:"test", id:"2", timestamp:"2023-01-01T01:00:00Z"};
  const left  = await O("g", R(g))(await O("f", R(f))(v0, e1), e2);
  const comp  = (v: View, e1: Event, e2: Event) => project(project(v, e1), e2);
  const right = await O("g∘f", R((v: View, e1: Event, e2: Event)=>comp(v,e1,e2)))(v0, e1, e2);
  expect(left).toEqual(right);
});