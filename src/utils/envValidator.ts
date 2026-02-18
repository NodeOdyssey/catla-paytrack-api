function validateEnvironmentVariables() {
  const requiredEnvVars = [
    "PORT",
    "DATABASE_URL",
    "AUTH_SECRET",
    "SALT",
    "JWT_EXPIRY_TIME",
  ];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
}

export { validateEnvironmentVariables };
