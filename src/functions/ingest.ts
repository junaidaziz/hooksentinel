import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event: any) => {
  // 1. Validation
  const { userId } = event.pathParameters || {};
  if (!userId) {
    return { statusCode: 400, body: JSON.stringify({ error: "Missing userId" }) };
  }

  const webhookId = uuidv4();
  const timestamp = Date.now();
  const body = event.body; 
  
  // 2. Prepare the DB Item
  const item = {
    PK: `USER#${userId}`,
    SK: `EVENT#${timestamp}#${webhookId}`,
    GSI1PK: webhookId,
    GSI1SK: `EVENT#${timestamp}`,
    payload: body, // For MVP, we assume payload is small enough for DynamoDB (<400KB)
    headers: event.headers,
    method: event.requestContext.http.method,
    sourceIp: event.requestContext.http.sourceIp,
    status: "RECEIVED",
    receivedAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 Days TTL
  };

  try {
    // 3. Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item
    }));

    // 4. Return 200 OK immediately
    return {
      statusCode: 200,
      body: JSON.stringify({ id: webhookId, status: "queued" }),
    };

  } catch (error) {
    console.error("Ingest Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
  }
};