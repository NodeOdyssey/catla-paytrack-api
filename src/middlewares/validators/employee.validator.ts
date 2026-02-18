// Import npm modules
import { NextFunction, Request, Response } from "express";
import {
  validationResult,
  check,
  ValidationError,
  param,
} from "express-validator";

// Regular expressions for GSTIN and PAN
// Regular expressions for GSTIN, PAN, and Aadhar
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const PAN_REGEX = /^([A-Z]{5}[0-9]{4}[A-Z]{1})?$/;
const AADHAR_REGEX = /^\d{12}$/;

// Validator for creating an employee
const validateCreateEmployeeRequestBody = [
  // Validate employee name
  check("empName")
    .exists()
    .withMessage("Employee name is required")
    .isString()
    .withMessage("Employee name must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Employee name cannot be empty"),

  // Validate father name
  check("fatherName")
    .exists()
    .withMessage("Father name is required")
    .isString()
    .withMessage("Father name must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Father name cannot be empty"),

  // Validate gender
  check("gender")
    .exists()
    .withMessage("Gender is required")
    .isString()
    .withMessage("Gender must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Gender cannot be empty"),

  // Validate date of birth
  check("dob")
    .exists()
    .withMessage("Date of Birth is required")
    .isISO8601()
    .withMessage("Date of Birth must be a valid date in YYYY-MM-DD format")
    .toDate(), // Convert to Date object

  // Validate phone number
  check("phoneNum")
    .exists()
    .withMessage("Phone number is required")
    .isMobilePhone("any")
    .withMessage("Phone number must be valid")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Phone number cannot be empty"),

  // Validate alternate phone number
  check("phoneNum")
    .optional()
    .isMobilePhone("any")
    .withMessage("Phone number must be valid")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Validate village/town
  check("villTown")
    .exists()
    .withMessage("Village/Town is required")
    .isString()
    .withMessage("Village/Town must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Village/Town cannot be empty"),

  // Validate post office
  check("postOffice")
    .exists()
    .withMessage("Post office is required")
    .isString()
    .withMessage("Post office must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Post office cannot be empty"),

  // Validate police station
  check("policeStation")
    .exists()
    .withMessage("Police station is required")
    .isString()
    .withMessage("Police station must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Police station cannot be empty"),

  // Validate district
  check("district")
    .exists()
    .withMessage("district is required")
    .isString()
    .withMessage("district must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("district cannot be empty"),

  // Validate pin code
  check("pinCode")
    .exists()
    .withMessage("Pin code is required")
    .isPostalCode("any")
    .withMessage("Pin code must be a valid postal code")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Validate state
  check("state")
    .exists()
    .withMessage("State is required")
    .isString()
    .withMessage("State must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("State cannot be empty"),

  // Validate qualification
  check("qualification")
    .exists()
    .withMessage("Qualification is required")
    .isString()
    .withMessage("Qualification must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Qualification cannot be empty"),

  // Validate blood group (optional field)
  check("bloodGroup").optional().isString().trim().escape(), // Sanitize to prevent XSS

  // Validate date of joining
  check("dateOfJoining")
    .exists()
    .withMessage("Date of Joining is required")
    .isISO8601()
    .withMessage("Date of Joining must be a valid date in YYYY-MM-DD format")
    .toDate(), // Convert to Date object

  // Validate EPF number
  check("epfNo")
    .optional()
    // .isString()
    // .withMessage("EPF number must be a string")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Validate ESI number
  check("esiNo")
    .optional()
    // .isString()
    // .withMessage("ESI number must be a string")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Validate PAN
  check("pan")
    .isString()
    .withMessage("PAN must be a string")
    .trim()
    .escape()
    .matches(PAN_REGEX)
    .withMessage("Invalid PAN format"),

  // Validate Aadhaar
  check("aadhaarNo")
    .optional({ nullable: true })
    .isString()
    .withMessage("Aadhar No must be a string")
    .trim()
    .escape(),
  // .matches(AADHAR_REGEX)
  // .withMessage("Invalid Aadhaar format"),

  // Custom error handling
  (req: Request, res: Response, next: NextFunction) => {
    console.log("req.body in employee validator", req.body);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Use type assertion to access the path property
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

const validateUpdateEmployeeRequestBody = [
  param("id")
    .notEmpty()
    .withMessage("Employee ID is required")
    .isInt()
    .withMessage("Post ID must be an integer"),

  check("empName")
    .exists()
    .withMessage("Employee name is required")
    .isString()
    .withMessage("Employee name must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Employee name cannot be empty"),

  // Validate father name
  check("fatherName")
    .exists()
    .withMessage("Father name is required")
    .isString()
    .withMessage("Father name must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Father name cannot be empty"),

  // Validate gender
  check("gender")
    .exists()
    .withMessage("Gender is required")
    .isString()
    .withMessage("Gender must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Gender cannot be empty"),

  // Validate date of birth
  check("dob")
    .exists()
    .withMessage("Date of Birth is required")
    .isISO8601()
    .withMessage("Date of Birth must be a valid date in YYYY-MM-DD format")
    .toDate(), // Convert to Date object

  // Validate phone number
  check("phoneNum")
    .exists()
    .withMessage("Phone number is required")
    .isMobilePhone("any")
    .withMessage("Phone number must be valid")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Phone number cannot be empty"),

  // Validate alternate phone number
  check("phoneNum")
    .optional()
    .isMobilePhone("any")
    .withMessage("Phone number must be valid")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Validate village/town
  check("villTown")
    .exists()
    .withMessage("Village/Town is required")
    .isString()
    .withMessage("Village/Town must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Village/Town cannot be empty"),

  // Validate post office
  check("postOffice")
    .exists()
    .withMessage("Post office is required")
    .isString()
    .withMessage("Post office must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Post office cannot be empty"),

  // Validate police station
  check("policeStation")
    .exists()
    .withMessage("Police station is required")
    .isString()
    .withMessage("Police station must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Police station cannot be empty"),

  // Validate district
  check("district")
    .exists()
    .withMessage("district is required")
    .isString()
    .withMessage("district must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("district cannot be empty"),

  // Validate pin code
  check("pinCode")
    .exists()
    .withMessage("Pin code is required")
    .isPostalCode("any")
    .withMessage("Pin code must be a valid postal code")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Validate state
  check("state")
    .exists()
    .withMessage("State is required")
    .isString()
    .withMessage("State must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("State cannot be empty"),

  // Validate qualification
  check("qualification")
    .exists()
    .withMessage("Qualification is required")
    .isString()
    .withMessage("Qualification must be a string")
    .trim()
    .escape() // Sanitize to prevent XSS
    .notEmpty()
    .withMessage("Qualification cannot be empty"),

  // Validate blood group (optional field)
  // check("bloodGroup").optional().isString().trim().escape(), // Sanitize to prevent XSS

  // Validate date of joining
  check("dateOfJoining")
    .exists()
    .withMessage("Date of Joining is required")
    .isISO8601()
    .withMessage("Date of Joining must be a valid date in YYYY-MM-DD format")
    .toDate(), // Convert to Date object

  // Validate EPF number
  check("epfNo")
    .optional()
    // .isString()
    // .withMessage("EPF number must be a string")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Validate ESI number
  check("esiNo")
    .optional()
    // .isString()
    // .withMessage("ESI number must be a string")
    .trim()
    .escape(), // Sanitize to prevent XSS

  // Validate PAN
  check("pan")
    .optional({ nullable: true })
    .isString()
    .withMessage("PAN must be a string")
    .trim()
    .escape()
    .matches(PAN_REGEX)
    .withMessage("Invalid PAN format"),

  // Validate Aadhaar
  check("aadhaarNo")
    .optional({ nullable: true })
    .isString()
    .withMessage("Aadhar No must be a string")
    .trim()
    .escape(),
  // .matches(AADHAR_REGEX)
  // .withMessage("Invalid Aadhaar format"),

  (req: Request, res: Response, next: NextFunction) => {
    console.log("req.body in employee validator", req.body);
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

export { validateCreateEmployeeRequestBody, validateUpdateEmployeeRequestBody };
