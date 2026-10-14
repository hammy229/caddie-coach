import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { emptyState, type UserState } from "../domain/types.js";
import type { StateStore } from "./store.js";

/** DynamoDB-backed store. Table schema: partition key `userId` (String). */
export class DynamoStore implements StateStore {
  private readonly doc: DynamoDBDocumentClient;

  constructor(
    private readonly tableName: string,
    client: DynamoDBClient = new DynamoDBClient({}),
  ) {
    this.doc = DynamoDBDocumentClient.from(client, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }

  async load(userId: string): Promise<UserState> {
    const res = await this.doc.send(
      new GetCommand({ TableName: this.tableName, Key: { userId } }),
    );
    return (res.Item?.state as UserState | undefined) ?? emptyState();
  }

  async save(userId: string, state: UserState): Promise<void> {
    await this.doc.send(
      new PutCommand({
        TableName: this.tableName,
        Item: { userId, state, updatedAt: new Date().toISOString() },
      }),
    );
  }
}
