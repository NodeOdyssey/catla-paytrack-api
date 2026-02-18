// Import controllers
import {
  createEmployee,
  getAllEmployees,
  updateEmployee,
  getEmployeeById,
  deleteEmployee,
  updateEmployeeStatus,
  viewEmployeeHistory,
  generateIdCard,
} from "../controllers/employee.controller";

// Import middlewares
import {
  validateCreateEmployeeRequestBody,
  validateUpdateEmployeeRequestBody,
} from "../middlewares/validators/employee.validator";
import { verifyToken } from "../middlewares/authenticator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";

// Import types
import { Application } from "express";

// APIs
const employeeRoutes = (app: Application) => {
  // API for updating an employees
  app.patch(
    "/paytrack/api/v1/employees/:id",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateUpdateEmployeeRequestBody,
    ],
    updateEmployee,
  );

  // API for creating an employee
  app.post(
    "/paytrack/api/v1/employees",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateCreateEmployeeRequestBody,
    ],
    createEmployee,
  );

  // API for getting all employees
  app.get("/paytrack/api/v1/employees", [verifyToken], getAllEmployees);

  // API for getting an employee by ID
  app.get("/paytrack/api/v1/employees/:id", [verifyToken], getEmployeeById);

  // API for deleting an employee
  app.delete("/paytrack/api/v1/employees/:id", [verifyToken], deleteEmployee);

  // API for updating employee status
  app.patch(
    "/paytrack/api/v1/employees/status/:id",
    [verifyToken],
    updateEmployeeStatus,
  );

  app.get("/paytrack/api/v1/employees/:id/history", [
    verifyToken,
    viewEmployeeHistory,
  ]);

  // API for generating ID card details
  app.get(
    "/paytrack/api/v1/employees/generate-id-card/:id",
    [verifyToken],
    generateIdCard,
  );
};

export default employeeRoutes;
