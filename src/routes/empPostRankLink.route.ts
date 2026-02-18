// Import npm modules
import { Application } from "express";

// Import controllers
import {
  createEmpPostRankLink,
  // getEmpPostRankLink,
  // updateEmpPostRankLink,
  dischargeEmployee,
  transferEmpPostRankLink,
  getEmployeesByPostId,
  getMostRecentEmpPostRankLinkByEmpId,
  promoteEmpPostRankLink,
  resignEmployee,
  abscondEmployee,
} from "../controllers/empPostRankLink.controller";

// Import middlewares
import { verifyToken } from "../middlewares/authenticator";
import {
  validateCreateEmpPostRankLinkRequestBody,
  validateUpdateEmpPostRankLinkRequestBody,
} from "../middlewares/validators/empPostRankLink.validator";

// APIs
const empPostRankLinkRoutes = (app: Application) => {
  // Create an employee post rank link
  app.post(
    "/paytrack/api/v1/emp/:empTableID/link-postrank/:postRankLinkID",
    [verifyToken, ...validateCreateEmpPostRankLinkRequestBody],
    createEmpPostRankLink,
  );

  // // Get an employee post rank link by ID
  // app.get(
  //   "/paytrack/api/v1/empPostRankLinks/:id",
  //   [verifyToken],
  //   getEmpPostRankLink,
  // );

  // // Update an employee post rank link by ID
  // app.patch(
  //   "/paytrack/api/v1/empPostRankLinks/:id",
  //   [verifyToken, ...validateUpdateEmpPostRankLinkRequestBody],
  //   updateEmpPostRankLink,
  // );

  // Get an employee recent post rank link by employee ID
  app.get(
    "/paytrack/api/v1/empPostRankLink/:empTableId",
    [verifyToken],
    getMostRecentEmpPostRankLinkByEmpId,
  );

  // Delete an employee post rank link by ID
  app.delete(
    "/paytrack/api/v1/emp/:empTableId/unlink-postrank/:postRankLinkId/:dateOfDischarge",
    [verifyToken],
    dischargeEmployee,
  );

  // Transfer an employee post rank link
  app.patch(
    "/paytrack/api/v1/emp/:empTableId/transfer/:postRankLinkId",
    [verifyToken],
    transferEmpPostRankLink,
  );

  // Get employees by post ID
  app.get(
    "/paytrack/api/v1/empPostRankLinks/:postId",
    [verifyToken],
    getEmployeesByPostId,
  );

  // Promote an employee post rank link
  app.patch(
    "/paytrack/api/v1/emp/:empTableId/promote/:postRankLinkId",
    [verifyToken],
    promoteEmpPostRankLink,
  );

  // Mark as resigned an employee post rank link by ID
  app.delete(
    "/paytrack/api/v1/emp/:empTableId/resign/:postRankLinkId/:dateOfResignation",
    [verifyToken],
    resignEmployee,
  );

  // Mark as absconded an employee post rank link by ID
  app.delete(
    "/paytrack/api/v1/emp/:empTableId/abscond/:postRankLinkId/:dateOfAbsconding",
    [verifyToken],
    abscondEmployee,
  );
};

export default empPostRankLinkRoutes;
