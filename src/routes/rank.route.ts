// Import controllers
import {
  createRank,
  getAllRanks,
  updateRank,
  getRankById,
  deleteRank,
} from "../controllers/rank.controller";

// Import middlewares
import {
  validateCreateRankRequestBody,
  validateUpdateRankRequestBody,
} from "../middlewares/validators/rank.validator";
import { verifyToken } from "../middlewares/authenticator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";

// Import types
import { Application } from "express";

// APIs
const rankRoutes = (app: Application) => {
  // API for updating a rank
  app.patch(
    "/paytrack/api/v1/ranks/:id",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateUpdateRankRequestBody,
    ],
    updateRank,
  );

  // API for creating a rank
  app.post(
    "/paytrack/api/v1/ranks",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateCreateRankRequestBody,
    ],
    createRank,
  );

  // API for getting all ranks
  app.get("/paytrack/api/v1/ranks", [verifyToken], getAllRanks);

  // API for getting a rank by ID
  app.get("/paytrack/api/v1/ranks/:id", [verifyToken], getRankById);

  // API for deleting a rank
  app.delete("/paytrack/api/v1/ranks/:id", [verifyToken], deleteRank);
};

export default rankRoutes;
