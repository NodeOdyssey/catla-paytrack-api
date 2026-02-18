import { NextFunction, Request, Response } from "express";
import {
  validationResult,
  check,
  ValidationError,
  param,
} from "express-validator";

// Validator for creating an employee post rank link
const validateCreateEmpPostRankLinkRequestBody = [
  // Validate empTableID and postRankLinkID in body
  param("empTableID")
    .notEmpty()
    .withMessage("Employee ID is required")
    .isInt()
    .withMessage("Employee ID must be an integer"),
  param("postRankLinkID")
    .notEmpty()
    .withMessage("Post Rank Link ID is required")
    .isInt()
    .withMessage("Post Rank Link ID must be an integer"),

  // Validate dateOfPosting
  check("dateOfPosting")
    .notEmpty()
    .withMessage("Date of Posting is required")
    .isISO8601()
    .toDate()
    .withMessage("Date of Posting must be a valid date"),

  // Validate optional fields
  check("transferredFrom")
    .optional()
    .isString()
    .withMessage("Transferred From must be a string")
    .trim()
    .escape(),
  check("dateOfTransfer")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Date of Transfer must be a valid date"),
  check("transferredTo")
    .optional()
    .isString()
    .withMessage("Transferred To must be a string")
    .trim()
    .escape(),
  check("reApplyDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Reapply Date must be a valid date"),
  check("dateOfRehire")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Date of Rehire must be a valid date"),

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

// Validator for updating an employee post rank link
const validateUpdateEmpPostRankLinkRequestBody = [
  // Validate post ID and rank ID in params
  param("id")
    .notEmpty()
    .withMessage("Post Rank Link ID is required")
    .isInt()
    .withMessage("Post Rank Link ID must be an integer"),

  // Validate optional fields
  check("dateOfPosting")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Date of Posting must be a valid date"),
  check("transferredFrom")
    .optional()
    .isString()
    .withMessage("Transferred From must be a string")
    .trim()
    .escape(),
  check("dateOfTransfer")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Date of Transfer must be a valid date"),
  check("transferredTo")
    .optional()
    .isString()
    .withMessage("Transferred To must be a string")
    .trim()
    .escape(),
  check("reApplyDate")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Reapply Date must be a valid date"),
  check("dateOfRehire")
    .optional()
    .isISO8601()
    .toDate()
    .withMessage("Date of Rehire must be a valid date"),

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
  validateCreateEmpPostRankLinkRequestBody,
  validateUpdateEmpPostRankLinkRequestBody,
};
