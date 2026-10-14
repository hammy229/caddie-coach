import { DynamoStore } from "./dynamo.js";
import { MemoryStore, type StateStore } from "./store.js";

/** DynamoDB when DDB_TABLE is set, otherwise an in-memory store for local dev. */
export function createStore(env: NodeJS.ProcessEnv = process.env): StateStore {
  return env.DDB_TABLE ? new DynamoStore(env.DDB_TABLE) : new MemoryStore();
}

export type { StateStore } from "./store.js";
export { MemoryStore } from "./store.js";
