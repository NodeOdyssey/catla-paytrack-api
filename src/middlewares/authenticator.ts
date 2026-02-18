// Import npm modules
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

// Import database
import { db } from "../configs/db.config";

// Import configs
import { authConfig } from "../configs/auth.config";

// Import helpers
import logger from "../helpers/logger";

// Function for authenticating a user
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers["x-access-token"] as string;

  if (!token) {
    logger.error("Authentication error: No token provided.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Authentication error: No token provided.",
    });
  }

  try {
    // Check if secret is set
    if (!authConfig.secret) {
      logger.error("Authentication error: Secret is not set in auth config.");
      return res.status(500).send({
        status: 500,
        success: false,
        message: "Internal server error during user logout.",
      });
    }

    // Check if the token is blacklisted
    const tokenIsBlacklisted = await db.tokenBlacklist.findFirst({
      where: { token: token },
    });

    // If the token is blacklisted, return an error
    if (tokenIsBlacklisted) {
      logger.error("Token is blacklisted.");
      return res.status(401).send({
        status: 401,
        success: false,
        message: "Token is expired. Please login again.",
      });
    }

    // Verify the token to get the user info
    const decodedToken = jwt.verify(token, authConfig.secret) as JwtPayload;

    // Handle if the token is invalid
    if (!decodedToken) {
      logger.error("Token is invalid.");
      return res.status(401).send({
        status: 401,
        success: false,
        message: "Token is invalid. Please login again.",
      });
    }

    // Find the user corresponding to the token
    const user = await db.user.findUnique({
      where: { ID: decodedToken.id },
    });

    // Check if the user exists
    if (!user) {
      logger.error("User not found during token verification.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "User not found.",
      });
    }

    // Attach the user to the request object
    // req.user = user;
    // Assuming you have a way to attach user to the request object
    next();
  } catch (err: any) {
    // Handle specific JWT errors
    if (err.name === "TokenExpiredError") {
      logger.error(`Token expired: ${err.message}`);
      return res.status(401).send({
        status: 401,
        success: false,
        message: "Token has expired. Please login again.",
        errorName: err.name,
      });
    } else if (err.name === "JsonWebTokenError") {
      logger.error(`JWT error: ${err.message}`);
      return res.status(401).send({
        status: 401,
        success: false,
        message: "Invalid token. Please login again.",
        errorName: err.name,
      });
    } else if (err.name === "NotBeforeError") {
      logger.error(`Token not active: ${err.message}`);
      return res.status(401).send({
        status: 401,
        success: false,
        message: "Token not active. Please login again.",
        errorName: err.name,
      });
    } else {
      // Log the full error object for more information
      logger.error(`Error during user authentication: ${err.message}`, {
        error: err,
      });
      return res.status(500).send({
        status: 500,
        success: false,
        message: "Internal server error during user authentication.",
      });
    }
  }
};
