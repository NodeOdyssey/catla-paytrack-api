// Import npm modules
import { compareSync, hashSync } from "bcryptjs";
import { JwtPayload, sign, verify } from "jsonwebtoken";
import { Request, Response } from "express";

// Import helpers
import logger from "../helpers/logger";
import { sendMail } from "../helpers/mailer";

// Import database
import { db } from "../configs/db.config";
import { User, status as userStatus } from "@prisma/client";

// Import configs
import { authConfig } from "../configs/auth.config";

// Function for admin signup
const signUp = async (req: Request, res: Response): Promise<Response> => {
  const { name, username, email, password, role } = req.body;

  // Check if salt is set
  if (!authConfig.salt) {
    logger.error("Authentication error: Salt is not set in auth config.");

    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error during user registration.",
    });
  }

  // Check if secret is set
  if (!authConfig.secret) {
    logger.error("Authentication error: Secret is not set in auth config.");

    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error during user registration.",
    });
  }

  // Check if username already exists
  const existingUsername = await db.user.findUnique({
    where: { username: username },
  });

  if (existingUsername) {
    logger.error(`Username ${username} already exists.`);
    return res.status(409).send({
      status: 409,
      success: false,
      field: "username",
      message: `Username ${username} is already taken. Please choose a different one.`,
    });
  }

  // Check if username already exists
  const existingEmail = await db.user.findUnique({
    where: { email: email },
  });

  if (existingEmail) {
    logger.error(`Email ${email} already registered.`);
    return res.status(409).send({
      status: 409,
      success: false,
      message: `Email ${email} already registered.`,
    });
  }

  // Encrypt password
  const passwordHash = hashSync(password, parseInt(authConfig.salt));

  // Fetch and store user data in user object
  const userData = {
    name: name,
    username: username,
    email: email,
    passwordHash: passwordHash,
    role: role,
    status: userStatus.Active,
  };

  // Create user
  try {
    const userCreated = await db.user.create({
      data: userData,
    });

    const { passwordHash: _, ...userWithoutPassword } = userCreated;

    logger.info(
      `${userWithoutPassword.role} ${userWithoutPassword.name} created.`,
    );

    // Issue jwt token and add user name and email to payload
    const token = sign(
      {
        id: userCreated.ID,
        username: userCreated.username,
        role: userCreated.role,
        email: userCreated.email,
        purpose: "Authentication",
      },
      authConfig.secret,
      {
        // expiresIn: authConfig.jwtExpiryTime ? authConfig.jwtExpiryTime : "1d",
        expiresIn: "1d",
      },
    );

    return res.status(201).send({
      status: 201,
      success: true,
      message: `${userWithoutPassword.role} ${userWithoutPassword.name} registered.`,
      accessToken: token,
      user: userWithoutPassword,
    });
  } catch (err: any) {
    logger.error("Error while creating user: ", err.message);

    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while registering user.",
    });
  }
};

// Function for user login
const login = async (req: Request, res: Response): Promise<Response> => {
  const { username = "", password, email = "" } = req.body;

  // Check if secret is set
  if (!authConfig.secret) {
    logger.error("Authentication error: Secret is not set in auth config.");

    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error during user authentication.",
    });
  }

  try {
    // Fetch user by username
    if ((username && password) || (email && password)) {
      let loginUser: User | null = null;

      if (email.length > 0) {
        loginUser = await db.user.findUnique({
          where: { email: email },
        });
        if (!loginUser) {
          return res.status(404).send({
            status: 404,
            success: false,
            field: "email",
            message: "Email not found.",
          });
        }
      }
      if (username.length > 0) {
        loginUser = await db.user.findUnique({
          where: { username: username },
        });
        if (!loginUser) {
          return res.status(404).send({
            status: 404,
            success: false,
            field: "username",
            message: "Username not found.",
          });
        }
      }

      // Check if user exists
      if (!loginUser) {
        return res.status(404).send({
          status: 404,
          success: false,
          field: "username",
          message: "User not found.",
        });
      } else {
        if (!loginUser.passwordHash) {
          logger.error("User password hash is not found in database.");

          return res.status(500).send({
            status: 500,
            success: false,
            field: "password",
            message: "Internal server error during user authentication.",
          });
        } else {
          // Validate password
          const passwordIsValid = compareSync(password, loginUser.passwordHash);

          if (!passwordIsValid) {
            return res.status(401).send({
              status: 401,
              success: false,
              field: "password",
              message: "Wrong password.",
            });
          }

          // Issue jwt token
          const token = sign(
            {
              id: loginUser.ID,
              username: loginUser.username,
              role: loginUser.role,
              email: loginUser.email,
              profilePhoto: loginUser.profilePhoto,
              purpose: "Authentication",
            },
            authConfig.secret,
            {
              // expiresIn: authConfig.jwtExpiryTime
              //   ? authConfig.jwtExpiryTime
              //   : "1d",
              expiresIn: "1d",
            },
          );

          const { passwordHash: _, ...userWithoutPassword } = loginUser;

          logger.info(
            `${userWithoutPassword.role} ${userWithoutPassword.name} logged in.`,
          );

          return res.status(200).send({
            status: 200,
            success: true,
            message: `${userWithoutPassword.role} ${userWithoutPassword.name} logged in.`,
            accessToken: token,
            user: userWithoutPassword,
          });
        }
      }
    } else {
      return res.status(404).send({
        status: 404,
        success: false,
        field: "username or password",
        message: "Username or password is missing.",
      });
    }
  } catch (err: any) {
    logger.error("Error during user authentication: ", err.message);
    return res.status(500).send({
      status: 500,
      success: false,
      field: "password",
      message: "Internal server error during user authentication.",
    });
  }
};

// Function for user logout
const logout = async (req: Request, res: Response): Promise<Response> => {
  const token = req.headers["x-access-token"] as string;
  if (!token) {
    logger.error("Token is required for logout.");

    return res.status(400).send({
      status: 400,
      success: false,
      field: "token",
      message: "Token is required for logout.",
    });
  }

  try {
    // Check if secret is set
    if (!authConfig.secret) {
      logger.error("Authentication error: Secret is not set in auth config.");
      return res.status(500).send({
        status: 500,
        success: false,
        message: "Internal server error during user logout.",
      });
    }

    // Verify the token to get the user info
    const decodedToken = verify(token, authConfig.secret) as JwtPayload;

    // Check if the token is blacklisted
    const tokenIsBlacklisted = await db.tokenBlacklist.findFirst({
      where: { token: token },
    });

    // If the token is blacklisted, return an error
    if (tokenIsBlacklisted) {
      logger.error("Token is blacklisted.");

      return res.status(401).send({
        status: 401,
        success: false,
        field: "token",
        message: "Token is expired. Please login again.",
      });
    }

    // Add the token to the blacklist
    await db.tokenBlacklist.create({
      data: { token: token },
    });

    // Update user's status to inactive
    await db.user.update({
      where: { username: decodedToken.username },
      data: { status: userStatus.Inactive },
    });

    logger.info(`${decodedToken.role} ${decodedToken.name} logged out.`);

    return res.status(200).send({
      status: 200,
      success: true,
      message: `${decodedToken.name}' logged out successfully.`,
    });
  } catch (err: any) {
    logger.error("Error during user logout: ", err.message);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error during user logout.",
    });
  }
};

// Function for sending a password reset email
const sendResetPasswordEmail = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await db.user.findUnique({ where: { email: email } });
    if (!user) {
      logger.error(`User with email ${email} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        field: "email",
        message: "User with this email does not exist.",
      });
    }
    logger.info(`User query completed. Result: ${user}`);

    // Generate a reset token
    const resetToken = sign(
      {
        id: user.ID,
        email: user.email,
        purpose: "PasswordReset",
      },
      authConfig.secret as string,
      {
        expiresIn: "1h", // Token expires in 1 hour
      },
    );

    // Send email
    // const resetLink = `${req.protocol}://${req.get("host")}/pscpl/api/v1/auth/set-new-password?resetToken=${resetToken}`;
    const resetLink = `http://localhost:5173/auth/set-new-password?resetToken=${resetToken}`;
    const subject = "Password Reset Request";
    const text = `Hello ${user.username},\n\nYou requested for a password reset. Click the link below to reset your password:\n\n${resetLink}\n\nIf you did not request this, please ignore this email.\n\nThank you!`;
    await sendMail(user.email as string, subject, text);

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Password reset email sent successfully.",
    });
  } catch (error) {
    logger.error(`Error sending password reset email: ${error}`);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while sending password reset email.",
    });
  }
};

// Function for resetting the password
const setNewPassword = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { resetToken } = req.params;
  const { newPassword } = req.body;

  try {
    // Verify the resetToken
    const decoded = verify(
      resetToken,
      authConfig.secret as string,
    ) as JwtPayload;

    // Check if user exists
    const user = await db.user.findUnique({ where: { ID: decoded.id } });
    if (!user) {
      logger.error("User not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "User not found.",
      });
    }

    // Check if the reset token is valid
    if (decoded.purpose !== "PasswordReset") {
      return res.status(403).send({
        status: 403,
        success: false,
        message: "Invalid reset token. Please try again.",
      });
    }

    // Encrypt the new password
    const passwordHash = hashSync(
      newPassword,
      parseInt(authConfig.salt as string),
    );

    // Update the user's password
    await db.user.update({
      where: { ID: user.ID },
      data: { passwordHash: passwordHash },
    });

    logger.info(`Password for user ${user.username} has been reset.`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Password has been reset successfully.",
    });
  } catch (error) {
    logger.error(`Error resetting password: ${error}`);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while resetting password.",
    });
  }
};

const verifyAuthToken = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { authToken } = req.params;
  try {
    // Verify the authToken
    const decoded = verify(
      authToken,
      authConfig.secret as string,
    ) as JwtPayload;

    if (decoded.purpose !== "Authentication") {
      return res.status(403).send({
        status: 403,
        success: false,
        message: "Invalid reset token. Please try again.",
      });
    }

    logger.info(`Token verified successfully. ID: ${decoded.id}`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Token verified successfully.",
    });
  } catch (error) {
    logger.error(`Error verifying reset token: ${error}`);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while verifying reset token.",
    });
  }
};

export {
  signUp,
  login,
  logout,
  sendResetPasswordEmail,
  setNewPassword,
  verifyAuthToken,
};
