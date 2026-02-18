import { NextFunction, Request, Response } from "express";
import {
  validationResult,
  check,
  ValidationError,
  param,
} from "express-validator";

// Custom validator to check if a value is a positive number
const isNonNegativeDecimal = (value: any) => {
  if (value === undefined || value === null) return true;
  const num = parseFloat(value);
  return !isNaN(num) && num >= 0;
};

// Validator for creating a rank
const validateCreateRankRequestBody = [
  // Validate designation
  check("designation")
    .notEmpty()
    .withMessage("Designation is required")
    .isString()
    .withMessage("Designation must be a string")
    .trim()
    .escape(),

  // Validate basic salary
  check("basicSalary")
    .notEmpty()
    .withMessage("Basic Salary is required")
    .isInt({ min: 0 })
    .withMessage("Basic Salary must be a positive number")
    .trim()
    .escape(),

  // Validate kit allowance
  check("kitWashingAllowance")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Kit/Washing Allowance must be a positive number")
    .trim()
    .escape(),

  // Validate city allowance
  check("cityAllowance")
    .optional()
    .isInt({ min: 0 })
    .withMessage("City Allowance must be a positive number")
    .trim()
    .escape(),

  // Validate conveyance allowance
  check("conveyance")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Conveyance must be a positive number")
    .trim()
    .escape(),

  // Validate hra
  check("hra")
    .optional()
    .isInt({ min: 0 })
    .withMessage("HRA must be a positive number")
    .trim()
    .escape(),

  // Validate vda
  check("vda")
    .optional()
    .isDecimal()
    .withMessage("vda must be a decimal")
    .isInt({ min: 0 })
    .withMessage("vda must be a positive number")
    .trim()
    .escape(),

  // Validate uniform allowance
  check("uniformAllowance")
    .optional()
    .isDecimal()
    .withMessage("Uniform Allowance must be a decimal")
    .isInt({ min: 0 })
    .withMessage("Uniform Allowance must be a positive number")
    .trim()
    .escape(),

  // Validate otherAllowance
  check("otherAllowance")
    .optional()
    .isDecimal()
    .withMessage("Others must be a decimal")
    .isInt({ min: 0 })
    .withMessage("Others must be a positive number")
    .trim()
    .escape(),

  // // Validate four hour pay
  // check("fourHrPay")
  //   .optional()
  //   .isDecimal()
  //   .withMessage("Four Hour Pay must be a decimal")
  //   .custom(isNonNegativeDecimal)
  //   .withMessage("Four Hour Pay must be a positive number")
  //   .trim()
  //   .escape(),

  // // Validate eight hour pay
  // check("eightHrPay")
  //   .optional()
  //   .isDecimal()
  //   .withMessage("Eight Hour Pay must be a decimal")
  //   .custom(isNonNegativeDecimal)
  //   .withMessage("Eight Hour Pay must be a positive number")
  //   .trim()
  //   .escape(),

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

// Validator for updating a rank
const validateUpdateRankRequestBody = [
  // Validate rank ID
  param("id")
    .notEmpty()
    .withMessage("Rank ID is required")
    .isInt()
    .withMessage("Rank ID must be an integer")
    .trim()
    .escape(),

  // Validate designation
  check("designation")
    .optional()
    .isString()
    .withMessage("designation must be a string")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("designation cannot be empty"),

  // Validate basic salary
  check("basicSalary")
    .optional()
    .isDecimal()
    .withMessage("Basic Salary must be a decimal")
    .isInt({ min: 0 })
    .withMessage("Basic Salary must be a positive number")
    .trim()
    .escape(),

  // Validate kit allowance
  check("kitWashingAllowance")
    .optional()
    .isDecimal()
    .withMessage("Kit Allowance must be a decimal")
    .isInt({ min: 0 })
    .withMessage("Kit Allowance must be a positive number")
    .trim()
    .escape(),

  // Validate city allowance
  check("cityAllowance")
    .optional()
    .isDecimal()
    .withMessage("City Allowance must be a decimal")
    .isInt({ min: 0 })
    .withMessage("City Allowance must be a positive number")
    .trim()
    .escape(),

  // Validate conveyance allowance
  check("conveyance")
    .optional()
    .isDecimal()
    .withMessage("conveyance must be a decimal")
    .isInt({ min: 0 })
    .withMessage("conveyance must be a positive number")
    .trim()
    .escape(),

  // Validate hra
  check("hra")
    .optional()
    .isDecimal()
    .withMessage("hra must be a decimal")
    .isInt({ min: 0 })
    .withMessage("hra must be a positive number")
    .trim()
    .escape(),

  // Validate vda
  check("vda")
    .optional()
    .isDecimal()
    .withMessage("vda must be a decimal")
    .isInt({ min: 0 })
    .withMessage("vda must be a positive number")
    .trim()
    .escape(),

  // Validate uniform allowance
  check("uniformAllowance")
    .optional()
    .isDecimal()
    .withMessage("Uniform Allowance must be a decimal")
    .isInt({ min: 0 })
    .withMessage("Uniform Allowance must be a positive number")
    .trim()
    .escape(),

  // Validate otherAllowance
  check("otherAllowance")
    .optional()
    .isDecimal()
    .withMessage("Others must be a decimal")
    .isInt({ min: 0 })
    .withMessage("Others must be a positive number")
    .trim()
    .escape(),

  // // Validate four hour pay
  // check("fourHrPay")
  //   .optional()
  //   .isDecimal()
  //   .withMessage("Four Hour Pay must be a decimal")
  //   .custom(isNonNegativeDecimal)
  //   .withMessage("Four Hour Pay must be a positive number")
  //   .trim()
  //   .escape(),

  // Validate eight hour pay
  // check("eightHrPay")
  //   .optional()
  //   .isDecimal()
  //   .withMessage("Eight Hour Pay must be a decimal")
  //   .custom(isNonNegativeDecimal)
  //   .withMessage("Eight Hour Pay must be a positive number")
  //   .trim()
  //   .escape(),

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

export { validateCreateRankRequestBody, validateUpdateRankRequestBody };
