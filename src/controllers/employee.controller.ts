// Import npm modules
import { Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Import helpers
import logger from "../helpers/logger";

// Import database
import { db } from "../configs/db.config";
import { empStatus } from "@prisma/client";

import { fetchImageAsBase64 } from "../helpers/aws";

// Function for creating an employee
const createEmployee = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const {
    empId,
    empName,
    fatherName,
    motherName,
    gender,
    dob,
    phoneNum,
    altPhoneNum,
    villTown,
    postOffice,
    policeStation,
    district,
    pinCode,
    state,
    qualification,
    height,
    bloodGroup,
    idMark,
    // applyDate,
    // altPhoneNum,
    bankName,
    accNum,
    ifsc,
    epfNo,
    esiNo,
    pan,
    aadhaarNo,
    docContract,
    docResume,
    docPan,
    docOther,
    docAadhaar,
    dateOfJoining,
    // docAddProof,
    // uan,
    profilePhoto,
    remarks,
    dateOfRejoining,
  } = req.body;

  // Convert date strings to Date objects
  const dobConverted = new Date(dob);
  // const applyDateConverted = new Date(applyDate);

  // Check for duplicates
  const duplicateChecks = [
    {
      father: empName,
      field: "empName",
      value: empName,
      name: "Employee Name",
    },
    { field: "accNum", value: accNum, name: "Bank Account Number" },
    { field: "pan", value: pan, name: "PAN Number" },
    { field: "aadhaarNo", value: aadhaarNo, name: "Aadhaar Number" },
    { field: "esiNo", value: esiNo, name: "ESI Number" },
    { field: "epfNo", value: epfNo, name: "EPF Number" },
  ];

  const checkDuplicate = async (field: string, value: any) => {
    const existingRecord = await db.employee.findFirst({
      where: {
        [field]: value,
      },
    });
    return !!existingRecord;
  };

  for (const check of duplicateChecks) {
    if (check.value && (await checkDuplicate(check.field, check.value))) {
      logger.error(`${check.name} already exists in the database.`);
      return res.status(409).send({
        status: 409,
        success: false,
        field: check.field,
        message: `This ${check.name} already exists in the database.`,
      });
    }
  }
  const employeeData = {
    empId: empId,
    empName: empName,
    fatherName: fatherName,
    motherName: motherName,
    gender: gender,
    dob: dobConverted,
    phoneNum: phoneNum,
    altPhoneNum: altPhoneNum,
    villTown: villTown,
    postOffice: postOffice,
    policeStation: policeStation,
    district: district,
    pinCode: pinCode,
    state: state,
    qualification: qualification,
    height: height ? parseFloat(height) : null,
    bloodGroup: bloodGroup || null,
    idMark: idMark || null,
    bankName: bankName,
    accNum: accNum || null,
    ifsc: ifsc,
    epfNo: epfNo || null,
    esiNo: esiNo || null,
    pan: pan || null,
    aadhaarNo: aadhaarNo || null,
    docContract: docContract || null,
    docResume: docResume || null,
    docPan: docPan || null,
    docOther: docOther || null,
    docAadhaar: docAadhaar || null,
    profilePhoto: profilePhoto || null,
    dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
    remarks: remarks || null,
    empStatus: empStatus.Active,
    dateOfRejoining: dateOfRejoining ? new Date(dateOfRejoining) : null,
  };
  // Create employee
  // try {
  //   const employeeCreated = await db.employee.create({
  //     data: employeeData,
  //   });

  //   // Generate empId
  //   const empId = `PSC/${employeeCreated.ID}/${employeeCreated.empName[0]}`;

  //   // Update employee with generated empId
  //   const updatedEmployee = await db.employee.update({
  //     where: { ID: employeeCreated.ID },
  //     data: { empId },
  //   });

  //   logger.info(`Employee ${employeeCreated.empName} created.`);
  //   return res.status(201).send({
  //     status: 201,
  //     success: true,
  //     message: `Employee ${employeeCreated.empName} registered.`,
  //     employee: updatedEmployee,
  //   });
  // }
  try {
    // Create the employee
    const employeeCreated = await db.employee.create({
      data: employeeData,
    });

    // Extract the first letter of the employee's name
    const firstLetter = employeeCreated.empName[0].toUpperCase();

    // Query the database for the last created employee with the same first letter in empName
    const lastEmployee = await db.employee.findFirst({
      where: {
        empId: {
          startsWith: `PSC/`, // Ensure we're looking at valid empIds
        },
        empName: {
          startsWith: firstLetter,
        },
      },
      orderBy: {
        ID: "desc", // Get the most recently created record
      },
    });

    // Determine the new ID number
    let newIdNumber = 1; // Start from 1 if no matching record is found
    if (lastEmployee && lastEmployee.empId) {
      const lastIdNumber = parseInt(lastEmployee.empId.split("/")[1], 10); // Extract the numeric part
      if (!isNaN(lastIdNumber)) {
        newIdNumber = lastIdNumber + 1;
      }
    }

    // Generate the new empId
    const empId = `PSC/${newIdNumber}/${firstLetter}`;

    // Update the employee with the generated empId
    const updatedEmployee = await db.employee.update({
      where: { ID: employeeCreated.ID },
      data: { empId },
    });

    logger.info(
      `Employee ${employeeCreated.empName} created with empId: ${empId}.`,
    );
    return res.status(201).send({
      status: 201,
      success: true,
      message: `Employee ${employeeCreated.empName} registered.`,
      employee: updatedEmployee,
    });
  } catch (err: any) {
    logger.error("Error while creating employee: ", err);

    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while registering employee.",
    });
  }
};

// Function for fetching all employees
const getAllEmployees = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const activeEmployees = await db.employee.findMany({
      include: {
        EmpPostRankLink: {
          where: { status: "Active" },
          orderBy: { dateOfPosting: "desc" },
          take: 1,
          include: {
            PostRankLink: {
              include: {
                Post: { select: { postName: true } },
                Rank: { select: { designation: true } },
              },
            },
          },
        },
      },
      orderBy: {
        empName: "asc",
      },
      where: {
        isDeleted: false,
      },
    });

    if (activeEmployees.length === 0) {
      logger.info("No active employees found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No active employees found.",
      });
    }

    activeEmployees.forEach((employee, index) => {
      if (index < 20) {
        console.log(
          "what is length of EmpPostRankLink",
          employee.EmpPostRankLink.length,
        );
        if (employee.EmpPostRankLink.length > 0) {
          employee.EmpPostRankLink.forEach((link) => {
            console.log(
              `Post Name: ${link.PostRankLink.Post.postName.replace(/&amp;/g, "&")}, Rank: ${link.PostRankLink.Rank.designation} Date Of Discharge: ${link.dateOfDischarge} Date Of Resignation: ${link.dateOfResignation} Date Of Absconding: ${link.dateOfAbsconding} `,
            );
          });
        } else {
          console.log("No post rank link found for this employee.");
        }
      }
    });

    const employeeData = activeEmployees.map((employee) => {
      const employeeWithIdCard = employee as any;
      const {
        ID,
        empId,
        empName,
        gender,
        phoneNum,
        bloodGroup,
        dob,
        profilePhoto,
        idMark,
        fatherName,
        salaryAdvance,
        noOfAdvancePayments,
        advanceDetails,
      } = employee;

      const postRankLink = employee.EmpPostRankLink[0]?.PostRankLink;
      const postName =
        postRankLink?.Post?.postName.replace(/&amp;/g, "&") || "";
      const rank = postRankLink?.Rank?.designation || "";
      const isPosted = rank !== "" && postName !== "";
      const empStatus = employee.empStatus;
      const postRankLinkId = postRankLink?.ID || null; // Assuming 'id' is the primary key for PostRankLink
      const dateOfPosting = employee.EmpPostRankLink[0]?.dateOfPosting || null;
      const dateOfAbsconding = employee.dateOfAbsconding || null;
      const dateOfResignation = employee.dateOfResignation || null;
      const dateOfDischarge = employee.dateOfDischarge || null;
      // const bloodGroup = employee.bloodGroup || null;

      return {
        ID,
        empId,
        empName,
        postName,
        rank,
        gender,
        phoneNum,
        isPosted,
        empStatus,
        postRankLinkId,
        dateOfPosting,
        dateOfAbsconding,
        dateOfResignation,
        dateOfDischarge,
        dob,
        profilePhoto,
        idMark,
        fatherName,
        bloodGroup,
        idCardName: employeeWithIdCard.idCardName,
        idCardIssued: employeeWithIdCard.idCardIssued,
        idCardIssueDate: employeeWithIdCard.idCardIssueDate,
        idCardExpiryDate: employeeWithIdCard.idCardExpiryDate,
        salaryAdvance: salaryAdvance ? salaryAdvance.toNumber() : 0,
        noOfAdvancePayments: noOfAdvancePayments ?? 0,
        advanceDetails: Array.isArray(advanceDetails) ? advanceDetails : [],
      };
    });

    // logger.info("Employees retrieved successfully: ", employeeData);
    // employeeData.map((emp, index) => {
    //   if (index < 10) {
    //     console.log(
    //       `Employee ID: ${emp.ID}, Name: ${emp.empName}, Blood Group: ${emp.bloodGroup}, ID Mark: ${emp.idMark}, Status: ${emp.empStatus} `,
    //     );
    //     // console.log(
    //     //   `Post Name: ${emp.postName}, Rank: ${emp.rank} \n Date of Posting: ${emp.dateOfPosting} \n Date of Absconding: ${emp.dateOfAbsconding} \n Date of Resignation: ${emp.dateOfResignation} \n Date of Discharge: ${emp.dateOfDischarge} \n`,
    //     // );
    //     console.log("-----------------------------");
    //   }
    // });

    return res.status(200).send({
      status: 200,
      success: true,
      count: employeeData.length,
      message: `${employeeData.length} employees retrieved successfully.`,
      employees: employeeData,
    });
  } catch (err: any) {
    logger.error("Error while fetching employees: ", err.message);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching employees.",
    });
  }
};

// Function for fetching an employee by ID
// const getEmployeeById = async (
//   req: Request,
//   res: Response,
// ): Promise<Response> => {
//   const { id } = req.params;

//   // Check if employee ID is valid
//   if (!id || isNaN(parseInt(id))) {
//     logger.error("Invalid employee ID.");
//     return res.status(400).send({
//       status: 400,
//       success: false,
//       message: "Invalid employee ID.",
//     });
//   }

//   try {
//     // Fetch the employee by ID
//     const employee = await db.employee.findUnique({
//       where: { ID: parseInt(id) },
//     });

//     // Check if the employee exists
//     if (!employee) {
//       logger.info(`Employee with ID ${id} not found.`);
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         message: `Employee with ID ${id} not found.`,
//       });
//     }

//     // Fetch the image from S3
//     const imageKey = `employees/${employee.empName}_${employee.empId}.jpeg`; // Adjust path and extension as necessary
//     const bucketName = process.env.S3_BUCKET_NAME; // Replace with your actual S3 bucket name
//     if (!bucketName) {
//       throw new Error("S3_BUCKET_NAME environment variable is not set");
//     }
//     const imageBase64 = await fetchImageAsBase64(bucketName, imageKey);

//     logger.info(`Employee with ID ${id} retrieved successfully.`);
//     return res.status(200).send({
//       status: 200,
//       success: true,
//       employee,
//       profilePhoto: `data:image/jpeg;base64,${imageBase64}`,
//     });
//   } catch (err: any) {
//     if (err instanceof Error) {
//       logger.error("Error while fetching employee: ", err.message);
//     } else {
//       logger.error("Error while fetching employee: ", err);
//     }
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message: "Internal server error while fetching employee.",
//     });
//   }
// };

// const getEmployeeById = async (
//   req: Request,
//   res: Response,
// ): Promise<Response> => {
//   const { id } = req.params;

//   if (!id || isNaN(parseInt(id))) {
//     logger.error("Invalid employee ID.");
//     return res.status(400).send({
//       status: 400,
//       success: false,
//       message: "Invalid employee ID.",
//     });
//   }

//   try {
//     const employee = await db.employee.findUnique({
//       where: { ID: parseInt(id) },
//     });

//     if (!employee) {
//       logger.info(`Employee with ID ${id} not found.`);
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         message: `Employee with ID ${id} not found.`,
//       });
//     }

//     const imageKey = `employees/${employee.empName}_${employee.empId}/${employee.empName}_${employee.empId}_profile.png`;
//     const bucketName = process.env.S3_BUCKET_NAME;
//     if (!bucketName) {
//       throw new Error("S3_BUCKET_NAME environment variable is not set");
//     }
//     const imageBase64 = await fetchImageAsBase64(bucketName, imageKey);

//     logger.info(`Employee with ID ${id} retrieved successfully.`);
//     return res.status(200).send({
//       status: 200,
//       success: true,
//       employee,
//       profilePhoto: imageBase64
//         ? `data:image/jpeg;base64,${imageBase64}`
//         : null,
//     });
//   } catch (err) {
//     if (err instanceof Error) {
//       logger.error("Error while fetching employee: ", err.message);
//     } else {
//       logger.error("Error while fetching employee: ", err);
//     }
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message: "Internal server error while fetching employee.",
//     });
//   }
// };
const getEmployeeById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  console.log("id in get employee by id controller", id);
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid employee ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid employee ID.",
    });
  }

  try {
    const employee = await db.employee.findUnique({
      where: { ID: parseInt(id) },
      include: {
        EmpPostRankLink: {
          where: { status: "Active" },
          orderBy: { dateOfPosting: "desc" },
          take: 1,
          include: {
            PostRankLink: {
              include: { Rank: { select: { designation: true } } },
            },
          },
        },
      },
    });

    if (!employee) {
      logger.info(`Employee with ID ${id} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        message: `Employee with ID ${id} not found.`,
      });
    }

    let imageBase64 = null;
    let imageUrl = employee.profilePhoto || null;

    if (employee.profilePhoto) {
      try {
        const url = new URL(employee.profilePhoto);
        const bucket = url.hostname.split(".")[0];
        const key = decodeURIComponent(
          url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname,
        );

        imageBase64 = await fetchImageAsBase64(bucket, key);
      } catch (err) {
        // Log error, but fallback to URL
        logger.warn("Could not fetch image as base64, using URL instead.");
      }
    }

    return res.status(200).send({
      status: 200,
      success: true,
      employee: {
        ...employee,
        rank: employee.EmpPostRankLink[0]?.PostRankLink?.Rank?.designation,
      },
      profile: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUrl, // fallback to URL
    });
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Error while fetching employee: ", err.message);
    } else {
      logger.error("Error while fetching employee: ", err);
    }
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching employee.",
    });
  }
};

const updateIdCardDetails = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { idCardName, idCardIssueDate, idCardExpiryDate } = req.body;

  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid employee ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid employee ID.",
    });
  }

  if (!idCardName || !idCardIssueDate || !idCardExpiryDate) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "idCardName, idCardIssueDate and idCardExpiryDate are required.",
    });
  }

  try {
    const employee = await db.employee.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!employee) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: `Employee with ID ${id} not found.`,
      });
    }

    const updatedEmployee = await (db.employee as any).update({
      where: { ID: parseInt(id) },
      data: {
        idCardName,
        idCardIssued: true,
        idCardIssueDate: new Date(idCardIssueDate),
        idCardExpiryDate: new Date(idCardExpiryDate),
      },
      include: {
        EmpPostRankLink: {
          where: { status: "Active" },
          orderBy: { dateOfPosting: "desc" },
          take: 1,
          include: {
            PostRankLink: {
              include: { Rank: { select: { designation: true } } },
            },
          },
        },
      },
    });

    return res.status(200).send({
      status: 200,
      success: true,
      message: "ID card details updated successfully.",
      employee: {
        ...updatedEmployee,
        rank: updatedEmployee.EmpPostRankLink[0]?.PostRankLink?.Rank
          ?.designation,
      },
    });
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Error while updating id card details: ", err.message);
    } else {
      logger.error("Error while updating id card details: ", err);
    }
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while updating id card details.",
    });
  }
};
// // Function for updating an employee
const updateEmployee = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params; // Assuming empId is passed as a URL parameter

  // Check if employee ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid employee ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid employee ID.",
    });
  }

  const {
    // empId,
    empName,
    fatherName,
    motherName,
    gender,
    dob,
    phoneNum,
    altPhoneNum,
    villTown,
    postOffice,
    policeStation,
    district,
    pinCode,
    state,
    qualification,
    height,
    bloodGroup,
    idMark,
    // applyDate,
    bankName,
    accNum,
    ifsc,
    epfNo,
    esiNo,
    pan,
    aadhaarNo,
    docContract,
    docResume,
    docPan,
    docOther,
    docAadhaar,
    // docAddProof,
    // uan,
    profilePhoto,
    dateOfJoining,
    remarks,
    dateOfRejoining,
  } = req.body;

  console.log("what is the date of joining", dateOfJoining);
  console.log("what is the date of rejoining", dateOfRejoining);
  console.log("what is the date of birth", dob);
  let dobConverted = undefined;
  let applyDateConverted = undefined;

  // Convert date strings to Date objects
  if (dob) {
    dobConverted = new Date(dob);
  }
  // if (applyDate) {
  //   applyDateConverted = new Date(applyDate);
  // }

  // Fetch the existing employee
  const employee = await db.employee.findUnique({
    where: { ID: parseInt(id) },
  });

  if (!employee) {
    logger.error("Employee not found.");
    return res.status(404).send({
      status: 404,
      success: false,
      message: "Employee not found.",
    });
  }

  // // Function to check for existing records
  const checkDuplicate = async (field: string, value: any) => {
    const existingRecord = await db.employee.findFirst({
      where: {
        [field]: value,
        ID: { not: parseInt(id) }, // Exclude the current employee
      },
    });
    return !!existingRecord;
  };

  // Check for duplicates
  const duplicateChecks = [
    { field: "empName", value: empName, name: "Employee Name" },
    { field: "accNum", value: accNum, name: "Bank Account Number" },
    { field: "pan", value: pan, name: "pan Number" },
    { field: "aadhaarNo", value: aadhaarNo, name: "Aadhaar Number" },
    { field: "esiNo", value: esiNo, name: "ESI Number" },
    { field: "epfNo", value: epfNo, name: "EPF Number" },
  ];

  for (const check of duplicateChecks) {
    if (check.value && (await checkDuplicate(check.field, check.value))) {
      logger.error(`${check.name} already exists in the database.`);
      return res.status(409).send({
        status: 409,
        success: false,
        field: check.field,
        message: `This ${check.name} already exists in the database.`,
      });
    }
  }

  // Prepare the updated employee data object
  const updatedEmployeeData = {
    // empId: empId || employee.empId,
    empName: empName || employee.empName,
    fatherName: fatherName || employee.fatherName,
    motherName: motherName,
    gender: gender || employee.gender,
    dob: dobConverted || employee.dob,
    phoneNum: phoneNum || employee.phoneNum,
    villTown: villTown || employee.villTown,
    postOffice: postOffice || employee.postOffice,
    policeStation: policeStation || employee.policeStation,
    district: district || employee.district,
    pinCode: pinCode || employee.pinCode,
    state: state || employee.state,
    qualification: qualification || employee.qualification,
    height: height,
    bloodGroup: bloodGroup || employee.bloodGroup,
    idMark: idMark,
    // applyDate: applyDateConverted || employee.applyDate,
    altPhoneNum: altPhoneNum,
    bankName: bankName,
    accNum: accNum,
    ifsc: ifsc,
    epfNo: epfNo,
    esiNo: esiNo,
    pan: pan,
    aadhaarNo: aadhaarNo,
    docContract: docContract || employee.docContract,
    docResume: docResume || employee.docResume,
    docPan: docPan || employee.docPan,
    docOther: docOther || employee.docOther,
    profilePhoto: profilePhoto || employee.profilePhoto,
    docAadhaar: docAadhaar || employee.docAadhaar,
    dateOfJoining: dateOfJoining || employee.dateOfJoining,
    remarks: remarks,
    // docAddProof: docAddProof || employee.docAddProof,
    // uan: uan || employee.uan,
    dateOfRejoining: new Date(dateOfRejoining) || employee.dateOfRejoining,
  };

  // Update the employee in the database
  try {
    const updatedEmployee = await db.employee.update({
      where: { ID: parseInt(id) },
      data: updatedEmployeeData,
    });

    logger.info(`Employee ${updatedEmployee.empName} updated successfully.`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Employee ${updatedEmployee.empName} updated successfully.`,
      data: updatedEmployee,
    });
  } catch (error) {
    logger.error("Error updating employee.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while updating the employee.",
    });
  }
};

// Function to delete an employee
const deleteEmployee = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  // Check if employee ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid employee ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid employee ID.",
    });
  }

  try {
    // Fetch the existing employee
    const employee = await db.employee.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!employee) {
      logger.error("Employee not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Employee not found.",
      });
    }

    // Delete the employee from the database
    // await db.employee.delete({
    //   where: { ID: parseInt(id) },
    // });
    await db.employee.update({
      where: { ID: parseInt(id) },
      data: { DeletedAt: new Date(), empStatus: "Deleted", isDeleted: true },
    });

    logger.info("Employee deleted successfully.", { id });
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Employee deleted successfully.",
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      logger.error(
        "Cannot delete employee as they are linked to another entity.",
      );
      return res.status(400).send({
        status: 400,
        success: false,
        message:
          "Employee is already posted. Cannot remove employee. Please discharge the employee first.",
      });
    }

    logger.error("Error deleting employee.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while deleting the employee.",
    });
  }
};

// Function to update employee status
const updateEmployeeStatus = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { status } = req.body;

  // Check if employee ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid employee ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid employee ID.",
    });
  }

  try {
    // Update the employee status in the database
    const updatedEmployee = await db.employee.update({
      where: { ID: parseInt(id) },
      data: { empStatus: status },
    });

    logger.info(
      `Employee ${updatedEmployee.empName} status updated successfully.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Employee ${updatedEmployee.empName} status updated successfully.`,
      data: updatedEmployee,
    });
  } catch (error) {
    logger.error("Error updating employee status.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while updating the employee status.",
    });
  }
};

const viewEmployeeHistory = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  // Check if employee ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid employee ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid employee ID.",
    });
  }
  // Check if employee exists
  const employee = await db.employee.findUnique({
    where: { ID: parseInt(id) },
  });
  if (!employee) {
    logger.error("Employee not found.");
    return res.status(404).send({
      status: 404,
      success: false,
      message: "Employee not found.",
    });
  }

  // Fetch all previous employee post rank links
  const employeeHistory = await db.empPostRankLink.findMany({
    where: {
      empTableId: parseInt(id),
      status: { not: "Active" },
    },
    include: {
      Employee: {
        select: {
          ID: true,
          empName: true,
        },
      },
      PostRankLink: {
        include: {
          Post: { select: { postName: true } },
          Rank: { select: { designation: true } },
        },
      },
    },
    orderBy: { dateOfPosting: "desc" },
  });

  employeeHistory.map((emp, index) => {
    console.log(
      `Employee ID: ${emp.ID} | Posting: ${emp.PostRankLink.Post.postName.replace(/&amp;/g, "&")} | Rank: ${emp.PostRankLink.Rank.designation} | Date of Posting: ${emp.dateOfPosting} | Date Of Transfer: ${emp.dateOfTransfer} | Date of Discharge: ${emp.dateOfDischarge} | Date Of Resignation: ${emp.dateOfResignation} | Date Of Absconding: ${emp.dateOfAbsconding}`,
    );
    console.log("-----------------------------");
  });

  // Check if employee history exists
  if (employeeHistory.length === 0) {
    logger.info("No employee history found.");
    return res.status(404).send({
      status: 404,
      success: false,
      // message: "No employee history found.",
      message: "",
      employeeHistory: [],
    });
  }

  const filteredEmployeeHistory = employeeHistory.map((empPostRank) => {
    const postRankLink = empPostRank.PostRankLink;
    return {
      ID: empPostRank.ID,
      empTableId: empPostRank.empTableId,
      empName: empPostRank.Employee.empName,
      postRankLinkId: postRankLink.ID,
      postName: postRankLink.Post.postName.replace(/&amp;/g, "&"),
      rankName: postRankLink.Rank.designation,
      dateOfPosting: empPostRank.dateOfPosting,
      dateOfTransfer: empPostRank.dateOfTransfer,
      dateOfDischarge: empPostRank.dateOfDischarge,
      dateOfResignation: empPostRank.dateOfResignation,
      dateOfAbsconding: empPostRank.dateOfAbsconding,
      status: empPostRank.status,
    };
  });
  console.log("what is the filtered employee history", filteredEmployeeHistory);
  try {
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Employee history retrieved successfully.",
      employeeHistory: filteredEmployeeHistory,
    });
  } catch (error) {
    logger.error("Error fetching employee history.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while fetching employee history.",
    });
  }
};

const generateIdCard = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  console.log("id in get employee by id controller", id);
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid employee ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid employee ID.",
    });
  }

  try {
    const employee = await db.employee.findUnique({
      where: { ID: parseInt(id) },
      include: {
        EmpPostRankLink: {
          where: { status: "Active" },
          orderBy: { dateOfPosting: "desc" },
          take: 1,
          include: {
            PostRankLink: {
              include: { Rank: { select: { designation: true } } },
            },
          },
        },
      },
    });

    console.log("employee:::::::", employee);

    if (!employee) {
      logger.info(`Employee with ID ${id} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        message: `Employee with ID ${id} not found.`,
      });
    }

    let imageBase64 = null;
    let imageUrl = employee.profilePhoto || null;

    if (employee.profilePhoto) {
      try {
        const url = new URL(employee.profilePhoto);
        const bucket = url.hostname.split(".")[0];
        const key = decodeURIComponent(
          url.pathname.startsWith("/") ? url.pathname.slice(1) : url.pathname,
        );

        imageBase64 = await fetchImageAsBase64(bucket, key);
      } catch (err) {
        // Log error, but fallback to URL
        logger.warn("Could not fetch image as base64, using URL instead.");
      }
    }

    const PSCPL_LOGO_URL =
      "https://pscpl-paytrack.s3.ap-south-1.amazonaws.com/assets/PSCPL_Logo_Golden.png";

    const PSCPL_LOGO_BIG_URL =
      "https://pscpl-paytrack.s3.ap-south-1.amazonaws.com/assets/PSCPL_Logo_Golden_Big.png";

    const PSCPL_DIRECTOR_SIGN_URL =
      "https://pscpl-paytrack.s3.ap-south-1.amazonaws.com/assets/Directors_Sign.png";

    const PSCPL_QR_CODE =
      "https://pscpl-paytrack.s3.ap-south-1.amazonaws.com/assets/QR_Code_Square.png";

    const pscplLogo = await fetchImageAsBase64(
      "pscpl-paytrack",
      "assets/PSCPL_Logo_Golden.svg",
    );

    const pscplLogoBig = await fetchImageAsBase64(
      "pscpl-paytrack",
      "assets/PSCPL_Logo_Golden_Big.svg",
    );

    const pscplDirectorSign = await fetchImageAsBase64(
      "pscpl-paytrack",
      "assets/Directors_Sign.svg",
    );
    const qrCode = await fetchImageAsBase64(
      "pscpl-paytrack",
      "assets/QR_Code_Square.svg",
    );

    console.log(
      "pscplLogo",
      pscplLogo ? pscplLogo.slice(0, 100) + "..." : "(empty)",
    );
    console.log(
      "pscplLogoBig",
      pscplLogoBig ? pscplLogoBig.slice(0, 100) + "..." : "(empty)",
    );
    console.log(
      "pscplDirectorSign",
      pscplDirectorSign ? pscplDirectorSign.slice(0, 100) + "..." : "(empty)",
    );
    console.log("qrCode", qrCode ? qrCode.slice(0, 100) + "..." : "(empty)");

    return res.status(200).send({
      status: 200,
      success: true,
      employee: {
        ...employee,
        rank: employee.EmpPostRankLink[0]?.PostRankLink?.Rank?.designation,
      },
      profile: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : imageUrl, // fallback to URL
      pscplLogo: pscplLogo
        ? `data:image/jpeg;base64,${pscplLogo}`
        : PSCPL_LOGO_URL,
      pscplLogoBig: pscplLogoBig
        ? `data:image/jpeg;base64,${pscplLogoBig}`
        : PSCPL_LOGO_BIG_URL,
      pscplDirectorSign: pscplDirectorSign
        ? `data:image/jpeg;base64,${pscplDirectorSign}`
        : PSCPL_DIRECTOR_SIGN_URL,
      qrCode: qrCode ? `data:image/jpeg;base64,${qrCode}` : PSCPL_QR_CODE,

      // pscplLogo: pscplLogo
      //   ? `data:image/jpeg;base64,${pscplLogo}`
      //   : PSCPL_LOGO_URL,
      // pscplDirectorSign: pscplDirectorSign,
      // qrCode: qrCode ? `data:image/jpeg;base64,${qrCode}` : PSCPL_QR_CODE,
    });
  } catch (err) {
    if (err instanceof Error) {
      logger.error("Error while fetching employee: ", err.message);
    } else {
      logger.error("Error while fetching employee: ", err);
    }
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching employee.",
    });
  }
};

export {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateIdCardDetails,
  updateEmployee,
  deleteEmployee,
  updateEmployeeStatus,
  viewEmployeeHistory,
  generateIdCard,
};
