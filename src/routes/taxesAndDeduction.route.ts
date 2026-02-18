// Import controllers
import {
  createTaxesAndDeduction,
  updateTaxesAndDeduction,
  deleteTaxesAndDeduction,
  viewTaxesAndDeductionById,
  viewAllTaxesAndDeductions,
} from "../controllers/taxesAndDeduction.controller";

// Import middlewares
import {
  validateCreateTaxesAndDeductionRequestBody,
  validateUpdateTaxesAndDeductionRequestBody,
} from "../middlewares/validators/taxesAndDeduction.validator";
import { verifyToken } from "../middlewares/authenticator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";

// Import types
import { Application } from "express";

// Taxes and Deduction APIs
const taxesAndDeductionRoutes = (app: Application) => {
  // API for creating a taxes and deduction record
  app.post(
    "/paytrack/api/v1/taxes-and-deduction",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateCreateTaxesAndDeductionRequestBody,
    ],
    createTaxesAndDeduction,
  );

  // API for updating a taxes and deduction record
  app.patch(
    "/paytrack/api/v1/taxes-and-deduction/:id",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateUpdateTaxesAndDeductionRequestBody,
    ],
    updateTaxesAndDeduction,
  );

  // API for deleting a taxes and deduction record
  app.delete(
    "/paytrack/api/v1/taxes-and-deduction/:id",
    [verifyToken],
    deleteTaxesAndDeduction,
  );

  // API for viewing a taxes and deduction record by ID
  app.get(
    "/paytrack/api/v1/taxes-and-deduction/:id",
    [verifyToken],
    viewTaxesAndDeductionById,
  );

  // API for viewing all taxes and deduction records
  app.get(
    "/paytrack/api/v1/taxes-and-deduction",
    [verifyToken],
    viewAllTaxesAndDeductions,
  );
};

export default taxesAndDeductionRoutes;
