// Import controllers
import {
  createPost,
  getAllPosts,
  updatePost,
  getPostById,
  deletePost,
  deactivatePost,
  reactivatePost,
  updatePostReportType,
} from "../controllers/post.controller";

// Import middlewares
import {
  validateCreatePostRequestBody,
  validateUpdatePostRequestBody,
} from "../middlewares/validators/post.validator";
import { verifyToken } from "../middlewares/authenticator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";

// Import types
import { Application } from "express";

// APIs
const postRoutes = (app: Application) => {
  // API for updating a post
  app.patch(
    "/paytrack/api/v1/posts/:id",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateUpdatePostRequestBody,
    ],
    updatePost,
  );

  // API for creating a post
  app.post(
    "/paytrack/api/v1/posts",
    [
      verifyToken,
      validateNotEmptyRequestBody,
      ...validateCreatePostRequestBody,
    ],
    createPost,
  );

  // API for getting all posts
  app.get("/paytrack/api/v1/posts", [verifyToken], getAllPosts);

  // API for getting a post by ID
  app.get("/paytrack/api/v1/posts/:id", [verifyToken], getPostById);

  // API for deleting a post
  app.delete("/paytrack/api/v1/posts/:id", [verifyToken], deletePost);

  // API for deactivating a post
  app.patch(
    "/paytrack/api/v1/posts/:id/deactivate",
    [verifyToken],
    deactivatePost,
  );

  // API for reactivating a post
  app.patch(
    "/paytrack/api/v1/posts/:id/reactivate",
    [verifyToken],
    reactivatePost,
  );

  // API for updating post report type
  app.patch(
    "/paytrack/api/v1/posts/:postId/report-type",
    [verifyToken, validateNotEmptyRequestBody],
    updatePostReportType,
  );
};

export default postRoutes;
