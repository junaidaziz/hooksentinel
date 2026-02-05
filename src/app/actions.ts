// src/app/actions.ts
"use server";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { fromIni } from "@aws-sdk/credential-providers";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
const credentials = process.env.AWS_PROFILE
  ? fromIni({ profile: process.env.AWS_PROFILE })
  : undefined;

const client = new DynamoDBClient({ region, credentials });
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

export async function replayWebhook(webhookId: string, targetUrl: string) {
  if (!targetUrl) return { success: false, error: "No URL provided" };

  try {
    const query = new QueryCommand({
      // @ts-ignore
      TableName: Resource.Events.name,
      IndexName: "GSI1", 
      KeyConditionExpression: "GSI1PK = :id",
      ExpressionAttributeValues: {
        ":id": webhookId,
      },
    });

    const result = await docClient.send(query);
    const originalHook = result.Items?.[0];

    if (!originalHook) return { success: false, error: "Webhook not found" };

    // --- FIX START ---
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-HookSentinel-Replay": "true",
      },
      body: originalHook.payload,
    });

    if (!response.ok) {
      return { 
        success: false, 
        error: `Target URL returned ${response.status} ${response.statusText}` 
      };
    }
    // --- FIX END ---

    return { 
      success: true, 
      status: response.status 
    };

  } catch (error: any) {
    console.error("Replay failed:", error);
    // Return the actual error message so we can debug
    return { success: false, error: error.message || "Network error" };
  }
}