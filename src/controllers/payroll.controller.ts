// Import npm modules
import { Request, Response } from "express";

// Import helpers
import logger from "../helpers/logger";

// Import database
import { db } from "../configs/db.config";
import { calculatePTax } from "../helpers/functions";
import { spec } from "node:test/reporters";

// Function for creating a payroll
const createPayroll = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.body;

  // console.log(
  //   `Creating payroll for post ${postId} for month ${month} of year ${year}.`,
  // );

  try {
    // Verify if the post exists
    const post = await db.post.findUnique({
      where: {
        ID: postId,
      },
      include: {
        PostRankLink: {
          include: {
            EmpPostRankLink: true,
            Rank: {
              select: { designation: true },
            },
          },
        },
      },
    });

    // If post does not exist, return 404
    if (!post || post.isDeleted) {
      logger.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Verify if the payroll already exists
    const payrollExists = await db.payroll.findFirst({
      where: {
        postId: postId,
        month: month,
        year: year,
      },
    });

    // If the payroll already exists, return 409
    if (payrollExists) {
      logger.error(
        `Payroll already exists for the given post ${post.postName.replace(/&amp;/g, "&")} for month ${month} of year ${year}.`,
      );
      return res.status(409).send({
        status: 409,
        success: false,
        message: `Payroll already exists for the given post ${post.postName.replace(/&amp;/g, "&")} for month ${month} of year ${year}.`,
      });
    }

    // Verify if any of the ranks are not assigned with a tax deduction
    const postRankLinks = await db.postRankLink.findMany({
      where: {
        postId: parseInt(postId),
      },
      select: {
        ID: true,
        Post: {
          select: {
            postName: true,
          },
        },
      },
    });

    const postRankLinkIds = postRankLinks.map((link) => link.ID);

    // If no ranks are linked to the post, return 404
    if (postRankLinkIds.length === 0) {
      logger.error(
        `No ranks linked to the post ${post?.postName.replace(/&amp;/g, "&")}`,
      );
      return res.status(404).send({
        status: 404,
        success: false,
        // message: `No ranks linked to the post ${post?.postName}`,
      });
    }

    // Fetch tax deduction links for the post ranks
    // const taxDeductionPostRankLinks =
    //   await db.taxDeductionPostRankLink.findMany({
    //     where: {
    //       postRankLinkId: {
    //         in: postRankLinkIds,
    //       },
    //     },
    //     select: {
    //       ID: true,
    //       taxDeductionID: true,
    //       postRankLinkId: true,
    //       TaxesAndDeduction: {
    //         select: { taxDeducName: true },
    //       },
    //       PostRankLink: {
    //         select: {
    //           Rank: {
    //             select: {
    //               designation: true,
    //               basicSalary: true,
    //             },
    //           },
    //           // EmpPostRankLink: {
    //           //   select: {
    //           //     Employee: {
    //           //       select: {
    //           //         empName: true,
    //           //       },
    //           //     },
    //           //   },
    //           // },
    //         },
    //       },
    //     },
    //   });

    // Find ranks that do not have a tax deduction link
    // const missingTaxDeductions = postRankLinkIds
    //   .filter(
    //     (ID) =>
    //       !taxDeductionPostRankLinks.some((link) => link.postRankLinkId === ID),
    //   )
    //   .map((ID) => {
    //     const postRankLink = post.PostRankLink.find((link) => link.ID === ID);
    //     return postRankLink?.Rank.designation;
    //   })
    //   .filter((designation) => designation !== undefined);

    // Return 404 if any ranks do not have a tax deduction
    // if (missingTaxDeductions.length > 0) {
    //   logger.error(
    //     `Ranks ${missingTaxDeductions.join(", ")} have not got a tax deduction.`,
    //   );
    //   return res.status(404).send({
    //     status: 404,
    //     success: false,
    //     message: `Cannot generate payroll since no tax deduction is scheduled with postRank${missingTaxDeductions.length > 1 ? "s" : ""} ${missingTaxDeductions.join(", ")}.`,
    //   });
    // }

    // Find all tax deductions :
    const taxesAndDeductions = await db.taxesAndDeduction.findMany();

    // console.log("What are taxes and deductions ", taxesAndDeductions);

    // Fetch the necessary employee postRank data and verify if attendance data exists
    let employeePostRanks = await db.empPostRankLink.findMany({
      // where: {
      //   PostRankLink: {
      //     postId: postId,
      //   },
      //   status: "Active",
      // },
      where: {
        PostRankLink: {
          postId: parseInt(postId),
        },
        AND: [
          // Include employees posted on or before the end of the month
          {
            dateOfPosting: {
              lte: new Date(parseInt(year), parseInt(month), 0), // End of the month
            },
          },
          // {
          //   OR: [
          //     // Include active employees
          //     { status: "Active" },
          //     // Include inactive employees
          //     {
          //       status: "Inactive",
          //     },
          //   ],
          // },
        ],
      },
      include: {
        Employee: true,
        Attendance: {
          where: {
            month: month,
            year: year,
          },
        },
        PostRankLink: {
          include: {
            Rank: true,
            // TaxDeductionPostRankLink: {
            //   include: {
            //     TaxesAndDeduction: true,
            //   },
            // },
          },
        },
      },
    });

    // Check if any attendance exists
    const anyAttendanceExists = employeePostRanks.some(
      (emp) => emp.Attendance.length > 0,
    );

    // If no attendance exists, return 404
    if (!anyAttendanceExists) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No attendance data exists.",
      });
    }

    // Eliminate all empPostRank whose attendance doesn't exist
    employeePostRanks = employeePostRanks.filter(
      (emp) => emp.Attendance.length > 0,
    );

    /*
    console.log(
      "Retrieved Employees in create payroll:",
      employeePostRanks.map((e) => e.Employee.empName),
    );

    for (const emp of employeePostRanks) {
      console.log("which employee's atteandance: ", emp.Employee.empName);
      console.log("what is the attendance: ", emp.Attendance);
      if (!emp.Attendance[0]) {
        logger.error(
          `Attendance data does not exist for employee ${emp.Employee.empName} of post ${post.postName} for month ${month} of year ${year}.`,
        );
        return res.status(404).send({
          status: 404,
          success: false,
          message: `Attendance data does not exist for employees of post ${post.postName} for month ${month} of year ${year}.`,
        });
      }
    }
    */

    // Create the payroll entries
    const payrollEntries = employeePostRanks.map((empPostRank) => {
      const attendance = empPostRank.Attendance[0] || {};
      const basicSalary = Number(empPostRank.PostRankLink.basicSalary);
      // console.log("basicSalary: ", basicSalary);

      let taxDeductionId = 0;
      if (basicSalary && basicSalary !== null) {
        if (basicSalary <= 10000) {
          taxDeductionId = 1;
        } else if (basicSalary > 10000 && basicSalary < 15000) {
          taxDeductionId = 2;
        } else {
          taxDeductionId = 3;
        }
      }

      // console.log("taxDeductionId: ", taxDeductionId);
      // const taxDeductionPostRankLink = taxDeductionPostRankLinks.find(
      //   (link) => link.postRankLinkId === empPostRank.postRankLinkId,
      // );

      // if (!taxDeductionPostRankLink) {
      //   throw new Error(
      //     `No tax deduction link found for postRankLinkId ${empPostRank.postRankLinkId}`,
      //   );
      // }

      return {
        empPostRankLinkId: empPostRank.ID,
        postId: postId,
        attendanceId: attendance.ID,
        // taxDeductionPostRankLinkId: taxDeductionId, // Correct ID assignment
        month: month,
        year: year,
        bonus: 0,
        advance: 0,
        extraDuty: 0,
        beltDeduction: 0,
        bootDeduction: 0,
        uniformDeduction: 0,
        weeklyOff: 0,
        specialAllowance: 0,
        workingDays: 0,
      };
    });

    // Insert payroll entries into the database
    await db.$transaction(
      payrollEntries.map((payroll) =>
        db.payroll.create({
          data: { ...payroll },
        }),
      ),
    );

    // Fetch the created payroll entries
    const fetchedPayrolls = await db.payroll.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        postId: Number(postId),
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
        Attendance: true,
        // TaxDeductionPostRankLink: {
        //   include: {
        //     TaxesAndDeduction: true,
        //   },
        // },
      },
      orderBy: {
        EmpPostRankLink: {
          Employee: {
            empName: "asc",
          },
        },
      },
    });

    // console.log("fetchedPayrolls: ", fetchedPayrolls);

    // Format payroll data
    const calculatedPayrolls = fetchedPayrolls.map((payroll, index) => {
      const employee = payroll.EmpPostRankLink?.Employee;
      const attendance = payroll.Attendance;
      const postRank = payroll.EmpPostRankLink?.PostRankLink;
      const designation = postRank?.Rank?.designation;
      // const taxDeduction = payroll.TaxDeductionPostRankLink?.TaxesAndDeduction;

      const dailyBasicPay =
        (postRank?.basicSalary?.toNumber() ?? 0) /
        new Date(Number(year), Number(month), 0).getDate();
      const hourlyPay = dailyBasicPay / 8;
      const basicSalary = dailyBasicPay * (attendance?.daysPresent ?? 0);
      const bonus = payroll.bonus?.toNumber() ?? 0;

      const extraDuty = payroll.extraDuty?.toNumber() ?? 0;
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

      const weeklyOff = postRank?.weeklyOff?.toNumber() ?? 0;
      const specialAllowance = postRank?.specialAllowance?.toNumber() ?? 0;
      // console.log("Inside create payroll, checking ::::::::::::::::");
      // console.log("special allowance: ", specialAllowance);
      // console.log("weekly off: ", weeklyOff);
      // console.log("---------------------------------");
      // TODO: Check if weekly off and special allowance is needed in gross pay

      // const calculatedHra =
      //   ((attendance?.daysPresent ?? 0) * (postRank?.hra?.toNumber() ?? 0)) /
      //   new Date(Number(year), Number(month), 0).getDate();
      const calculatedConveyance =
        ((attendance?.daysPresent ?? 0) *
          (postRank?.conveyance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedCityAllowance =
        ((attendance?.daysPresent ?? 0) *
          (postRank?.cityAllowance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedKitWashingAllowance =
        ((attendance?.daysPresent ?? 0) *
          (postRank?.kitWashingAllowance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedUniformAllowance =
        ((attendance?.daysPresent ?? 0) *
          (postRank?.uniformAllowance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedSpecialAllowance =
        ((attendance?.daysPresent ?? 0) *
          (postRank?.specialAllowance?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      const calculatedWeeklyOff =
        ((attendance?.daysPresent ?? 0) *
          (postRank?.weeklyOff?.toNumber() ?? 0)) /
        new Date(Number(year), Number(month), 0).getDate();

      // const calculatedVda =
      //   ((attendance?.daysPresent ?? 0) * (postRank?.vda?.toNumber() ?? 0)) /
      //   new Date(Number(year), Number(month), 0).getDate();

      // const calculatedOtherAllowance =
      //   ((attendance?.daysPresent ?? 0) *
      //     (postRank?.otherAllowance?.toNumber() ?? 0)) /
      //   new Date(Number(year), Number(month), 0).getDate();

      const grossPay =
        basicSalary +
        (attendance?.extraDutyFourHr ?? 0) * hourlyPay * 4 +
        (attendance?.extraDutyEightHr ?? 0) * hourlyPay * 8 +
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

      console.log("What is gross pay ", grossPay);

      const esi =
        ((taxesAndDeductions
          .find((tax) => tax.ID === taxDeductionId)
          ?.esi?.toNumber() ?? 0) *
          grossPay) /
        100;
      const epf =
        ((taxesAndDeductions
          .find((tax) => tax.ID === taxDeductionId)
          ?.epf?.toNumber() ?? 0) *
          basicSalary) /
        100;
      const advance = payroll.advance?.toNumber() ?? 0;
      const otherDeduction = payroll.otherDeduction?.toNumber() ?? 0;
      const totalDeduction =
        Math.round(esi) +
        Math.round(epf) +
        Math.round(otherDeduction) +
        Math.round(advance) + // TODO: Waiting to know from client whether to keep or remove
        Math.round(payroll.beltDeduction?.toNumber() ?? 0) +
        Math.round(payroll.bootDeduction?.toNumber() ?? 0) +
        Math.round(payroll.uniformDeduction?.toNumber() ?? 0);
      // const pTax = taxDeduction?.pTax?.toNumber() ?? 0;

      // const pTax = calculatePTax(grossPay); // TOOD: Check with Client

      const pTax = calculatePTax(basicSalary);

      const netPay =
        Math.round(grossPay) -
        Math.round(totalDeduction) -
        Math.round(pTax) +
        Math.round(bonus);
      // Helper function to format numbers
      const formatNumber = (num: number): number => parseFloat(num.toFixed(2));

      const payrollData = {
        ID: payroll.ID,
        empName: employee?.empName ?? "N/A",
        empId: employee?.empId ?? "N/A",
        post: post?.postName.replace(/&amp;/g, "&") ?? "N/A",
        rank: designation ?? "N/A",
        workingDays: attendance?.daysPresent ?? 0,
        basicSalary: formatNumber(basicSalary),
        fourHourPay: formatNumber(
          (attendance?.extraDutyFourHr ?? 0) * hourlyPay * 4,
        ),
        eightHourPay: formatNumber(
          (attendance?.extraDutyEightHr ?? 0) * hourlyPay * 8,
        ),
        extraDuty: formatNumber(payroll.extraDuty?.toNumber() ?? 0),
        // hra: formatNumber(calculatedHra),
        hra: 0,
        vda: 0,
        // vda: formatNumber(calculatedVda),
        conveyance: formatNumber(calculatedConveyance),
        uniformAllowance: formatNumber(calculatedUniformAllowance),
        kitWashingAllowance: formatNumber(calculatedKitWashingAllowance),
        cityAllowance: formatNumber(calculatedCityAllowance),
        // otherAllowance: formatNumber(calculatedOtherAllowance),
        otherAllowance: 0,
        bonus: formatNumber(payroll.bonus?.toNumber() ?? 0),
        grossPay: formatNumber(grossPay),
        advance: formatNumber(advance),
        esi: formatNumber(esi),
        epf: formatNumber(epf),
        otherDeduction: formatNumber(otherDeduction),
        totalDeduction: formatNumber(totalDeduction),
        pTax: formatNumber(pTax),
        weeklyOff: formatNumber(calculatedWeeklyOff),
        netPay: formatNumber(netPay),
        beltDeduction: formatNumber(payroll.beltDeduction?.toNumber() ?? 0),
        bootDeduction: formatNumber(payroll.bootDeduction?.toNumber() ?? 0),
        uniformDeduction: formatNumber(
          payroll.uniformDeduction?.toNumber() ?? 0,
        ),
        specialAllowance: formatNumber(calculatedSpecialAllowance),
        empEsiTaxPercent:
          taxesAndDeductions.find((tax) => tax.ID === taxDeductionId)?.esi ?? 0,
        empEpfTaxPercent:
          taxesAndDeductions.find((tax) => tax.ID === taxDeductionId)?.epf ?? 0,
        emplrEsiTaxPercent:
          taxesAndDeductions.find((tax) => tax.ID === taxDeductionId)
            ?.employerEsi ?? 0,
        emplrEpfTaxPercent:
          taxesAndDeductions.find((tax) => tax.ID === taxDeductionId)
            ?.employerEpf ?? 0,
      };

      return payrollData;
    });

    await db.$transaction(
      calculatedPayrolls.map((payroll) =>
        db.payroll.update({
          where: {
            ID: payroll.ID,
          },
          data: {
            workingDays: payroll.workingDays,
            basicSalary: payroll.basicSalary,
            fourHourPay: payroll.fourHourPay,
            eightHourPay: payroll.eightHourPay,
            extraDuty: payroll.extraDuty,
            hra: payroll.hra,
            vda: payroll.vda,
            conveyance: payroll.conveyance,
            uniformAllowance: payroll.uniformAllowance,
            kitWashingAllowance: payroll.kitWashingAllowance,
            cityAllowance: payroll.cityAllowance,
            otherAllowance: payroll.otherAllowance,
            bonus: payroll.bonus,
            grossPay: payroll.grossPay,
            advance: payroll.advance,
            esi: payroll.esi,
            epf: payroll.epf,
            otherDeduction: payroll.otherDeduction,
            totalDeduction: payroll.totalDeduction,
            weeklyOff: payroll.weeklyOff,
            pTax: payroll.pTax,
            netPay: payroll.netPay,
            beltDeduction: payroll.beltDeduction,
            bootDeduction: payroll.bootDeduction,
            uniformDeduction: payroll.uniformDeduction,
            specialAllowance: payroll.specialAllowance,
            empEsiTaxPercent: payroll.empEsiTaxPercent,
            empEpfTaxPercent: payroll.empEpfTaxPercent,
            emplrEsiTaxPercent: payroll.emplrEsiTaxPercent,
            emplrEpfTaxPercent: payroll.emplrEpfTaxPercent,
          },
        }),
      ),
    );

    console.log("calculatedPayrolls: ", calculatedPayrolls);
    return res.status(201).send({
      status: 201,
      success: true,
      message: "Payroll created successfully.",
      payrolls: calculatedPayrolls,
    });
  } catch (error: any) {
    console.error("Error creating payroll:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while creating payroll.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Function to view payroll
const viewPayroll = async (req: Request, res: Response): Promise<Response> => {
  const { postId, month, year } = req.params;
  try {
    // Verify if the post exists
    const post = await db.post.findUnique({
      where: {
        ID: Number(postId),
      },
    });

    // If post does not exist, return 404
    if (!post || post.isDeleted) {
      logger.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Fetch payroll entries
    const payrolls = await db.payroll.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        postId: Number(postId),
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: {
              include: {
                Rank: true,
                // TaxDeductionPostRankLink: {
                //   include: {
                //     TaxesAndDeduction: true,
                //   },
                // },
              },
            },
          },
        },
        // Attendance: true,
        // TaxDeductionPostRankLink: {
        //   include: {
        //     TaxesAndDeduction: true,
        //   },
        // },
      },
      orderBy: {
        EmpPostRankLink: {
          Employee: {
            empName: "asc",
          },
        },
      },
    });

    // Check if payrolls are empty
    // if (payrolls.length === 0) {
    //   console.warn("No payrolls found for the given criteria.");
    //   return res.status(404).send({
    //     status: 404,
    //     success: false,
    //     message: "No payrolls found for the given criteria.",
    //   });
    // }

    // If no payrolls found, check attendance
    if (payrolls.length === 0) {
      console.warn(
        "No payrolls found for the given criteria. Checking attendance...",
      );

      // Fetch attendance entries
      const attendanceRecords = await db.attendance.findMany({
        where: {
          month: Number(month),
          year: Number(year),
          EmpPostRankLink: {
            PostRankLink: {
              postId: Number(postId),
            },
          },
        },
        include: {
          EmpPostRankLink: {
            include: {
              Employee: true,
              PostRankLink: {
                include: {
                  Rank: true,
                },
              },
            },
          },
        },
      });

      // If no attendance records, return 404
      if (attendanceRecords.length === 0) {
        return res.status(404).send({
          status: 404,
          success: false,
          message:
            "No payroll or attendance records found for the given criteria.",
        });
      }

      // Format attendance data as placeholders
      const formattedAttendance = attendanceRecords.map((attendance, index) => {
        const employee = attendance.EmpPostRankLink?.Employee;
        const postRank = attendance.EmpPostRankLink?.PostRankLink?.Rank;

        return {
          ID: null, // No payroll ID
          empName: employee?.empName ?? "N/A",
          empId: employee?.empId ?? "N/A",
          post: post?.postName.replace(/&amp;/g, "&") ?? "N/A",
          rank: postRank?.designation ?? "N/A",
          workingDays: attendance?.daysPresent ?? 0,
          // basicSalary: 0,
          // fourHourPay: 0,
          // eightHourPay: 0,
          // extraDuty: 0,
          // hra: 0,
          // vda: 0,
          // conveyance: 0,
          // uniformAllowance: 0,
          // kitWashingAllowance: 0,
          // cityAllowance: 0,
          // bonus: 0,
          // otherAllowance: 0,
          // grossPay: 0,
          // advance: 0,
          // esi: 0,
          // epf: 0,
          // otherDeduction: 0,
          // totalDeduction: 0,
          // pTax: 0,
          // netPay: 0,
          // beltDeduction: 0,
          // bootDeduction: 0,
          // uniformDeduction: 0,
        };
      });

      return res.status(200).send({
        status: 200,
        success: true,
        message:
          "No payroll found, but attendance records retrieved successfully.",
        payrolls: formattedAttendance,
      });
    }

    // console.log("what arer payrolls in view controller: ", payrolls);
    // Format payroll data
    const formattedPayrolls = payrolls.map((payroll, index) => {
      const employee = payroll.EmpPostRankLink?.Employee;
      // const attendance = payroll.Attendance;
      const postRank = payroll.EmpPostRankLink?.PostRankLink;
      const designation = postRank?.Rank?.designation;

      const formatNumber = (num: number): number => parseFloat(num.toFixed(2));

      return {
        ID: payroll.ID,
        empName: employee?.empName ?? "N/A",
        empId: employee?.empId ?? "N/A",
        post: post?.postName.replace(/&amp;/g, "&") ?? "N/A",
        rank: designation ?? "N/A",
        workingDays: payroll.workingDays ?? 0,
        basicSalary: formatNumber(payroll.basicSalary?.toNumber() ?? 0),
        fourHourPay: formatNumber(payroll.fourHourPay?.toNumber() ?? 0),
        eightHourPay: formatNumber(payroll?.eightHourPay?.toNumber() ?? 0),
        extraDuty: formatNumber(payroll.extraDuty?.toNumber() ?? 0),
        hra: formatNumber(payroll?.hra?.toNumber() ?? 0),
        vda: formatNumber(payroll?.vda?.toNumber() ?? 0),
        conveyance: formatNumber(payroll?.conveyance?.toNumber() ?? 0),
        uniformAllowance: formatNumber(
          payroll?.uniformAllowance?.toNumber() ?? 0,
        ),
        kitWashingAllowance: formatNumber(
          payroll?.kitWashingAllowance?.toNumber() ?? 0,
        ),
        cityAllowance: formatNumber(payroll?.cityAllowance?.toNumber() ?? 0),
        bonus: formatNumber(payroll.bonus?.toNumber() ?? 0),
        otherAllowance: formatNumber(payroll?.otherAllowance?.toNumber() ?? 0),
        grossPay: formatNumber(payroll.grossPay?.toNumber() ?? 0),
        advance: formatNumber(payroll.advance?.toNumber() ?? 0),
        esi: formatNumber(payroll.esi?.toNumber() ?? 0),
        epf: formatNumber(payroll?.epf?.toNumber() ?? 0),
        otherDeduction: formatNumber(payroll.otherDeduction?.toNumber() ?? 0),
        totalDeduction: formatNumber(payroll.totalDeduction?.toNumber() ?? 0),
        weeklyOff: formatNumber(payroll.weeklyOff?.toNumber() ?? 0),
        pTax: formatNumber(payroll.pTax?.toNumber() ?? 0),
        netPay: formatNumber(payroll.netPay?.toNumber() ?? 0),
        beltDeduction: formatNumber(payroll.beltDeduction?.toNumber() ?? 0),
        bootDeduction: formatNumber(payroll.bootDeduction?.toNumber() ?? 0),
        uniformDeduction: formatNumber(
          payroll.uniformDeduction?.toNumber() ?? 0,
        ),
        specialAllowance: formatNumber(
          payroll.specialAllowance?.toNumber() ?? 0,
        ),
        // empEsiTaxPercent: formatNumber(
        //   payroll.empEsiTaxPercent?.toNumber() ?? 0,
        // ),
        // empEpfTaxPercent: formatNumber(
        //   payroll.empEsiTaxPercent?.toNumber() ?? 0,
        // ),
        // emplrEsiTaxPercent: formatNumber(
        //   payroll.emplrEsiTaxPercent?.toNumber() ?? 0,
        // ),
        // emplrEpfTaxPercent: formatNumber(
        //   payroll.emplrEpfTaxPercent?.toNumber() ?? 0,
        // ),
      };
    });

    logger.info("Payrolls retrieved successfully.");

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Payrolls retrieved successfully.",
      payrolls: formattedPayrolls,
    });
  } catch (error: any) {
    console.error("Error viewing payroll:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing payroll.",
    });
  } finally {
    await db.$disconnect();
  }
};

type PayslipEarningKey =
  | "basic"
  | "hra"
  | "conveyance"
  | "cityAllowance"
  | "kitWashing"
  | "specialAllowance"
  | "otWages"
  | "uniform"
  | "vda"
  | "others";

type PayslipDeductionKey =
  | "epf"
  | "esi"
  | "professionalTax"
  | "belt"
  | "boot"
  | "uniform"
  | "advance"
  | "incomeTax"
  | "others";

const PAYSLIP_RULE_MATRIX: Record<
  string,
  {
    earnings: PayslipEarningKey[];
    deductions: PayslipDeductionKey[];
  }
> = {
  VIEW_DS_REPORT: {
    earnings: ["basic", "hra", "conveyance", "cityAllowance", "kitWashing", "otWages"],
    deductions: [
      "epf",
      "esi",
      "professionalTax",
      "belt",
      "boot",
      "uniform",
      "advance",
      "others",
    ],
  },
  WITHOUT_ALLOWANCE_REPORT: {
    earnings: ["basic", "otWages"],
    deductions: ["epf", "esi", "professionalTax", "advance", "others", "boot", "uniform"],
  },
  NEW_PAYROLL_REPORT: {
    earnings: ["basic", "uniform", "otWages"],
    deductions: ["epf", "esi", "professionalTax", "uniform", "advance", "others"],
  },
  DSL_REPORT: {
    earnings: ["basic", "uniform", "otWages"],
    deductions: ["epf", "esi", "professionalTax", "uniform", "advance", "others"],
  },
  LNT_REPORT: {
    earnings: ["basic", "uniform", "specialAllowance", "otWages"],
    deductions: ["epf", "esi", "professionalTax", "advance", "others"],
  },
  OTHERS_REPORT: {
    earnings: ["basic", "hra", "conveyance", "cityAllowance", "kitWashing", "otWages"],
    deductions: ["epf", "esi", "professionalTax", "advance", "others"],
  },
  NONE: {
    earnings: [
      "basic",
      "hra",
      "conveyance",
      "cityAllowance",
      "kitWashing",
      "specialAllowance",
      "otWages",
      "uniform",
      "vda",
      "others",
    ],
    deductions: [
      "epf",
      "esi",
      "professionalTax",
      "belt",
      "boot",
      "uniform",
      "advance",
      "incomeTax",
      "others",
    ],
  },
};

const buildFilteredComponents = (
  allComponents: Record<string, number>,
  allowedKeys: string[],
) => {
  const filtered: Record<string, number> = {};
  let total = 0;

  allowedKeys.forEach((key) => {
    const value = allComponents[key] ?? 0;
    filtered[key] = value;
    total += value;
  });

  return {
    ...filtered,
    total: Number(total.toFixed(2)),
  };
};

// Generate payslips for a post, month and year
const generatePaySlipsByPost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.params;

  const parsedPostId = Number(postId);
  const parsedMonth = Number(month);
  const parsedYear = Number(year);

  if (
    !Number.isInteger(parsedPostId) ||
    !Number.isInteger(parsedMonth) ||
    !Number.isInteger(parsedYear)
  ) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid parameters. postId, month and year must be integers.",
    });
  }

  if (parsedMonth < 1 || parsedMonth > 12) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Month must be an integer between 1 and 12.",
    });
  }

  if (parsedYear < 1900 || parsedYear > 2100) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Year must be a valid integer.",
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

  const monthInWords = months[parsedMonth - 1];
  const totalDaysInMonth = new Date(parsedYear, parsedMonth, 0).getDate();

  const toNumber = (value: any): number =>
    typeof value?.toNumber === "function" ? value.toNumber() : Number(value ?? 0);

  const formatDate = (date: Date | null | undefined): string => {
    if (!date) return "N/A";
    const dayValue = date.getDate();
    const monthValue = date.getMonth() + 1;
    const day = dayValue < 10 ? `0${dayValue}` : String(dayValue);
    const monthPart = monthValue < 10 ? `0${monthValue}` : String(monthValue);
    const yearPart = date.getFullYear();
    return `${day}/${monthPart}/${yearPart}`;
  };

  try {
    const post = await db.post.findUnique({
      where: {
        ID: parsedPostId,
      },
    });

    if (!post || post.isDeleted) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    const payrolls = await db.payroll.findMany({
      where: {
        postId: parsedPostId,
        month: parsedMonth,
        year: parsedYear,
      },
      include: {
        Attendance: true,
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: {
              include: {
                Rank: true,
              },
            },
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
    

    if (payrolls.length === 0) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    // console.log("post.reportName: ", post.reportName);
    // console.log("PAYSLIP_RULE_MATRIX: ", PAYSLIP_RULE_MATRIX);
    const reportType = String(post.reportName ?? "NONE");
    const reportRule = PAYSLIP_RULE_MATRIX[reportType] ?? PAYSLIP_RULE_MATRIX.NONE;
    
    // console.log("reportRule selected: ", reportRule)
    const payslips = payrolls.map((payroll: any) => {
      const employee = payroll.EmpPostRankLink?.Employee;
      const rank = payroll.EmpPostRankLink?.PostRankLink?.Rank;
      const attendance = payroll.Attendance;

      const paidDays = payroll.workingDays ?? attendance?.daysPresent ?? 0;
      const lwp = Math.max(totalDaysInMonth - paidDays, 0);

      const allEarnings: Record<PayslipEarningKey, number> = {
        basic: Math.round(toNumber(payroll.basicSalary)),
        hra: Math.round(toNumber(payroll.hra)),
        conveyance: Math.round(toNumber(payroll.conveyance)),
        cityAllowance: Math.round(toNumber(payroll.cityAllowance)),
        kitWashing: Math.round(toNumber(payroll.kitWashingAllowance)),
        specialAllowance: Math.round(toNumber(payroll.specialAllowance)),
        otWages: Math.round(toNumber(payroll.extraDuty)),
        uniform: Math.round(toNumber(payroll.uniformAllowance)),
        vda: Math.round(toNumber(payroll.vda)),
        others: Math.round(toNumber(payroll.otherAllowance)),
      };

      const allDeductions: Record<PayslipDeductionKey, number> = {
        epf: Math.round(toNumber(payroll.epf)),
        // esi: toNumber(payroll.esi),
        esi: Math.round(toNumber((payroll.empEsiTaxPercent * (Math.round(Number(payroll.basicSalary)) + Math.round(Number(payroll.extraDuty)))) / 100)),
          // TODO: Later we need to make this dynamic based on the report type
        professionalTax: Math.round(toNumber(payroll.pTax)),
        belt: Math.round(toNumber(payroll.beltDeduction)),
        boot: Math.round(toNumber(payroll.bootDeduction)),
        uniform: Math.round(toNumber(payroll.uniformDeduction)),
        advance: Math.round(toNumber(payroll.advance)),
        incomeTax: 0,
        others: Math.round(toNumber(payroll.otherDeduction)),
      };

      const earnings = buildFilteredComponents(allEarnings, reportRule.earnings);
      const deductions = buildFilteredComponents(
        allDeductions,
        reportRule.deductions,
      );

      return {
        employeeProfile: {
          name: employee?.empName ?? "N/A",
          id: employee?.empId ?? String(employee?.ID ?? "N/A"),
          company: post.postName.replace(/&amp;/g, "&"),
          designation: rank?.designation ?? "N/A",
          doj: formatDate(payroll.EmpPostRankLink?.dateOfPosting),
          bankName: employee?.bankName ?? "N/A",
          accountNumber: employee?.accNum ?? "N/A",
          esiNumber: employee?.esiNo ?? "N/A",
          uanNumber: employee?.epfNo ?? "N/A",
        },
        attendance: {
          totalDays: totalDaysInMonth,
          paidDays,
          lwp,
        },
        earnings,
        deductions,
      };
    });

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Payslips generated successfully.",
      payslipData: {
        month: monthInWords,
        year: parsedYear,
        postName: post.postName.replace(/&amp;/g, "&"),
        postId: parsedPostId,
        reportType,
        payslips,
      },
    });
  } catch (error: any) {
    logger.error("Error generating payslips:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while generating payslips.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Update multiple payrolls
const updatePayroll = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  console.log("updatePayroll function called");
  const payrollUpdateData = req.body;

  if (!Array.isArray(payrollUpdateData)) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid request format. Expected an array of payroll updates.",
    });
  }

  try {
    const updateResults = await Promise.all(
      payrollUpdateData.map(async (updateData) => {
        const {
          ID,
          bonus,
          weeklyOff,
          specialAllowance,
          extraDuty,
          advance,
          esi,
          beltDeduction,
          bootDeduction,
          uniformDeduction,
          otherDeduction,
          pTax,
        } = updateData;

        console.log("What is updateData data: ", updateData);
        if (!ID) {
          return {
            ID,
            success: false,
            message: "Payroll ID is required.",
          };
        }

        // Verify if the payroll entry exists
        const existingPayroll = await db.payroll.findUnique({
          where: {
            ID: Number(ID),
          },
        });

        console.log("existingPayroll: ", existingPayroll);

        if (!existingPayroll) {
          return {
            ID,
            success: false,
            message: "Payroll entry does not exist.",
          };
        }

        const existingBasicSalary = existingPayroll.basicSalary ?? 0;
        const existingFourHourPay = existingPayroll.fourHourPay ?? 0;
        const existingEightHourPay = existingPayroll.eightHourPay ?? 0;

        const newGrossPay =
          Number(existingPayroll.basicSalary?.toNumber() ?? 0) +
          Number(existingPayroll.fourHourPay?.toNumber() ?? 0) +
          Number(existingPayroll.eightHourPay?.toNumber() ?? 0) +
          Number(bonus ?? existingPayroll.bonus?.toNumber() ?? 0) +
          Number(weeklyOff ?? existingPayroll.weeklyOff?.toNumber() ?? 0) +
          Number(existingPayroll.conveyance?.toNumber() ?? 0) +
          Number(existingPayroll.kitWashingAllowance?.toNumber() ?? 0) +
          Number(existingPayroll.uniformAllowance?.toNumber() ?? 0) +
          Number(existingPayroll.cityAllowance?.toNumber() ?? 0) +
          Number(
            specialAllowance ??
              existingPayroll.specialAllowance?.toNumber() ??
              0,
          ) +
          Number(extraDuty ?? existingPayroll.extraDuty?.toNumber() ?? 0);
        // Number(esi ?? existingPayroll.esi?.toNumber() ?? 0);

        const newTotalDeduction =
          Number(
            beltDeduction ?? existingPayroll.beltDeduction?.toNumber() ?? 0,
          ) +
          Number(
            bootDeduction ?? existingPayroll.bootDeduction?.toNumber() ?? 0,
          ) +
          Number(
            uniformDeduction ??
              existingPayroll.uniformDeduction?.toNumber() ??
              0,
          ) +
          Number(
            otherDeduction ?? existingPayroll.otherDeduction?.toNumber() ?? 0,
          ) +
          Number(esi ?? existingPayroll.esi?.toNumber() ?? 0) +
          Number(existingPayroll.epf?.toNumber() ?? 0);

        const newAdvance = Number(
          advance ?? existingPayroll.advance?.toNumber() ?? 0,
        );
        const existingPtax = Number(existingPayroll?.pTax ?? 0);

        const newNetPay =
          newGrossPay - newAdvance - newTotalDeduction - existingPtax;

        // TODO: Check if special allowance is needed in new net pay calculation
        // const newNetPay =
        //   Number(existingPayroll?.netPay ?? 0) +
        //   (bonus > 0 && bonus !== Number(existingPayroll?.bonus)
        //     ? bonus - Number(existingPayroll?.bonus)
        //     : bonus === 0
        //       ? -Number(existingPayroll?.bonus)
        //       : 0) -
        //   (weeklyOff > 0 && weeklyOff !== Number(existingPayroll?.weeklyOff)
        //     ? weeklyOff - Number(existingPayroll?.weeklyOff)
        //     : weeklyOff === 0
        //       ? -Number(existingPayroll?.weeklyOff)
        //       : 0) +
        //   (extraDuty > 0 && extraDuty !== Number(existingPayroll?.extraDuty)
        //     ? extraDuty - Number(existingPayroll?.extraDuty)
        //     : extraDuty === 0
        //       ? -Number(existingPayroll?.extraDuty)
        //       : 0) -
        //   (advance > 0 && advance !== Number(existingPayroll?.advance)
        //     ? advance - Number(existingPayroll?.advance)
        //     : advance === 0
        //       ? -Number(existingPayroll?.advance)
        //       : 0) -
        //   (beltDeduction > 0 &&
        //   beltDeduction !== Number(existingPayroll?.beltDeduction)
        //     ? beltDeduction - Number(existingPayroll?.beltDeduction)
        //     : beltDeduction === 0
        //       ? -Number(existingPayroll?.beltDeduction)
        //       : 0) -
        //   (bootDeduction > 0 &&
        //   bootDeduction !== Number(existingPayroll?.bootDeduction)
        //     ? bootDeduction - Number(existingPayroll?.bootDeduction)
        //     : bootDeduction === 0
        //       ? -Number(existingPayroll?.bootDeduction)
        //       : 0) -
        //   (uniformDeduction > 0 &&
        //   uniformDeduction !== Number(existingPayroll?.uniformDeduction)
        //     ? uniformDeduction - Number(existingPayroll?.uniformDeduction)
        //     : uniformDeduction === 0
        //       ? -Number(existingPayroll?.uniformDeduction)
        //       : 0) -
        //   (otherDeduction > 0 &&
        //   otherDeduction !== Number(existingPayroll?.otherDeduction)
        //     ? otherDeduction - Number(existingPayroll?.otherDeduction)
        //     : otherDeduction === 0
        //       ? -Number(existingPayroll?.otherDeduction)
        //       : 0);
        //     -
        // (specialAllowance > 0 &&
        // specialAllowance !== Number(existingPayroll?.specialAllowance)
        //   ? specialAllowance - Number(existingPayroll?.specialAllowance)
        //   : specialAllowance === 0
        //     ? -Number(existingPayroll?.specialAllowance)
        //     : 0);

        const updatedPayroll = await db.payroll.update({
          where: {
            ID: Number(ID),
          },
          data: {
            advance: Number(advance ?? existingPayroll.advance),
            extraDuty: Number(extraDuty ?? existingPayroll.extraDuty),
            bonus: Number(bonus ?? existingPayroll.bonus),
            beltDeduction: Number(
              beltDeduction ?? existingPayroll.beltDeduction,
            ),
            bootDeduction: Number(
              bootDeduction ?? existingPayroll.bootDeduction,
            ),
            uniformDeduction: Number(
              uniformDeduction ?? existingPayroll.uniformDeduction,
            ),
            otherDeduction: Number(
              otherDeduction ?? existingPayroll.otherDeduction,
            ),
            weeklyOff: Number(weeklyOff ?? existingPayroll.weeklyOff),
            specialAllowance: Number(
              specialAllowance ?? existingPayroll.specialAllowance,
            ),
            totalDeduction: newTotalDeduction,
            netPay: newNetPay,
            grossPay: newGrossPay,
            esi: Number(esi ?? existingPayroll.esi),
            pTax: Number(pTax),
          },
        });

        console.log("Updated Payroll:", updatedPayroll);

        return {
          ID,
          success: true,
          message: "Payroll updated successfully.",
          payroll: updatedPayroll,
        };
      }),
    );

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Payrolls updated successfully.",
      results: updateResults,
    });
  } catch (error: any) {
    console.error("Error updating payrolls:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while updating payrolls.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Delete payroll
const deletePayroll = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.params;
  console.log(
    "hitting delete payroll with postId: ",
    postId,
    " month: ",
    month,
    " year: ",
    year,
  );
  try {
    // Delete payroll entries for the specified post, month, and year
    const deletedPayrolls = await db.payroll.deleteMany({
      where: {
        postId: Number(postId),
        month: Number(month),
        year: Number(year),
      },
    });

    if (deletedPayrolls.count === 0) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    return res.status(200).send({
      status: 200,
      success: true,
      message: `${deletedPayrolls.count} Payrolls deleted successfully.`,
      deletedCount: deletedPayrolls.count,
    });
  } catch (error: any) {
    console.error("Error deleting payrolls:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while deleting payrolls.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Get payroll status
const getPayrollStatus = async (req: Request, res: Response) => {
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
    const posts = await db.post.findMany({
      where: {
        isDeleted: false,
      },
    });

    const payrollStatus = await Promise.all(
      posts.map(async (post) => {
        // Check if payroll records exist for the given post, month, and year
        const payrollRecords = await db.payroll.findMany({
          where: {
            year: parseInt(year),
            month: parseInt(month),
            postId: post.ID,
          },
        });

        // Determine payroll status
        const status = payrollRecords.length > 0 ? "Completed" : "Pending";

        return {
          postId: post.ID,
          postName: post.postName.replace(/&amp;/g, "&"),
          status,
        };
      }),
    );

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Payroll status fetched successfully.",
      payrollStatus,
      month: monthInWords,
      year,
    });
  } catch (error) {
    logger.error("Error fetching payroll status: ", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching payroll status.",
    });
  }
};

export {
  createPayroll,
  viewPayroll,
  generatePaySlipsByPost,
  updatePayroll,
  deletePayroll,
  getPayrollStatus,
};
