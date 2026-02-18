import { S3Client } from "@aws-sdk/client-s3";

// AWS S3 Client Configuration
// if (!process.env.S3_BUCKET_NAME) {
//   throw new Error("S3_BUCKET_NAME environment variable is not set");
// }

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// // AWS S3 Client Configuration
export const bucketName = process.env.S3_BUCKET_NAME;
if (!process.env.S3_BUCKET_NAME) {
}
