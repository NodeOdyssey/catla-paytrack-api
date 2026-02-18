import { NextFunction, Request, Response } from "express";
import {
  validationResult,
  check,
  ValidationError,
  param,
} from "express-validator";

// Regular expressions for GSTIN and PAN
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

// Validator for creating a post
const validateCreatePostRequestBody = [
  // Validate post name
  check("postName")
    .exists()
    .withMessage("Post name is required")
    .isString()
    .withMessage("Post name must be a string")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Post name cannot be empty"),

  // Validate contact person
  check("contactPerson")
    .optional()
    .isString()
    .withMessage("Contact Person must be a string")
    .trim()
    .escape(),

  // Validate phone number
  check("phoneNum")
    .optional()
    // .isString()
    // .withMessage("Phone Number must be a string")
    .trim()
    .escape(),
  // .notEmpty()
  // .withMessage("Phone Number cannot be empty"),

  // Validate GSTIN
  check("gstin")
    .exists()
    .withMessage("GSTIN is required")
    .isString()
    .withMessage("GSTIN must be a string")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("GSTIN cannot be empty")
    .matches(GSTIN_REGEX)
    .withMessage("Invalid GSTIN format"),

  // Validate address
  check("address")
    .exists()
    .withMessage("Address is required")
    .isString()
    .withMessage("Address must be a string")
    .trim()
    .escape(),
  // .notEmpty()
  // .withMessage("Address cannot be empty"),

  // Validate PAN
  check("pan")
    .optional({ nullable: true, checkFalsy: true }) // Allows empty values
    .isString()
    .withMessage("PAN must be a string")
    .trim()
    .escape()
    .matches(PAN_REGEX)
    .withMessage("Invalid PAN format"),

  // Validate contract date
  check("contractDate")
    .exists()
    .withMessage("Contract Date is required")
    .isString()
    .withMessage("Contract Date must be a string")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Contract Date cannot be empty"),

  // // Validate GST document files if provided
  // check("docGst").custom((value, { req }) => {
  //   if (req.files && req.files.docGst) {
  //     return true;
  //   }
  //   if (!req.files || !req.files.docGst) {
  //     return true; // It's optional
  //   }
  //   throw new Error("Invalid GST document");
  // }),

  // // Validate Contract document files if provided
  // check("docContract").custom((value, { req }) => {
  //   if (req.files && req.files.docContract) {
  //     return true;
  //   }
  //   if (!req.files || !req.files.docContract) {
  //     return true; // It's optional
  //   }
  //   throw new Error("Invalid Contract document");
  // }),

  // // Validate PAN document files if provided
  // check("docPan").custom((value, { req }) => {
  //   if (req.files && req.files.docPan) {
  //     return true;
  //   }
  //   if (!req.files || !req.files.docPan) {
  //     return true; // It's optional
  //   }
  //   throw new Error("Invalid PAN document");
  // }),

  // // Validate Other document files if provided
  // check("docOther").custom((value, { req }) => {
  //   if (req.files && req.files.docOther) {
  //     return true;
  //   }
  //   if (!req.files || !req.files.docOther) {
  //     return true; // It's optional
  //   }
  //   throw new Error("Invalid Other document");
  // }),

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

// Validator for updating a post
const validateUpdatePostRequestBody = [
  // Validate param
  param("id")
    .notEmpty()
    .withMessage("Post ID is required")
    .isInt()
    .withMessage("Post ID must be an integer"),

  // Validate post name
  check("postName")
    .exists()
    .withMessage("Post name is required")
    .isString()
    .withMessage("Post name must be a string")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Post name cannot be empty"),

  // Validate contact person
  check("contactPerson")
    .optional()
    .isString()
    .withMessage("Contact Person must be a string")
    .trim()
    .escape(),

  // Validate phone number
  check("phoneNum").optional().trim().escape(),

  // Validate GSTIN
  check("gstin")
    .exists()
    .withMessage("GSTIN is required")
    .isString()
    .withMessage("GSTIN must be a string")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("GSTIN cannot be empty")
    .matches(GSTIN_REGEX)
    .withMessage("Invalid GSTIN format"),

  // Validate address
  check("address")
    .exists()
    .withMessage("Address is required")
    .isString()
    .withMessage("Address must be a string")
    .trim()
    .escape(),

  // Validate PAN
  check("pan")
    .optional({ nullable: true, checkFalsy: true }) // Allows empty values
    .isString()
    .withMessage("PAN must be a string")
    .trim()
    .escape()
    .matches(PAN_REGEX)
    .withMessage("Invalid PAN format"),

  // Validate contract date
  check("contractDate")
    .exists()
    .withMessage("Contract Date is required")
    .isString()
    .withMessage("Contract Date must be a string")
    .trim()
    .escape()
    .notEmpty()
    .withMessage("Contract Date cannot be empty"),

  // Custom error handling
  async (req: Request, res: Response, next: NextFunction) => {
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

export { validateCreatePostRequestBody, validateUpdatePostRequestBody };
