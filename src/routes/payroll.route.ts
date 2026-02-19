// Import controllers
import {
  createPayroll,
  viewPayroll,
  updatePayroll,
  deletePayroll,
  getPayrollStatus,
  generatePaySlipsByPost,
  getCurrentMonthPayrollStatusByEmployee,
  recordAdvance,
} from "../controllers/payroll.controller";

// Import middlewares
import {
  validateCreatePayrollRequestBody,
  validateUpdatePayrollRequestBody,
  validateDeletePayrollRequestBody,
} from "../middlewares/validators/payroll.validator";
import { verifyToken } from "../middlewares/authenticator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";

// Import types
import { Application } from "express";

// APIs
const payrollRoutes = (app: Application) => {
  // API for updating a payroll
  app.patch(
    "/paytrack/api/v1/payrolls",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateUpdatePayrollRequestBody,
    ],
    updatePayroll,
  );

  // API for creating a payroll
  app.post(
    "/paytrack/api/v1/payrolls",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateCreatePayrollRequestBody,
    ],
    createPayroll,
  );

  // API for recording salary advance before payroll generation
  app.post(
    "/paytrack/api/v1/payrolls/advance",
    [verifyToken, validateNotEmptyRequestBody],
    recordAdvance,
  );

  // API for getting all payrolls
  app.get(
    "/paytrack/api/v1/payrolls/:postId/:month/:year",
    [verifyToken],
    viewPayroll,
  );

  // API for getting a payroll by ID
  // app.get("/paytrack/api/v1/payrolls/:id", [verifyToken], getPayrollById);

  // API for deleting a payroll
  app.delete(
    "/paytrack/api/v1/payrolls/:postId/:month/:year",
    [verifyToken],
    validateDeletePayrollRequestBody,
    deletePayroll,
  );

  app.get(
    "/paytrack/api/v1/payroll-status/:month/:year",
    [verifyToken],
    getPayrollStatus,
  );

  // API for checking current month payroll status for employee advance flow
  app.get(
    "/paytrack/api/v1/payrolls/advance-status/:employeeId",
    [verifyToken],
    getCurrentMonthPayrollStatusByEmployee,
  );

  // API for generating payslips by post
  app.get(
    "/paytrack/api/v1/payrolls/payslips/:postId/:month/:year",
    [verifyToken],
    generatePaySlipsByPost,
  );
};

export default payrollRoutes;
