// import multer from "multer";
// import multerS3 from "multer-s3";
// import { Request } from "express"; // Import Request type
// import { bucketName, s3Client } from "./aws.config";

// if (!bucketName) {
//   throw new Error("S3_BUCKET_NAME environment variable is not set");
// }

// // Multer S3 Configuration without ACL
// export const upload = multer({
//   storage: multerS3({
//     s3: s3Client,
//     bucket: bucketName,

//     metadata: (req, file, cb) => {
//       cb(null, { fieldName: file.fieldname });
//     },
//     key: (req: Request, file, cb) => {
//       const isPost = !!req.body.postName;
//       const isEmployee = !!req.body.empName;

//       console.log(
//         "req.body in upload config :::::::::::::::",
//         JSON.stringify(req.body),
//       );
//       console.log("file in upload config :::::::::::::::", file);
//       if (!isPost && !isEmployee) {
//         return cb(
//           new Error("Invalid request. Please specify a postName or empName."),
//         );
//       }

//       const name = isPost ? req.body.postName : req.body.empName;
//       let fileName = file.originalname;
//       let suffix = "";
//       if (file.fieldname.includes("doc")) {
//         suffix = file.fieldname.split("doc")[1].toLowerCase(); // Extract suffix based on fieldname
//       } else {
//         suffix = file.fieldname;
//       }
//       const directory = isPost ? `posts/${name}` : `employees/${name}`;
//       fileName = `${name}_${suffix}${file.originalname.substring(file.originalname.lastIndexOf("."))}`;

//       cb(null, `${directory}/${fileName}`);
//     },
//   }),
// });

import multer from "multer";
import multerS3 from "multer-s3";
import { Request } from "express";
import { bucketName, s3Client } from "./aws.config";
import { db } from "../configs/db.config";

if (!bucketName) {
  throw new Error("S3_BUCKET_NAME environment variable is not set");
}

export const upload = multer({
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB file size limit
  },
  storage: multerS3({
    s3: s3Client,
    bucket: bucketName,

    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: async (req: Request, file, cb) => {
      console.log("req.params in upload config :::::::::::::::", req.params);
      try {
        const isPost = !!req.params.postId && !req.params.month;
        const isEmployee = !!req.params.empTableId;
        const isAttendance = !!req.params.month && !!req.params.year;

        console.log(
          "isPost, isEmployee, isAttendance in upload config :::::::::::::::",
          isPost,
          isEmployee,
          isAttendance,
        );
        if (!isPost && !isEmployee && !isAttendance) {
          return cb(
            new Error(
              "Invalid request. Please specify a postId or empTableId.",
            ),
          );
        }

        let name;
        if (isPost) {
          const post = await db.post.findUnique({
            where: { ID: parseInt(req.params.postId) },
          });
          if (!post) {
            return cb(new Error("Post not found."));
          }
          name = post.postName;
        } else if (isEmployee) {
          const employee = await db.employee.findUnique({
            where: { ID: parseInt(req.params.empTableId) },
          });
          if (!employee) {
            return cb(new Error("Employee not found."));
          }
          name = employee.empName + "_" + employee.ID;
        } else if (isAttendance) {
          const attendances = await db.attendance.findMany({
            // where: { ID: parseInt(req.params.attendanceId) },
            where: {
              month: parseInt(req.params.month),
              year: parseInt(req.params.year),
              EmpPostRankLink: {
                PostRankLink: {
                  postId: parseInt(req.params.postId),
                },
              },
            },
            include: {
              EmpPostRankLink: {
                include: {
                  Employee: true,
                  PostRankLink: { include: { Post: true } },
                },
              },
            },
          });
          if (!attendances) {
            return cb(new Error("Attendance not found."));
          }
          name =
            attendances[0].EmpPostRankLink.PostRankLink.Post.postName +
            "/" +
            attendances[0].year +
            "/" +
            new Date(
              attendances[0].year,
              attendances[0].month - 1,
            ).toLocaleString("default", { month: "long" });
        }

        let fileName = file.originalname;
        let suffix = "";
        if (file.fieldname.includes("doc")) {
          suffix =
            file.fieldname.split("doc")[1].charAt(0).toUpperCase() +
            file.fieldname.split("doc")[1].slice(1).toLowerCase();
        } else {
          suffix =
            file.fieldname.charAt(0).toUpperCase() +
            file.fieldname.slice(1).toLowerCase();
        }
        console.log("suffix in upload config :::::::::::::::", suffix);
        console.log(
          "file.fieldname in upload config :::::::::::::::",
          file.fieldname,
        );
        console.log("name in upload config :::::::::::::::", name);
        // const directory = isPost
        //   ? `posts/${name}`
        //   : isAttendance
        //     ? `attendances/${name}`
        //     : `employees/${name}`;
        let directory = "";
        if (isPost) {
          directory = `posts/${name}`;
        } else if (isAttendance) {
          directory = `attendances/${name}`;
        } else if (isEmployee) {
          directory = `employees/${name}`;
        } else {
          return cb(new Error("Invalid type."));
        }
        // switch (req.params.type) {
        //   case "post":
        //     directory = `posts/${name}`;
        //     break;
        //   case "employee":
        //     directory = `employees/${name}`;
        //     break;
        //   case "attendance":
        //     directory = `attendances/${name}`;
        //     break;
        //   default:
        //     return cb(new Error("Invalid type."));
        // }

        console.log("directory in upload config :::::::::::::::", directory);
        fileName = `${name?.replace(/\//g, "_")}_${suffix}${file.originalname.substring(file.originalname.lastIndexOf("."))}`;

        cb(null, `${directory}/${fileName}`);
      } catch (error) {
        cb(error);
      }
    },
  }),
});
