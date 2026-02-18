import { check, validationResult, ValidationError } from "express-validator";
import { Request, Response, NextFunction } from "express";

interface Error {
  index: number;
  message: string;
  field: string;
}

const errors: Error[] = [];

// Validator for creating an attendance record
const validateCreateAttendanceRequestBody = [
  // Validate empPostRankLinkId
  check("empPostRankLinkId")
    .exists()
    .withMessage("Employee Post Rank Link ID is required")
    .isInt()
    .withMessage("Employee Post Rank Link ID must be an integer"),

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

  // Validate days present
  check("daysPresent")
    .exists()
    .withMessage("Days present is required")
    .isInt({ min: 0 })
    .withMessage("Days present must be a non-negative integer"),

  // Validate days absent
  check("daysAbsent")
    .exists()
    .withMessage("Days absent is required")
    .isInt({ min: 0 })
    .withMessage("Days absent must be a non-negative integer"),

  // Validate extra duty four hours
  check("extraDutyFourHr")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Extra duty (four hours) must be a non-negative integer"),

  // Validate extra duty eight hours
  check("extraDutyEightHr")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Extra duty (eight hours) must be a non-negative integer"),

  // Custom error handling
  (req: Request, res: Response, next: NextFunction) => {
    const errors = [] as { index: number; message: string; field: string }[];

    req.body.attendanceList.forEach((attendance: any, index: number) => {
      const validationErrors = validationResult({ body: attendance });

      if (!validationErrors.isEmpty()) {
        const firstError = validationErrors.array({
          onlyFirstError: true,
        })[0] as ValidationError & { path?: string };
        errors.push({
          index,
          message: firstError.msg,
          field: firstError.path as string,
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        status: 400,
        success: false,
        errors,
      });
    }

    next();
  },
];

// Validator for updating an attendance record
const validateUpdateAttendanceRequestBody = [
  // Validate days present
  check("daysPresent")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Days present must be a non-negative integer"),

  // Validate days absent
  check("daysAbsent")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Days absent must be a non-negative integer"),

  // Validate extra duty four hours
  check("extraDutyFourHr")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Extra duty (four hours) must be a non-negative integer"),

  // Validate extra duty eight hours
  check("extraDutyEightHr")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Extra duty (eight hours) must be a non-negative integer"),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = [] as { index: number; message: string; field: string }[];

    req.body.attendanceList.forEach((attendance: any, index: number) => {
      const validationErrors = validationResult({ body: attendance });

      if (!validationErrors.isEmpty()) {
        const firstError = validationErrors.array({
          onlyFirstError: true,
        })[0] as ValidationError & { path?: string };
        errors.push({
          index,
          message: firstError.msg,
          field: firstError.path as string,
        });
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({
        status: 400,
        success: false,
        errors,
      });
    }

    next();
  },
];

export {
  validateCreateAttendanceRequestBody,
  validateUpdateAttendanceRequestBody,
};
