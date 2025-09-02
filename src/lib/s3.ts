import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";




if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new Error("As credenciais da AWS não estão definidas corretamente.");
  }
  
  const BUCKET_NAME = process.env.BUCKET_NAME
  const BUCKET_REGION = process.env.AWS_REGION
  const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID
  const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
  
  
  
  
  
  const s3 = new S3Client({
    region: BUCKET_REGION,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_ACCESS_KEY
    },
  });


export default s3;