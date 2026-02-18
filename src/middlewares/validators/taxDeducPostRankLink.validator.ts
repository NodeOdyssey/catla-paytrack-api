import { check, validationResult, ValidationError } from "express-validator";
import { Request, Response, NextFunction } from "express";

// Validator for creating a Tax Deduction Post Rank Link record
const validateCreateTaxDeductionPostRankLinkRequestBody = [
  // Validate taxDeductionID
  check("taxDeductionID")
    .exists()
    .withMessage("Tax Deduction ID is required")
    .isInt()
    .withMessage("Tax Deduction ID must be an integer"),

  // Validate postRankLinkID
  check("postRankLinkID")
    .exists()
    .withMessage("Post Rank Link ID is required")
    .isInt()
    .withMessage("Post Rank Link ID must be an integer"),

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

export { validateCreateTaxDeductionPostRankLinkRequestBody };
