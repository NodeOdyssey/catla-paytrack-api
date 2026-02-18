// Import controllers
import {
  viewDsReport,
  viewtWithoutAllowanceReport,
  viewNewPayrollReport,
  viewDslReport,
  viewLntReport,
  viewOtherReport,
  viewEsiReport,
  viewEsiReportAllPost,
  viewSalaryReport,
  viewEpfReportAllPost,
  viewCombinedPTaxReport,
} from "../controllers/report.controller";

// Import middlewares
import { verifyToken } from "../middlewares/authenticator";

// Import types
import { Application } from "express";

// APIs
const reportRoutes = (app: Application) => {
  // API for getting DS report
  app.get(
    "/paytrack/api/v1/reports/ds/:postId/:month/:year",
    [verifyToken],
    viewDsReport,
  );

  // API for getting Without Allowance report
  app.get(
    "/paytrack/api/v1/reports/without-allowance/:postId/:month/:year",
    [verifyToken],
    viewtWithoutAllowanceReport,
  );

  // API for getting New Payroll report
  app.get(
    "/paytrack/api/v1/reports/new-payroll/:postId/:month/:year",
    [verifyToken],
    viewNewPayrollReport,
  );

  // API for getting DSL report
  app.get(
    "/paytrack/api/v1/reports/dsl/:postId/:month/:year",
    [verifyToken],
    viewDslReport,
  );

  // API for getting LST report
  app.get(
    "/paytrack/api/v1/reports/lnt/:postId/:month/:year",
    [verifyToken],
    viewLntReport,
  );

  // API for getting Other report
  app.get(
    "/paytrack/api/v1/reports/other/:postId/:month/:year",
    [verifyToken],
    viewOtherReport,
  );

  // API for getting all ESI report
  app.post(
    "/paytrack/api/v1/reports/esi/all",
    [verifyToken],
    viewEsiReportAllPost,
  );

  // API for getting all EPF report
  app.post(
    "/paytrack/api/v1/reports/epf/all",
    [verifyToken],
    viewEpfReportAllPost,
  );

  // API for getting all Salart report
  app.post("/paytrack/api/v1/reports/salary", [verifyToken], viewSalaryReport);

  // API for getting all PTax report
  app.post(
    "/paytrack/api/v1/reports/ptax",
    [verifyToken],
    viewCombinedPTaxReport,
  );

  // // API for getting ESI report
  // app.get(
  //   "/paytrack/api/v1/reports/esi/:postId/:month/:year",
  //   [verifyToken],
  //   viewEsiReport,
  // );
};
export default reportRoutes;
