import { Application } from "express";

import { verifyToken } from "../middlewares/authenticator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";
import {
  generateInvoice,
  getInvoiceById,
  getInvoiceStats,
} from "../controllers/invoice.controller";

const invoiceRoutes = (app: Application) => {
  app.get(
    "/paytrack/api/v1/invoices/stats/:postId/:month/:year",
    [verifyToken],
    getInvoiceStats,
  );

  app.post(
    "/paytrack/api/v1/invoices/generate",
    [verifyToken, validateNotEmptyRequestBody],
    generateInvoice,
  );

  app.get("/paytrack/api/v1/invoices/:invoiceId", [verifyToken], getInvoiceById);
};

export default invoiceRoutes;
