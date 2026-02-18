// Import controllers
import {
  createLinkRankToPost,
  updateLinkRankToPost,
  viewAllRanksLinkedToPost,
  deleteLinkRankToPost,
} from "../controllers/postRankLink.controller";

// Import middlewares
import {
  validateCreatePostRankLinkRequestBody,
  validateUpdatePostRankLinkRequestBody,
} from "../middlewares/validators/postRankLink.validator";
import { verifyToken } from "../middlewares/authenticator";

// Import types
import { Application } from "express";

// APIs
const postRankLinkRoutes = (app: Application) => {
  // API for creating link rank to a post
  app.post(
    "/paytrack/api/v1/posts/:postId/link-rank/:rankId",
    [verifyToken, ...validateCreatePostRankLinkRequestBody],
    createLinkRankToPost,
  );

  // API for updating link rank to a post
  app.patch(
    "/paytrack/api/v1/posts/update-rank/:postRankLinkId",
    [verifyToken, ...validateUpdatePostRankLinkRequestBody],
    updateLinkRankToPost,
  );

  // API for viewing all ranks linked to a post
  app.get(
    "/paytrack/api/v1/posts/:postId/link-rank",
    [verifyToken],
    viewAllRanksLinkedToPost,
  );

  // API for deleting link rank from a post
  app.delete(
    "/paytrack/api/v1/posts/unlink-rank/:postRankLinkId",
    [verifyToken],
    deleteLinkRankToPost,
  );
};

export default postRankLinkRoutes;
