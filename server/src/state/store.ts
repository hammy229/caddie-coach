import { emptyState, type UserState } from "../domain/types.js";

/** Per-user persistence. State survives across Alexa+ sessions and rounds. */
export interface StateStore {
  load(userId: string): Promise<UserState>;
  save(userId: string, state: UserState): Promise<void>;
}

export class MemoryStore implements StateStore {
  private readonly users = new Map<string, UserState>();

  async load(userId: string): Promise<UserState> {
    const existing = this.users.get(userId);
    return existing ? structuredClone(existing) : emptyState();
  }

  async save(userId: string, state: UserState): Promise<void> {
    this.users.set(userId, structuredClone(state));
  }
}
