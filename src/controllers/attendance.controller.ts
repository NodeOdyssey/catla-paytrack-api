import { Request, Response } from "express";
import logger from "../helpers/logger";
import { db } from "../configs/db.config";
import { get } from "http";
import { Payroll } from "@prisma/client";
import { calculatePTax } from "../helpers/functions";

// Function for creating an attendance record
const createAttendance = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { attendanceList } = req.body;
  const { month, year, postId } = req.params;

  if (!attendanceList || !month || !year || !postId) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Missing required parameters.",
    });
  }
  // console.log("attendanceList:", attendanceList);

  try {
    // Check if attendance records already exist for the given postId, month, and year
    const existingAttendances = await db.attendance.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        EmpPostRankLink: {
          PostRankLink: {
            postId: parseInt(postId),
          },
        },
      },
      orderBy: {
        EmpPostRankLink: {
          Employee: {
            empName: "asc",
          },
        },
      },
    });

    if (existingAttendances.length > 0) {
      logger.error(
        "Attendance records already exist for the given post, month, and year.",
      );
      return res.status(409).send({
        status: 409,
        success: false,
        message:
          "Attendance records already exist for the given post, month, and year.",
        attendances: existingAttendances,
      });
    }

    for (const attendance of attendanceList) {
      const {
        empPostRankLinkId,
        daysPresent,
        daysAbsent,
        extraDutyFourHr,
        extraDutyEightHr,
      } = attendance;

      // Verify the employee post rank link
      const empPostRankLink = await db.empPostRankLink.findUnique({
        where: { ID: empPostRankLinkId },
        include: {
          Employee: true,
          PostRankLink: { include: { Post: true, Rank: true } },
        },
      });

      if (!empPostRankLink) {
        logger.error("Employee post rank link not found.");
        return res.status(404).send({
          status: 404,
          success: false,
          message: "Employee post rank link not found.",
        });
      }

      // Create attendance record
      const attendanceData = {
        empPostRankLinkId,
        month: parseInt(month),
        year: parseInt(year),
        daysPresent,
        daysAbsent,
        extraDutyFourHr,
        extraDutyEightHr,
      };

      await db.attendance.create({
        data: attendanceData,
      });
      // createdAttendances.push(createdAttendance);

      logger.info(
        `Attendance for employee ${empPostRankLink.Employee.empName} created.`,
      );
    }

    const createdAttendances = await db.attendance.findMany({
      where: {
        year: parseInt(year),
        month: parseInt(month),
        EmpPostRankLink: {
          PostRankLink: {
            postId: parseInt(postId),
          },
        },
      },
      orderBy: {
        EmpPostRankLink: {
          Employee: {
            empName: "asc",
          },
        },
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: { include: { Rank: true } },
          },
        },
      },
    });

    const createdAttendancesData = createdAttendances.map((attendance) => ({
      ID: attendance.ID,
      empId: attendance.EmpPostRankLink.Employee.empId,
      empPostRankLinkId: attendance.EmpPostRankLink.ID,
      empName: attendance.EmpPostRankLink.Employee.empName,
      rank: attendance.EmpPostRankLink.PostRankLink.Rank.designation,
      month: attendance.month,
      year: attendance.year,
      daysPresent: attendance.daysPresent,
      daysAbsent: attendance.daysAbsent,
      extraDutyFourHr: attendance.extraDutyFourHr,
      extraDutyEightHr: attendance.extraDutyEightHr,
    }));

    return res.status(201).send({
      status: 201,
      success: true,
      message: "Attendance records created successfully.",
      attendances: createdAttendancesData,
    });
  } catch (err: any) {
    logger.error("Error while creating attendance records: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while creating attendance records.",
    });
  }
};

// Function for updating an attendance record
const updateAttendance = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { attendanceList } = req.body;
  const { month, year, postId } = req.params;

  console.log("What is attendance: ", attendanceList);
  if (!attendanceList || !month || !year || !postId) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Missing required parameters.",
    });
  }
  // console.log("attendanceList:", attendanceList);

  try {
    const existingAttendances = await db.attendance.findMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        EmpPostRankLink: {
          PostRankLink: {
            postId: parseInt(postId),
          },
        },
      },
      orderBy: {
        EmpPostRankLink: {
          Employee: {
            empName: "asc",
          },
        },
      },
    });

    if (existingAttendances.length === 0) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No attendance records found to update.",
      });
    }

    for (const attendance of attendanceList) {
      const {
        empPostRankLinkId,
        daysPresent,
        daysAbsent,
        extraDutyFourHr,
        extraDutyEightHr,
      } = attendance;

      const empPostRankLink = await db.empPostRankLink.findUnique({
        where: { ID: empPostRankLinkId },
        include: {
          Employee: true,
          PostRankLink: { include: { Post: true, Rank: true } },
        },
      });

      if (!empPostRankLink) {
        logger.error("Employee post rank link not found.");
        return res.status(404).send({
          status: 404,
          success: false,
          message: "Employee post rank link not found.",
        });
      }

      await db.attendance.updateMany({
        where: {
          empPostRankLinkId,
          month: parseInt(month),
          year: parseInt(year),
        },
        data: {
          daysPresent,
          daysAbsent,
          extraDutyFourHr,
          extraDutyEightHr,
        },
      });

      logger.info(
        `Attendance for employee ${empPostRankLink.Employee.empName} updated.`,
      );
    }

    const updatedAttendances = await db.attendance.findMany({
      where: {
        year: parseInt(year),
        month: parseInt(month),
        EmpPostRankLink: {
          PostRankLink: {
            postId: parseInt(postId),
          },
        },
      },
      orderBy: {
        EmpPostRankLink: {
          Employee: {
            empName: "asc",
          },
        },
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: { include: { Rank: true } },
          },
        },
      },
    });

    const updatedAttendancesData = updatedAttendances.map((attendance) => ({
      empPostRankLinkId: attendance.EmpPostRankLink.ID,
      empName: attendance.EmpPostRankLink.Employee.empName,
      rank: attendance.EmpPostRankLink.PostRankLink.Rank.designation,
      month: attendance.month,
      year: attendance.year,
      daysPresent: attendance.daysPresent,
      daysAbsent: attendance.daysAbsent,
      extraDutyFourHr: attendance.extraDutyFourHr,
      extraDutyEightHr: attendance.extraDutyEightHr,
    }));

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Attendance records updated successfully.",
      attendances: updatedAttendancesData,
    });
  } catch (err: any) {
    logger.error("Error while updating attendance records: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while updating attendance records.",
    });
  }
};

// Function for deleting an attendance record
const deleteAttendance = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  try {
    const attendance = await db.attendance.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!attendance) {
      logger.error(`Attendance record with ID ${id} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Attendance record not found.",
      });
    }

    await db.attendance.delete({ where: { ID: parseInt(id) } });

    logger.info(`Attendance record with ID ${id} deleted.`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Attendance record deleted successfully.",
    });
  } catch (err: any) {
    logger.error("Error while deleting attendance record: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while deleting attendance record.",
    });
  }
};

// Function for viewing all attendance records for a specific year and month
const viewAttendancesByMonthYear = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { year, month, postId } = req.params;

  if (!year || !month || !postId) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Year, month, and postId are required parameters.",
    });
  }

  try {
    // const attendances = await db.attendance.findMany({
    //   where: {
    //     year: parseInt(year),
    //     month: parseInt(month),
    //   },
    // });
    const attendances = await db.attendance.findMany({
      where: {
        year: parseInt(year),
        month: parseInt(month),
        EmpPostRankLink: {
          PostRankLink: {
            postId: parseInt(postId),
          },
        },
      },
      orderBy: {
        EmpPostRankLink: {
          Employee: {
            empName: "asc",
          },
        },
      },
    });

    if (!attendances || attendances.length === 0) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No attendance records found for the given criteria.",
      });
    }

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Attendance records retrieved successfully.",
      attendances,
    });
  } catch (err: any) {
    logger.error("Error while retrieving attendance records: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while retrieving attendance records.",
    });
  }
};

// Function for creating an attendance schedule
const createAttendanceSchedule = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { year, month, postId } = req.body;
  if (!year || !month || !postId) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Year, month, and postId are required parameters.",
    });
  }
  try {
    const post = await db.post.findUnique({
      where: { ID: parseInt(postId) },
      select: { postName: true },
    });
    if (!post) {
      logger.error("Post not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not found.",
      });
    }

    const existingAttendances = await db.attendance.findMany({
      where: {
        year: parseInt(year),
        month: parseInt(month),
        AND: [
          {
            EmpPostRankLink: {
              PostRankLink: {
                postId: parseInt(postId),
              },
            },
          },
          {
            EmpPostRankLink: {
              // Include employees posted on or before the end of the month
              dateOfPosting: {
                lte: new Date(parseInt(year), parseInt(month), 0), // End of the month
              },
            },
          },
          {
            EmpPostRankLink: {
              OR: [
                // Include active employees
                { status: "Active" },
                // Include inactive employees
                {
                  status: "Inactive",
                },
              ],
            },
          },
        ],
      },
      orderBy: {
        EmpPostRankLink: {
          Employee: {
            empName: "asc",
          },
        },
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: { include: { Rank: true } },
          },
        },
      },
    });

    console.log("existingAttendances:::::::", existingAttendances);
    if (existingAttendances.length > 0) {
      logger.info(
        `Attendance records retrieved for post "${post.postName.replace(/&amp;/g, "&")}" for the given month and year.`,
      );
      const attendances = existingAttendances.map((attendance) => {
        return {
          ID: attendance.ID,
          empId: attendance.EmpPostRankLink.Employee.empId,
          empPostRankLinkId: attendance.EmpPostRankLink.ID,
          empName: attendance.EmpPostRankLink.Employee.empName,
          rank: attendance.EmpPostRankLink.PostRankLink.Rank.designation,
          month: attendance.month,
          year: attendance.year,
          daysPresent: attendance.daysPresent,
          daysAbsent: attendance.daysAbsent,
          extraDutyFourHr: attendance.extraDutyFourHr,
          extraDutyEightHr: attendance.extraDutyEightHr,
          docAttendance: attendance.docAttendance,
        };
      });

      // Verify if the payroll already exists
      const payrollExists = await db.payroll.findFirst({
        where: {
          postId: postId,
          month: month,
          year: year,
        },
      });

      // console.log("payrollExists: ", payrollExists);
      return res.status(200).send({
        status: 200,
        success: true,
        message: `Attendance records retrieved for post "${post.postName.replace(/&amp;/g, "&")}" for the given month and year.`,
        attendances,
        payrollExists: payrollExists ? true : false,
      });
    }

    // First, get all empPostRankLinks for the post that were posted on or before the end of the month
    // Exclude absconded and resigned employees
    const allEmpPostRankLinks = await db.empPostRankLink.findMany({
      where: {
        PostRankLink: {
          postId: parseInt(postId),
        },
        dateOfPosting: {
          lte: new Date(parseInt(year), parseInt(month), 0), // End of the month
        },
        // Exclude absconded and resigned employees
        status: {
          notIn: ["Absconded", "Resigned"],
        },
        Employee: {
          empStatus: {
            notIn: ["Absconded", "Resigned"],
          },
        },
      },
      include: {
        Employee: { select: { empName: true, empId: true } },
        PostRankLink: {
          select: {
            Rank: { select: { designation: true } },
            Post: { select: { postName: true } },
          },
        },
      },
    });

    // Group by employee and get the most recent record for each employee
    // This prevents promoted employees from appearing multiple times
    const employeeMap = new Map();

    allEmpPostRankLinks.forEach((link) => {
      const empId = link.Employee.empId;
      const existingLink = employeeMap.get(empId);

      if (!existingLink || link.dateOfPosting > existingLink.dateOfPosting) {
        employeeMap.set(empId, link);
      }
    });

    // Convert map values back to array and sort by employee name
    const empPostRankLinks = Array.from(employeeMap.values()).sort((a, b) =>
      a.Employee.empName.localeCompare(b.Employee.empName),
    );

    const formatDateDdMmYyyySlash = (date: Date | null) => {
      if (!date) return null;
      const d = new Date(date);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const getNameOfMonth = (monthNumber: number) => {
      const date = new Date();
      date.setMonth(monthNumber - 1);
      return date.toLocaleString("default", { month: "long" });
    };

    if (!empPostRankLinks || empPostRankLinks.length === 0) {
      logger.error(
        `No employees found for post ${post.postName.replace(/&amp;/g, "&")} for the given month and year.`,
      );
      return res.status(404).send({
        status: 404,
        success: false,
        message: `No employees found for post "${post.postName.replace(/&amp;/g, "&")}" for the given month and year.`,
      });
    }

    const totalDaysInMonth = new Date(
      parseInt(year),
      parseInt(month),
      0,
    ).getDate();

    const attendanceSchedule = empPostRankLinks
      .map((link) => {
        // Define the first day and last day of the month
        const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1); // Start of the month
        const monthEnd = new Date(parseInt(year), parseInt(month), 0); // End of the month

        // Calculate the actual start date (later of dateOfPosting or monthStart)
        const startDate =
          link.dateOfPosting && link.dateOfPosting > monthStart
            ? link.dateOfPosting
            : monthStart;

        // Calculate the actual end date (earliest of dateOfDischarge, dateOfTransfer, or monthEnd)
        const validEndDates = [
          link.dateOfDischarge,
          link.dateOfTransfer,
          monthEnd,
        ].filter((date): date is Date => date !== null);

        const endDate = validEndDates.sort(
          (a, b) => a.getTime() - b.getTime(),
        )[0];

        // Exclude invalid records where startDate > endDate
        if (!startDate || !endDate || startDate > endDate) {
          return null;
        }

        // Calculate days worked in the month
        const daysPresent = endDate.getDate() - startDate.getDate() + 1;

        // Debugging output
        console.log(
          `Employee: ${link.Employee.empName}, Start: ${startDate.toLocaleDateString()}, End: ${endDate.toLocaleDateString()}, Days Present: ${daysPresent}`,
        );

        return {
          empPostRankLinkId: link.ID,
          empName: link.Employee.empName,
          empId: link.Employee.empId,
          rank: link.PostRankLink.Rank.designation,
          daysPresent,
          daysAbsent: 0, // Placeholder for absent days
          extraDutyFourHr: 0, // Placeholder for extra duty (4 hours)
          extraDutyEightHr: 0, // Placeholder for extra duty (8 hours)
        };
      })
      .filter((record) => record !== null); // Exclude null records
    logger.info(
      `Attendance schedule created for post ${post.postName.replace(/&amp;/g, "&")}.`,
    );
    return res.status(201).send({
      status: 201,
      success: true,
      message: `Attendance schedule ready for post "${post.postName.replace(/&amp;/g, "&")}" Please update attendance.`,
      attendanceSchedule,
    });
  } catch (error) {
    logger.error("Error creating attendance schedule: ", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while creating attendance schedule.",
    });
  }
};

// Function for updating a single attendance record
const updateSingleAttendance = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const {
    daysPresent,
    daysAbsent,
    extraDutyFourHr,
    extraDutyEightHr,
    year,
    month,
  } = req.body;

  // console.log(
  //   "updateSingleAttendance: ",
  //   id,
  //   daysPresent,
  //   daysAbsent,
  //   extraDutyFourHr,
  //   extraDutyEightHr,
  // );

  if (
    !id
    // ||
    // !daysPresent ||
    // !daysAbsent ||
    // !extraDutyFourHr ||
    // !extraDutyEightHr
  ) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Missing required parameters.",
    });
  }

  try {
    const attendanceId = parseInt(id);

    // Check if the attendance record exists
    const existingAttendance = await db.attendance.findUnique({
      where: { ID: attendanceId },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: { include: { Post: true, Rank: true } },
          },
        },
      },
    });

    console.log("What is existing attendance record: ", existingAttendance);
    if (!existingAttendance) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Attendance record not found.",
      });
    }

    // Update the attendance record
    const updatedAttendance = await db.attendance.update({
      where: { ID: attendanceId },
      data: {
        daysPresent,
        daysAbsent,
        extraDutyFourHr,
        extraDutyEightHr,
      },
    });

    logger.info(
      `Attendance for employee ${existingAttendance.EmpPostRankLink.Employee.empName} updated.`,
    );

    const existingEmpPayroll = await db.payroll.findFirst({
      where: {
        empPostRankLinkId: existingAttendance.EmpPostRankLink.ID,
        month: Number(month),
        year: Number(year),
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: {
              include: {
                Rank: true,
                TaxDeductionPostRankLink: {
                  include: {
                    TaxesAndDeduction: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Only update payroll if it exists, otherwise just log that payroll wasn't found
    if (existingEmpPayroll) {
      const taxesAndDeductions = await db.taxesAndDeduction.findMany();
      const formatNumber = (num: number): number => parseFloat(num.toFixed(2));

      console.log("What is existingEmpPayroll: ", existingEmpPayroll);
      const postRank = existingEmpPayroll.EmpPostRankLink?.PostRankLink;

      const dailyBasicPay =
        (postRank?.basicSalary?.toNumber() ?? 0) /
        new Date(Number(year), Number(month), 0).getDate();
      const hourlyPay = dailyBasicPay / 8;
      const basicSalary = dailyBasicPay * (updatedAttendance?.daysPresent ?? 0);
      const bonus = existingEmpPayroll.bonus?.toNumber() ?? 0;

      const fourHourPay = formatNumber(
        (updatedAttendance?.extraDutyFourHr ?? 0) * hourlyPay * 4,
      );
      const eightHourPay = formatNumber(
        (updatedAttendance?.extraDutyEightHr ?? 0) * hourlyPay * 8,
      );

      const extraDuty = existingEmpPayroll.extraDuty?.toNumber() ?? 0;
      // const weeklyOff = postRank?.weeklyOff?.toNumber() ?? 0;
      // const specialAllowance = postRank?.specialAllowance?.toNumber() ?? 0;

      let taxDeductionId = 0;
      if (basicSalary && basicSalary !== null) {
        if (basicSalary < 10000) {
          taxDeductionId = 1;
        } else if (basicSalary >= 10000 && basicSalary < 15000) {
          taxDeductionId = 2;
        } else {
          taxDeductionId = 3;
        }
      }
      console.log("selected tax deduction id : ", taxDeductionId);

      const calculatedConveyance =
        ((updatedAttendance?.daysPresent ?? 0) *
          (postRank?.conveyance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedCityAllowance =
        ((updatedAttendance?.daysPresent ?? 0) *
          (postRank?.cityAllowance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedKitWashingAllowance =
        ((updatedAttendance?.daysPresent ?? 0) *
          (postRank?.kitWashingAllowance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedUniformAllowance =
        ((updatedAttendance?.daysPresent ?? 0) *
          (postRank?.uniformAllowance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedSpecialAllowance =
        ((updatedAttendance?.daysPresent ?? 0) *
          (postRank?.specialAllowance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedWeeklyOff =
        ((updatedAttendance?.daysPresent ?? 0) *
          (postRank?.weeklyOff?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const grossPay =
        basicSalary +
        (updatedAttendance?.extraDutyFourHr ?? 0) * hourlyPay * 4 +
        (updatedAttendance?.extraDutyEightHr ?? 0) * hourlyPay * 8 +
        bonus + // Client asked to keep
        calculatedWeeklyOff + // Client asked to keep
        // calculatedHra + // Client asked to remove
        calculatedConveyance +
        calculatedKitWashingAllowance +
        calculatedUniformAllowance +
        calculatedCityAllowance +
        // calculatedVda + // Client asked to remove
        // calculatedOtherAllowance + // Client asked to remove
        calculatedSpecialAllowance + // TODO: Ask if needed
        extraDuty;

      const esi =
        ((taxesAndDeductions
          .find((tax) => tax.ID === taxDeductionId)
          ?.esi?.toNumber() ?? 0) *
          grossPay) /
        100;
      // const esi = 0.0075 * grossPay; // TODO: Check later
      const epf =
        ((taxesAndDeductions
          .find((tax) => tax.ID === taxDeductionId)
          ?.epf?.toNumber() ?? 0) *
          basicSalary) /
        100;
      const advance = existingEmpPayroll.advance?.toNumber() ?? 0;
      const otherDeduction = existingEmpPayroll.otherDeduction?.toNumber() ?? 0;
      const totalDeduction =
        esi +
        epf +
        otherDeduction +
        advance + // TODO: Waiting to know from client whether to keep or remove
        (existingEmpPayroll.beltDeduction?.toNumber() ?? 0) +
        (existingEmpPayroll.bootDeduction?.toNumber() ?? 0) +
        (existingEmpPayroll.uniformDeduction?.toNumber() ?? 0);

      const pTax = calculatePTax(basicSalary);

      const netPay = grossPay - totalDeduction - pTax + bonus;

      const payrollUpdateData = {
        workingDays: updatedAttendance?.daysPresent ?? 0,
        basicSalary: formatNumber(basicSalary),
        fourHourPay: formatNumber(fourHourPay),
        eightHourPay: formatNumber(eightHourPay),
        weeklyOff: formatNumber(calculatedWeeklyOff),
        conveyance: formatNumber(calculatedConveyance),
        kitWashingAllowance: formatNumber(calculatedKitWashingAllowance),
        uniformAllowance: formatNumber(calculatedUniformAllowance),
        cityAllowance: formatNumber(calculatedCityAllowance),
        specialAllowance: formatNumber(calculatedSpecialAllowance),
        esi: formatNumber(esi),
        epf: formatNumber(epf),
        totalDeduction: formatNumber(totalDeduction),
        pTax: formatNumber(pTax),
        grossPay: formatNumber(grossPay),
        netPay: formatNumber(netPay),
      };

      const updatedPayroll = await db.payroll.update({
        where: { ID: existingEmpPayroll.ID },
        data: payrollUpdateData,
      });

      logger.info(
        `Payroll updated for employee ${existingAttendance.EmpPostRankLink.Employee.empName}.`,
      );
    } else {
      logger.info(
        `No payroll record found for employee ${existingAttendance.EmpPostRankLink.Employee.empName} for ${month}/${year}. Payroll will be updated when generated.`,
      );
    }

    // Return the attendance records for all employees under the current post
    const existingAttendances = await db.attendance.findMany({
      where: {
        year: parseInt(year),
        month: parseInt(month),
        EmpPostRankLink: {
          PostRankLink: {
            postId: existingAttendance.EmpPostRankLink.PostRankLink.postId,
          },
        },
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: { include: { Rank: true } },
          },
        },
      },
    });

    const attendances = existingAttendances.map((attendance) => ({
      ID: attendance.ID,
      empId: attendance.EmpPostRankLink.Employee.empId,
      empPostRankLinkId: attendance.EmpPostRankLink.ID,
      empName: attendance.EmpPostRankLink.Employee.empName,
      rank: attendance.EmpPostRankLink.PostRankLink.Rank.designation,
      month: attendance.month,
      year: attendance.year,
      daysPresent: attendance.daysPresent,
      daysAbsent: attendance.daysAbsent,
      extraDutyFourHr: attendance.extraDutyFourHr,
      extraDutyEightHr: attendance.extraDutyEightHr,
    }));

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Attendance record updated successfully.",
      attendances,
    });
  } catch (err: any) {
    logger.error("Error while updating attendance record: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while updating attendance record.",
    });
  }
};

const getAttendanceStatus = async (req: Request, res: Response) => {
  const { year, month } = req.params;

  if (!year || !month) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Missing required parameters.",
    });
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthInWords = months[parseInt(month) - 1];

  try {
    // Fetch all posts
    const posts = await db.post.findMany();

    const attendanceStatus = await Promise.all(
      posts.map(async (post) => {
        // Check if attendance records exist for the given post, month, and year
        const attendanceRecords = await db.attendance.findMany({
          where: {
            year: parseInt(year),
            month: parseInt(month),
            EmpPostRankLink: {
              PostRankLink: {
                postId: post.ID,
              },
            },
          },
        });

        // Determine attendance status
        const attendanceStatus =
          attendanceRecords.length > 0 ? "Completed" : "Pending";

        return {
          postId: post.ID,
          postName: post.postName.replace(/&amp;/g, "&"),
          status: attendanceStatus,
        };
      }),
    );

    // console.log("attendanceStatus: ", attendanceStatus);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Attendance status fetched successfully.",
      attendanceStatus,
      month: monthInWords,
      year,
    });
  } catch (error) {
    logger.error("Error fetching attendance status: ", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching attendance status.",
    });
  }
};

const deleteAttendanceDoc = async (req: Request, res: Response) => {
  const { postId, month, year } = req.params;

  if (!postId || !month || !year) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Missing required parameters.",
    });
  }

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
      docAttendance: "",
    },
  });
  console.log("updatedAttendances after deleting doc: ", updatedAttendances);

  return res.status(200).send({
    status: 200,
    success: true,
    message: "Document deleted successfully.",
  });
};

const getAtendanceAndPayrollStatuses = async (req: Request, res: Response) => {
  // console.log("inside ");
  const { year, month } = req.params;

  console.log("year: ", year);
  console.log("month: ", month);

  if (!year || !month) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Missing required parameters.",
    });
  }

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const monthInWords = months[parseInt(month) - 1];

  try {
    // Fetch all posts
    const posts = await db.post.findMany({
      where: {
        status: {
          not: "Inactive",
        },
      },
      orderBy: {
        postName: "asc",
      },
    });

    // Process attendance and payroll statuses for each post
    const statuses = await Promise.all(
      posts.map(async (post) => {
        // Fetch attendance records for the post, month, and year
        const attendanceRecords = await db.attendance.findMany({
          where: {
            year: parseInt(year),
            month: parseInt(month),
            EmpPostRankLink: {
              PostRankLink: {
                postId: post.ID,
              },
            },
          },
        });

        // Fetch payroll records for the post, month, and year
        const payrollRecords = await db.payroll.findMany({
          where: {
            year: parseInt(year),
            month: parseInt(month),
            postId: post.ID,
          },
        });

        // Determine statuses
        const attendanceStatus =
          attendanceRecords.length > 0 ? "Completed" : "Pending";
        const payrollStatus =
          payrollRecords.length > 0 ? "Completed" : "Pending";

        return {
          postId: post.ID,
          postName: post.postName.replace(/&amp;/g, "&"),
          attendanceStatus,
          payrollStatus,
          reportName: post.reportName,
        };
      }),
    );
    // console.log("statuses: ", statuses);

    return res.status(200).send({
      status: 200,
      success: true,
      message: `Attendance and payroll statuses for ${monthInWords} ${year} fetched successfully.`,
      statuses,
      month: monthInWords,
      year,
    });
  } catch (error) {
    logger.error("Error fetching statuses: ", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching statuses.",
    });
  }
};

// Function for deleting attendance records for a post, month and year
const deleteAttendanceByMonthYear = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.params;

  if (!postId || !month || !year) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "PostId, month, and year are required parameters.",
    });
  }

  try {
    const deletedAttendances = await db.attendance.deleteMany({
      where: {
        month: parseInt(month),
        year: parseInt(year),
        EmpPostRankLink: {
          PostRankLink: {
            postId: parseInt(postId),
          },
        },
      },
    });

    if (deletedAttendances.count === 0) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No attendance records found to delete.",
      });
    }

    return res.status(200).send({
      status: 200,
      success: true,
      message: `${deletedAttendances.count} Attendance records deleted successfully.`,
      deletedAttendances: deletedAttendances,
    });
  } catch (error) {
    logger.error("Error while deleting attendance records: ", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while deleting attendance records.",
    });
  }
};
export {
  createAttendance,
  updateAttendance,
  deleteAttendance,
  viewAttendancesByMonthYear,
  createAttendanceSchedule,
  updateSingleAttendance,
  getAttendanceStatus,
  deleteAttendanceDoc,
  getAtendanceAndPayrollStatuses,
  deleteAttendanceByMonthYear,
};
