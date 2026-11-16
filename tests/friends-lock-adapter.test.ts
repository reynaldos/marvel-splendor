import { PrismaNeon } from "@prisma/adapter-neon";
import { afterEach, describe, expect, it } from "vitest";

// lib/friends.ts takes its pair lock with `select pg_advisory_xact_lock(hashtext($1))`, whose result column is Postgres type
// `void` (OID 2278). This pins how the app's driver adapter handles that reply: executeRaw reads the row count, queryRaw tries
// to map the column type and can't. No network: the pool's query is replaced with what Postgres sends for the statement.
const VOID_REPLY = { fields: [{ name: "pg_advisory_xact_lock", dataTypeID: 2278 }], rows: [[""]], rowCount: 1 };
const LOCK = { sql: "select pg_advisory_xact_lock(hashtext($1))", args: ["cuid123"], argTypes: [{ scalarType: "string" as const, arity: "scalar" as const }] };

type Disposable = { dispose?: () => Promise<void> };
const open: Disposable[] = [];

async function adapterAnsweringVoid() {
  const adapter = await new PrismaNeon({ connectionString: "postgresql://dummy:dummy@127.0.0.1:1/dummy" }).connect();
  (adapter as unknown as { client: { query: () => Promise<typeof VOID_REPLY> } }).client.query = async () => VOID_REPLY;
  open.push(adapter);
  return adapter;
}

afterEach(async () => {
  for (const a of open.splice(0)) await a.dispose?.();
});

describe("the advisory lock on @prisma/adapter-neon", () => {
  it("executeRaw takes the void reply and returns the row count", async () => {
    const adapter = await adapterAnsweringVoid();
    await expect(adapter.executeRaw(LOCK)).resolves.toBe(1);
  });

  it("queryRaw throws on the void column, which is why lib/friends.ts must never use it for the lock", async () => {
    const adapter = await adapterAnsweringVoid();
    await expect(adapter.queryRaw(LOCK)).rejects.toMatchObject({ cause: { kind: "UnsupportedNativeDataType", type: "void" } });
  });
});
