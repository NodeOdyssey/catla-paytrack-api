// Import controllers
import {
  login,
  logout,
  signUp,
  sendResetPasswordEmail,
  setNewPassword,
  verifyAuthToken,
} from "../controllers/auth.controller";

// Import middlewares
import {
  validateLoginRequestBody,
  validateSignupRequestBody,
  validateSendResetPasswordEmailRequest,
  validateResetPasswordRequest,
} from "../middlewares/validators/auth.validator";
import { validateNotEmptyRequestBody } from "../middlewares/validators/emptyRequest.validator";

// Import types
import { Application } from "express";

// APIs
const authRoutes = (app: Application) => {
  // API for user sign up
  app.post(
    "/paytrack/api/v1/auth/signup",
    validateNotEmptyRequestBody,
    validateSignupRequestBody,
    signUp,
  );

  // API for user sign in
  app.post(
    "/paytrack/api/v1/auth/login",
    validateNotEmptyRequestBody,
    validateLoginRequestBody,
    login,
  );

  // API for user sign out
  app.post("/paytrack/api/v1/auth/logout", logout);

  // API for sending password reset email
  app.post(
    "/paytrack/api/v1/auth/send-reset-password-email",
    validateSendResetPasswordEmailRequest,
    sendResetPasswordEmail,
  );

  // API for setting new password
  app.post(
    "/paytrack/api/v1/auth/set-new-password/:resetToken",
    // validateResetPasswordRequest,
    setNewPassword,
  );

  // API for verifying the reset token
  app.post("/paytrack/api/v1/auth/verify/:authToken", verifyAuthToken);
};

export default authRoutes;
