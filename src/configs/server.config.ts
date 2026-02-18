// server.config.ts
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

export const PORT = process.env.PORT;
