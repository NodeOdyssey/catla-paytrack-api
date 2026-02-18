import { Request, Response } from "express";
import {
  HeadObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { upload } from "../configs/multer.config";
import { s3Client } from "../configs/aws.config";
import logger from "../helpers/logger";
import { db } from "../configs/db.config";

// Utility function to handle S3 operations
const handleS3Upload = async (entityType: string, name: string) => {
  const directory = `${entityType}/${name}`;
  const params = { Bucket: "pscpl-paytrack", Key: `${directory}/` };

  console.log("directory in s3 upload controller:::::::: ", directory);
  try {
    await s3Client.send(new HeadObjectCommand(params));
  } catch (error: any) {
    if (error.name === "NotFound" || error.$metadata.httpStatusCode === 404) {
      await s3Client.send(new PutObjectCommand({ ...params, Body: "" }));
    }
  }
};

// Utility function to handle S3 file deletion
const handleS3Delete = async (fileUrl: string) => {
  if (!fileUrl) return;

  try {
    // Extract the key from the S3 URL
    // URL format: https://bucket-name.s3.region.amazonaws.com/entityType/name/filename
    const urlParts = fileUrl.split("/");
    const key = urlParts.slice(-3).join("/"); // Get the last 3 parts: entityType/name/filename

    const params = {
      Bucket: "pscpl-paytrack",
      Key: key,
    };

    await s3Client.send(new DeleteObjectCommand(params));
    console.log(`File deleted from S3: ${key}`);
  } catch (error) {
    console.error("Error deleting file from S3:", error);
    // Don't throw error here, just log it - deletion should not fail the whole operation
  }
};

// Reset file fields in request body
const resetFileFields = (body: any) => {
  body.docGst = "";
  body.docContract = "";
  body.docPan = "";
  body.docAadhaar = "";
  body.docOther = "";
  body.docResume = "";
  body.profilePhoto = "";
  body.docAttendance = "";
};

// Controller for uploading post files
export const uploadPostFiles = [
  upload.fields([
    { name: "docGst", maxCount: 1 },
    { name: "docContract", maxCount: 1 },
    { name: "docPan", maxCount: 1 },
    { name: "docOther", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as {
        [fieldname: string]: Express.MulterS3.File[];
      };

      // const postName = req.body.postName;
      const { postId } = req.params;

      const post = await db.post.findUnique({
        where: { ID: parseInt(postId) },
      });

      if (!post) {
        return res.status(404).send({
          status: 404,
          success: false,
          message: "Post not found.",
        });
      }

      const postName = post.postName.replace(/&amp;/g, "&");

      if (!postId) {
        return res.status(400).send({
          status: 400,
          success: false,
          message: "Invalid request. Please specify a postId.",
        });
      }
      if (!postName) {
        return res.status(400).send({
          status: 400,
          success: false,
          message: "Invalid request. Please specify a postName.",
        });
      }

      await handleS3Upload("posts", postName.replace(/&amp;/g, "&"));

      const s3Urls = Object.keys(files).reduce(
        (acc, key) => {
          acc[key] = files[key]
            ? decodeURIComponent(files[key][0].location)
            : "";
          return acc;
        },
        {} as { [key: string]: string },
      );

      Object.assign(req.body, s3Urls);

      // Update database with S3 URLs
      const updatedPost = await db.post.update({
        where: { ID: parseInt(postId) },
        data: {
          docContract: s3Urls["docContract"],
          docGst: s3Urls["docGst"],
          docPan: s3Urls["docPan"],
          docOther: s3Urls["docOther"],
        },
      });
      return res.status(200).send({
        status: 200,
        success: true,
        updatedPost,
        message: "Post files uploaded successfully.",
      });
    } catch (error) {
      logger.error("Error uploading post documents.", error);
      resetFileFields(req.body);
      return res.status(500).send({
        message:
          "Image storage failed due to server error. Please try uploading later.",
      });
    }
  },
];

// Controller for uploading employee files
export const uploadEmployeeFiles = [
  upload.fields([
    { name: "docContract", maxCount: 1 },
    { name: "docResume", maxCount: 1 },
    { name: "docPan", maxCount: 1 },
    { name: "docOther", maxCount: 1 },
    { name: "profilePhoto", maxCount: 1 },
    { name: "docAadhaar", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    console.log("req.body in s3 upload controller :::::::::::::::", req.body);
    try {
      const files = req.files as {
        [fieldname: string]: Express.MulterS3.File[];
      };

      console.log("What are the files: ", JSON.stringify(files));
      // const empName = req.body.empName;
      const { empTableId } = req.params;

      const employee = await db.employee.findUnique({
        where: { ID: parseInt(empTableId) },
      });

      if (!employee) {
        return res.status(404).send({
          status: 404,
          success: false,
          message: "Employee not found.",
        });
      }

      const empName = `${employee.empName}_${employee.ID}`;

      if (!empName) {
        return res
          .status(400)
          .send({ message: "Invalid request. Please specify an empName." });
      }

      await handleS3Upload("employees", empName);

      const s3Urls = Object.keys(files).reduce(
        (acc, key) => {
          acc[key] = files[key]
            ? decodeURIComponent(files[key][0].location)
            : "";
          return acc;
        },
        {} as { [key: string]: string },
      );

      Object.assign(req.body, s3Urls);

      // Update database with S3 URLs
      const updatedEmployee = await db.employee.update({
        where: { ID: parseInt(empTableId) },
        data: {
          docContract: s3Urls["docContract"],
          docResume: s3Urls["docResume"],
          docPan: s3Urls["docPan"],
          docOther: s3Urls["docOther"],
          profilePhoto: s3Urls["profilePhoto"],
          docAadhaar: s3Urls["docAadhaar"],
        },
      });

      return res.status(200).send({
        status: 200,
        success: true,
        updatedEmployee,
        profilePhotoUrl: s3Urls["profilePhoto"] || "",
        message: "Employee files uploaded successfully.",
      });
    } catch (error) {
      logger.error("Error uploading employee documents.", error);
      resetFileFields(req.body);
      return res.status(500).send({
        message:
          "Image storage failed due to server error. Please try uploading later.",
      });
    }
  },
];

// Controller for deleting employee files
export const deleteEmployeeFile = async (req: Request, res: Response) => {
  try {
    const { empTableId, fieldName } = req.params;

    if (!fieldName) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Field name is required.",
      });
    }

    // Validate fieldName to prevent SQL injection and ensure it's a valid document field
    const validFields = [
      "docContract",
      "docResume",
      "docPan",
      "docAadhaar",
      "docOther",
      "profilePhoto",
    ];
    if (!validFields.includes(fieldName)) {
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Invalid field name.",
      });
    }

    const employee = await db.employee.findUnique({
      where: { ID: parseInt(empTableId) },
    });

    if (!employee) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Employee not found.",
      });
    }

    // Get the current file URL
    const currentFileUrl = employee[
      fieldName as keyof typeof employee
    ] as string;

    // Delete file from S3 if it exists
    if (currentFileUrl) {
      await handleS3Delete(currentFileUrl);
    }

    // Update database to set the field to null
    const updateData = { [fieldName]: null } as any;
    const updatedEmployee = await db.employee.update({
      where: { ID: parseInt(empTableId) },
      data: updateData,
    });

    return res.status(200).send({
      status: 200,
      success: true,
      updatedEmployee,
      message: "Employee file deleted successfully.",
    });
  } catch (error) {
    logger.error("Error deleting employee file.", error);
    return res.status(500).send({
      message:
        "File deletion failed due to server error. Please try again later.",
    });
  }
};

// Controller for uploading employee files
export const uploadAttendanceFiles = [
  upload.fields([{ name: "docAttendance", maxCount: 1 }]),
  async (req: Request, res: Response) => {
    console.log(
      "req.body in s3 upload attendance controller :::::::::::::::",
      req.body,
    );
    try {
      const files = req.files as {
        [fieldname: string]: Express.MulterS3.File[];
      };
      // const empName = req.body.empName;
      const { postId, month, year } = req.params;

      const attendances = await db.attendance.findMany({
        where: {
          month: parseInt(month),
          year: parseInt(year),
          EmpPostRankLink: {
            PostRankLink: {
              postId: parseInt(postId),
            },
          },
        },
        include: {
          EmpPostRankLink: {
            include: {
              PostRankLink: { include: { Post: true } },
            },
          },
        },
      });
      // console.log(
      //   "attendances in s3 upload controller :::::::::::::::",
      //   attendances,
      // );

      if (!attendances) {
        return res.status(404).send({
          status: 404,
          success: false,
          message: "Attendances not found.",
        });
      }

      const attendanceName = `${attendances[0].EmpPostRankLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}/${attendances[0].year}/${new Date(
        attendances[0].year,
        attendances[0].month - 1,
      ).toLocaleString("default", { month: "long" })}`;

      if (!attendanceName) {
        return res.status(400).send({
          message: "Invalid request. Please specify an attendanceName.",
        });
      }

      await handleS3Upload("attendances", attendanceName);

      const s3Urls = Object.keys(files).reduce(
        (acc, key) => {
          acc[key] = files[key]
            ? decodeURIComponent(files[key][0].location)
            : "";
          return acc;
        },
        {} as { [key: string]: string },
      );

      Object.assign(req.body, s3Urls);

      // Update database with S3 URLs
      const updatedAttendances = await db.attendance.updateMany({
        where: {
          month: parseInt(month),
          year: parseInt(year),
          EmpPostRankLink: {
            PostRankLink: {
              postId: parseInt(postId),
            },
          },
        },
        data: {
          docAttendance: s3Urls["docAttendance"],
        },
      });

      console.log(
        "updatedAttendances in s3 upload attendance controller:::::",
        updatedAttendances,
      );
      return res.status(200).send({
        status: 200,
        success: true,
        updatedAttendances,
        docAttendance: s3Urls["docAttendance"],
        message: "Attendance file uploaded successfully.",
      });
    } catch (error) {
      logger.error("Error uploading attendance document.", error);
      resetFileFields(req.body);
      return res.status(500).send({
        message:
          "Image storage failed due to server error. Please try uploading later.",
      });
    }
  },
];
