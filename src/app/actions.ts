// src/app/actions.ts
"use server";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function getWebhooks(userId: string) {
  try {
    const command = new QueryCommand({
      // @ts-ignore - SST types are sometimes loose in dev, this works
      TableName: Resource.Events.name, 
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
      ExpressionAttributeValues: {
        ":pk": `USER#${userId}`,
        ":sk": "EVENT#",
      },
      ScanIndexForward: false, // Newest first
      Limit: 20,
    });

    const response = await docClient.send(command);
    return response.Items || [];
  } catch (error) {
    console.error("Failed to fetch webhooks:", error);
    return [];
  }
}