// Import controllers
import {
  uploadPostFiles,
  uploadEmployeeFiles,
  uploadAttendanceFiles,
  deleteEmployeeFile,
} from "../controllers/fileUpload.controller";

// Import middlewares
import { verifyToken } from "../middlewares/authenticator";

// Import types
import { Application } from "express";

// APIs
const fileUploadRoutes = (app: Application) => {
  // API for uploading post files
  app.post(
    "/paytrack/api/v1/posts/:postId/upload",
    verifyToken,
    uploadPostFiles,
  );

  // API for uploading employee files
  app.post(
    "/paytrack/api/v1/employees/:empTableId/upload",
    verifyToken,
    uploadEmployeeFiles,
  );

  // API for deleting employee files
  app.delete(
    "/paytrack/api/v1/employee-files/:empTableId/:fieldName",
    verifyToken,
    deleteEmployeeFile,
  );

  // API for uploading attendance files
  app.post(
    "/paytrack/api/v1/attendance/:postId/upload/:month/:year",
    verifyToken,
    uploadAttendanceFiles,
  );
};

export default fileUploadRoutes;
