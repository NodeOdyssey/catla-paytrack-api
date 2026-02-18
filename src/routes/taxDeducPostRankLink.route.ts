// Import controllers
import {
  createTaxDeductionPostRankLink,
  viewAllTaxDeductionPostRankLinks,
  deleteTaxDeductionPostRankLink,
  getTaxDeductionsByPostId,
} from "../controllers/taxDeducPostRankLink.controller";

// Import middlewares
import { validateCreateTaxDeductionPostRankLinkRequestBody } from "../middlewares/validators/taxDeducPostRankLink.validator";
import { verifyToken } from "../middlewares/authenticator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";

// Import types
import { Application } from "express";

// Tax Deduction Post Rank Link APIs
const taxDeductionPostRankLinkRoutes = (app: Application) => {
  // API for creating a record
  app.post(
    "/paytrack/api/v1/post-rank/:postRankLinkId/link-tax/:taxDeductionID",
    [
      verifyToken,
      // validateNotEmptyRequestBody,
      // ...validateCreateTaxDeductionPostRankLinkRequestBody,
    ],
    createTaxDeductionPostRankLink,
  );

  // API for viewing all tax slabs linked with a post
  app.get(
    "/paytrack/api/v1/posts/:postId/tax-deduction",
    getTaxDeductionsByPostId,
  );

  // API for viewing all records
  app.get(
    "/paytrack/api/v1/tax-deduction-post-rank-link",
    [verifyToken],
    viewAllTaxDeductionPostRankLinks,
  );

  // API for deleting a record
  app.delete(
    "/paytrack/api/v1/tax-and-deduction/:taxDeductionPostRankLinkId",
    [verifyToken],
    deleteTaxDeductionPostRankLink,
  );
};

export default taxDeductionPostRankLinkRoutes;
