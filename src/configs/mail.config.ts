// Import npm modules
import dotenv from "dotenv";

// Types for config
interface MailConfig {
  user: string | undefined;
  pass: string | undefined;
  from: string | undefined;
}

// Dotenv config for environment variables
dotenv.config();

// Mail config
export const mailConfig: MailConfig = {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  from: process.env.EMAIL_FROM,
};
