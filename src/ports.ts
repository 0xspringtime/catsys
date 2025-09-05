// src/ports.ts
import type { Event } from './spec';

// --- Shared tiny shapes (expand as you like) ---
export type Req   = { method: 'GET'|'POST'|'PUT'|'DELETE'; url: string; headers?: Record<string,string>; body?: Uint8Array|string|unknown };
export type Resp  = { status: number; headers: Record<string,string>; body?: Uint8Array|string|unknown };
export type Msg   = { topic: string; data: Uint8Array|string|unknown };
export type Creds = { user: string; pass: string };
export type Token = string;
export type Claims= Record<string, unknown>;
export type Tensor= Float32Array|Float64Array|Int32Array; // placeholder
export type Result= { id: string; score: number };

// --- Big three ---
export interface BlobStore { get(k:string):Promise<Uint8Array>; put(k:string,b:Uint8Array):Promise<void> }
export interface EventBus  {
  publish(e: Event): Promise<void>;
  subscribe(topic: string, h: (e: Event) => Promise<void>): () => void;
}
export interface Sql       { query<A=any>(q:string, p?:unknown[]): Promise<A> }

// --- Second ring ---
export interface KV { get(k:string):Promise<string|null>; set(k:string,v:string,ttl?:number):Promise<void> }
export interface Http { request(r:Req):Promise<Resp> }
export interface Ws { send(m:Msg):Promise<void> }
export interface Auth { issue(c:Creds):Promise<Token>; verify(t:Token):Promise<Claims> }
export interface Clock { now(): Date }
export interface IdGen { newId(): string }
export interface Secrets { get(name:string):Promise<string> }
export interface Search { query(q:string):Promise<Result[]> }
export interface GpuMl { infer(x:Tensor):Promise<Tensor> }

// Bundle for DI convenience
export type Ports = Partial<{
  blob: BlobStore; bus: EventBus; sql: Sql; kv: KV; http: Http; ws: Ws;
  auth: Auth; clock: Clock; id: IdGen; secrets: Secrets; search: Search; gpuml: GpuMl;
}>;
