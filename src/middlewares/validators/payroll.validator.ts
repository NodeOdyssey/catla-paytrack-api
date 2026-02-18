import { check, validationResult, ValidationError } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Validator for creating a payroll
const validateCreatePayrollRequestBody = [
  // Validate postId
  check("postId")
    .exists()
    .withMessage("Post ID is required")
    .isInt()
    .withMessage("Post ID must be an integer"),

  // Validate month
  check("month")
    .exists()
    .withMessage("Month is required")
    .isInt({ min: 1, max: 12 })
    .withMessage("Month must be an integer between 1 and 12"),

  // Validate year
  check("year")
    .exists()
    .withMessage("Year is required")
    .isInt({ min: 1900, max: 2100 })
    .withMessage("Year must be a valid integer"),

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

// Validator for updating a payroll
const validateUpdatePayrollRequestBody = [
  // Validate advance
  check("advance")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Advance must be a non-negative number"),

  // Validate extraDuty
  check("extraDuty")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Extra duty must be a non-negative number"),

  // Validate bonus
  check("bonus")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Bonus must be a non-negative number"),

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

// Validator for deleting a payroll
const validateDeletePayrollRequestBody = [
  // Validate postId
  check("postId")
    .exists()
    .withMessage("Post ID is required")
    .isInt()
    .withMessage("Post ID must be an integer"),

  // Validate month
  check("month")
    .exists()
    .withMessage("Month is required")
    .isInt({ min: 1, max: 12 })
    .withMessage("Month must be an integer between 1 and 12"),

  // Validate year
  check("year")
    .exists()
    .withMessage("Year is required")
    .isInt({ min: 1900, max: 2100 })
    .withMessage("Year must be a valid integer"),

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
  validateCreatePayrollRequestBody,
  validateUpdatePayrollRequestBody,
  validateDeletePayrollRequestBody,
};
