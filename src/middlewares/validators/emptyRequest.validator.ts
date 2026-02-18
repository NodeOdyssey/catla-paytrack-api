import { Request, Response, NextFunction } from "express";
import logger from "../../helpers/logger";

// Custom validator to check if the request body is empty
export const validateNotEmptyRequestBody = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (Object.keys(req.body).length === 0) {
    logger.error("Request body is empty");

    return res.status(400).json({
      status: 400,
      success: false,
      message: "No data provided in request body. Please provide valid data.",
    });
  }
  next();
};
