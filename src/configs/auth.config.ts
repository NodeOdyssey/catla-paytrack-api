// Import npm modules
import dotenv from "dotenv";

// Types for config
interface AuthConfig {
  secret: string | undefined;
  salt: string | undefined;
  jwtExpiryTime: string | undefined;
}

// Dotenv config for environment variables
dotenv.config();

// Auth config
export const authConfig: AuthConfig = {
  secret: process.env.AUTH_SECRET,
  salt: process.env.SALT,
  jwtExpiryTime: process.env.JWT_EXPIRY_TIME,
};
