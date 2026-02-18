import nodemailer from "nodemailer";
import logger from "./logger";
import { mailConfig } from "../configs/mail.config";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: mailConfig.user,
    pass: mailConfig.pass,
  },
});

export const sendMail = async (to: string, subject: string, text: string) => {
  const mailOptions = {
    from: mailConfig.from,
    to,
    subject,
    text,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    // logger.error(`Error sending email to ${to}: ${error.message}`);
    throw new Error(`Error sending email to ${to}: ${error}`);
  }
};
