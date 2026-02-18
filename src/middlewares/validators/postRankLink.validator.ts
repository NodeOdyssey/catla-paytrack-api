import { NextFunction, Request, Response } from "express";
import {
  validationResult,
  check,
  ValidationError,
  param,
} from "express-validator";

// Custom validator to check if a value is a non-zero decimal
const isNonNegativeDecimal = (value: any) => {
  if (value === undefined || value === null) return true;
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
};

// Validator for creating a post rank link
const validateCreatePostRankLinkRequestBody = [
  // Validate post ID and rank ID in params
  param("postId")
    .notEmpty()
    .withMessage("Post ID is required")
    .isInt({ gt: 0 })
    .withMessage("Post ID must be a positive integer"),
  param("rankId")
    .notEmpty()
    .withMessage("Rank ID is required")
    .isInt({ gt: 0 })
    .withMessage("Rank ID must be a positive integer"),

  // Validate basic salary
  check("basicSalary")
    .isDecimal()
    .withMessage("Basic Salary must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("Basic Salary must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate kit allowance
  check("kitWashingAllowance")
    .optional()
    .isDecimal()
    .withMessage("Kit Allowance must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("Kit Allowance must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate city allowance
  check("cityAllowance")
    .optional()
    .isDecimal()
    .withMessage("City Allowance must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("City Allowance must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate conveyance allowance
  check("conveyance")
    .optional()
    .isDecimal()
    .withMessage("conveyance must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("conveyance must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate hra
  check("hra")
    .optional()
    .isDecimal()
    .withMessage("hra must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("hra must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate vda
  check("vda")
    .optional()
    .isDecimal()
    .withMessage("vda must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("vda must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate uniform allowance
  check("uniformAllowance")
    .optional()
    .isDecimal()
    .withMessage("Uniform Allowance must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("Uniform Allowance must be a non-zero decimal")
    .trim()
    .escape(),

  // Custom error handling
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({
        onlyFirstError: true,
      })[0] as ValidationError & { path?: string };

      return res.status(400).json({
        status: 400,
        success: false,
        message: firstError.msg,
        field: firstError.path,
      });
    }
    next();
  },
];

// Validator for updating a post rank link
const validateUpdatePostRankLinkRequestBody = [
  // Validate post ID and rank ID in params
  param("postRankLinkId")
    .notEmpty()
    .withMessage("Post Rank Link ID is required")
    .isInt()
    .withMessage("Post Rank Link ID must be an integer"),

  // Validate basic salary
  check("basicSalary")
    .optional()
    .isDecimal()
    .withMessage("Basic Salary must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("Basic Salary must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate kit allowance
  check("kitWashingAllowance")
    .optional()
    .isDecimal()
    .withMessage("Kit Allowance must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("Kit Allowance must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate city allowance
  check("cityAllowance")
    .optional()
    .isDecimal()
    .withMessage("City Allowance must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("City Allowance must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate conveyance allowance
  check("conveyance")
    .optional()
    .isDecimal()
    .withMessage("conveyance must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("conveyance must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate hra
  check("hra")
    .optional()
    .isDecimal()
    .withMessage("hra must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("hra must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate vda
  check("vda")
    .optional()
    .isDecimal()
    .withMessage("vda must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("vda must be a non-zero decimal")
    .trim()
    .escape(),

  // Validate uniform allowance
  check("uniformAllowance")
    .optional()
    .isDecimal()
    .withMessage("Uniform Allowance must be a decimal")
    .custom(isNonNegativeDecimal)
    .withMessage("Uniform Allowance must be a non-zero decimal")
    .trim()
    .escape(),

  // Custom error handling
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const firstError = errors.array({
        onlyFirstError: true,
      })[0] as ValidationError & { path?: string };

      return res.status(400).json({
        status: 400,
        success: false,
        message: firstError.msg,
        field: firstError.path,
      });
    }
    next();
  },
];

export {
  validateCreatePostRankLinkRequestBody,
  validateUpdatePostRankLinkRequestBody,
};
