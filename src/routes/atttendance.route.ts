// Import controllers
import {
  createAttendance,
  updateAttendance,
  deleteAttendance,
  viewAttendancesByMonthYear,
  createAttendanceSchedule,
  updateSingleAttendance,
  getAttendanceStatus,
  deleteAttendanceDoc,
  getAtendanceAndPayrollStatuses,
  deleteAttendanceByMonthYear,
} from "../controllers/attendance.controller";

// Import middlewares
import {
  validateCreateAttendanceRequestBody,
  validateUpdateAttendanceRequestBody,
} from "../middlewares/validators/attendance.validator";
import { verifyToken } from "../middlewares/authenticator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";

// Import types
import { Application } from "express";

// Attendance APIs
const attendanceRoutes = (app: Application) => {
  // API for creating attendance batch record
  app.post(
    "/paytrack/api/v1/attendance/:postId/:month/:year",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateCreateAttendanceRequestBody,
    ],
    createAttendance,
  );

  // API for updating attendance batch
  app.patch(
    "/paytrack/api/v1/attendance/:postId/:month/:year",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateUpdateAttendanceRequestBody,
    ],
    updateAttendance,
  );

  // API for updating a single attendance record
  app.patch(
    "/paytrack/api/v1/attendance-record/:id",
    [verifyToken],
    updateSingleAttendance,
  );

  // API for viewing all attendances for a specific year and month
  app.get(
    "/paytrack/api/v1/attendance/:postId/:month/:year",
    [verifyToken],
    viewAttendancesByMonthYear,
  );

  app.post(
    "/paytrack/api/v1/attendance-schedule",
    [verifyToken],
    createAttendanceSchedule,
  );

  app.get(
    "/paytrack/api/v1/attendance-status/:month/:year",
    [verifyToken],
    getAttendanceStatus,
  );

  app.delete(
    "/paytrack/api/v1/attendance-doc/:postId/:month/:year",
    [verifyToken],
    deleteAttendanceDoc,
  );

  // Endpoint for attendance and payroll status combined
  app.get(
    "/paytrack/api/v1/attendance-payroll-status/:month/:year",
    [verifyToken],
    getAtendanceAndPayrollStatuses,
  );

  app.delete(
    "/paytrack/api/v1/attendance/:postId/:month/:year",
    [verifyToken],
    deleteAttendanceByMonthYear,
  );

  // API for deleting one attendance record
  app.delete(
    "/paytrack/api/v1/attendance/:id",
    [verifyToken],
    deleteAttendance,
  );
};

export default attendanceRoutes;
