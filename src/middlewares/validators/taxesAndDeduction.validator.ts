import { check, validationResult, ValidationError } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Validator for creating a Taxes and Deduction record
const validateCreateTaxesAndDeductionRequestBody = [
  // Validate ESI
  check("esi")
    .exists()
    .withMessage("ESI is required")
    .isDecimal()
    .withMessage("ESI must be a decimal number"),

  // Validate EPF
  check("epf")
    .exists()
    .withMessage("EPF is required")
    .isDecimal()
    .withMessage("PTax must be a decimal number"),

  // Validate Employer ESI
  check("employerEsi")
    .exists()
    .withMessage("Employer ESI is required")
    .isDecimal()
    .withMessage("Employer ESI must be a decimal number"),

  // Validate pTax
  check("pTax")
    .optional()
    .isDecimal()
    .withMessage("PTax must be a decimal number"),

  // Validate uniform deduction
  check("uniformDeduction")
    .optional()
    .isDecimal()
    .withMessage("Uniform Deduction must be a decimal number"),

  // Validate other deduction
  check("otherDeduction")
    .optional()
    .isDecimal()
    .withMessage("Other Deduction must be a decimal number"),

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

// Validator for updating a Taxes and Deduction record
const validateUpdateTaxesAndDeductionRequestBody = [
  // Validate pTax
  check("pTax")
    .optional()
    .isDecimal()
    .withMessage("PTax must be a decimal number"),

  // Validate uniform deduction
  check("uniformDeduction")
    .optional()
    .isDecimal()
    .withMessage("Uniform Deduction must be a decimal number"),

  // Validate other deduction
  check("otherDeduction")
    .optional()
    .isDecimal()
    .withMessage("Other Deduction must be a decimal number"),

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
  validateCreateTaxesAndDeductionRequestBody,
  validateUpdateTaxesAndDeductionRequestBody,
};
