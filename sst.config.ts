// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

import type { Region } from "@pulumi/aws";
export default $config({
  app(input) {
    const region = (process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1") as Region;
    return {
      name: "hooksentinel",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {
        aws: {
          profile: process.env.AWS_PROFILE || "hooksentinel",
          region,
        },
      },
    };
  },
  async run() {
    // 1. DynamoDB: Where we store the webhook logs
    const table = new sst.aws.Dynamo("Events", {
      fields: {
        PK: "string",   // USER#<userId>
        SK: "string",   // EVENT#<timestamp>
        GSI1PK: "string", // webhookId (for direct lookup)
        GSI1SK: "string",
      },
      primaryIndex: { hashKey: "PK", rangeKey: "SK" },
      globalIndexes: {
        GSI1: { hashKey: "GSI1PK", rangeKey: "GSI1SK" },
      },
      ttl: "expiresAt", // Auto-delete logs after 7 days
    });

    // 2. S3 Bucket: Where we store large JSON payloads (>400KB)
    const bucket = new sst.aws.Bucket("Payloads");

    // 3. API Gateway: The entry point for webhooks
    const api = new sst.aws.ApiGatewayV2("Api");

    api.route("POST /inbox/{userId}", {
      handler: "src/functions/ingest.handler",
      link: [table, bucket], // Gives Lambda permission to talk to DB/S3
      environment: {
        TABLE_NAME: table.name,
        BUCKET_NAME: bucket.name,
      }
    });

    // 4. Next.js App: Your dashboard
    new sst.aws.Nextjs("Web", {
      link: [api, table, bucket],
      dev: {
        command: "pnpm dev:next",
        url: "http://localhost:3000",
      },
    });

    return {
      ApiEndpoint: api.url,
      TableName: table.name,
      BucketName: bucket.name,
    };
  },
});