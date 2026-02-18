// s3Helper.js
const AWS = require("aws-sdk");

AWS.config.update({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});

const s3 = new AWS.S3();

async function fetchImageAsBase64(bucket: string, key: string) {
  const params = {
    Bucket: bucket,
    Key: key,
  };

  try {
    const data = await s3.getObject(params).promise();
    console.log("data in fetchImageAsBase64: ", data);
    return data.Body.toString("base64");
  } catch (error) {
    console.error("Error fetching image from S3:", error);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as any).code === "NoSuchKey"
    ) {
      // Optionally return a default image or null if no image is found
      return null; // or return 'default-image-base64-string';
    }
    throw error; // Re-throw other errors to be handled upstreame
  }
}

export { fetchImageAsBase64 };
