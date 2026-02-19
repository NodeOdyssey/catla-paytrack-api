// Import npm modules
import { Request, Response } from "express";

// Import helpers
import logger from "../helpers/logger";

// Import database
import { db } from "../configs/db.config";
import { format } from "path";
import {
  Attendance,
  Employee,
  Payroll,
  Rank,
  TaxesAndDeduction,
} from "@prisma/client";
import { calculatePTax } from "../helpers/functions";

const findPtax = (basicSalary: number): number => {
  if (basicSalary < 10000) {
    return 0;
  } else if (basicSalary >= 10000 && basicSalary < 15000) {
    return 150;
  } else {
    return 180;
  }
};

function calculateNetPayByReportType(reportName: string, payroll: any): number {
  switch (reportName) {
    case "VIEW_DS_REPORT":
      // DS Report calculation (same as viewDsReport)
      const dsGrossPay =
        (payroll.basicSalary?.toNumber() ?? 0) +
        (payroll.hra?.toNumber() ?? 0) +
        (payroll.conveyance?.toNumber() ?? 0) +
        (payroll.kitWashingAllowance?.toNumber() ?? 0) +
        (payroll.cityAllowance?.toNumber() ?? 0) +
        (payroll.extraDuty?.toNumber() ?? 0);

      const dsEsi =
        payroll.esi?.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * dsGrossPay) / 100
          : 0;
      const dsEpf =
        ((payroll.empEpfTaxPercent ?? 0) *
          (payroll.basicSalary?.toNumber() ?? 0)) /
        100;
      const dsAdvance = payroll.advance?.toNumber() ?? 0;
      const dsBeltDeduction = payroll.beltDeduction?.toNumber() ?? 0;
      const dsBootDeduction = payroll.bootDeduction?.toNumber() ?? 0;
      const dsUniformDeduction = payroll.uniformDeduction?.toNumber() ?? 0;
      const dsOtherDeduction = payroll.otherDeduction?.toNumber() ?? 0;
      const dsPTax = payroll.pTax?.toNumber() ?? 0;

      const dsTotalDeduction =
        Math.round(dsEsi) +
        Math.round(dsEpf) +
        Math.round(dsAdvance) +
        Math.round(dsBeltDeduction) +
        Math.round(dsBootDeduction) +
        Math.round(dsUniformDeduction) +
        Math.round(dsOtherDeduction) +
        Math.round(dsPTax);

      return Math.round(dsGrossPay) - Math.round(dsTotalDeduction);

    case "WITHOUT_ALLOWANCE_REPORT":
      // Without Allowance Report calculation (same as viewtWithoutAllowanceReport)
      const waGrossPay =
        (payroll.basicSalary?.toNumber() ?? 0) +
        (payroll.extraDuty?.toNumber() ?? 0);

      const waEsi =
        payroll.esi?.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * waGrossPay) / 100
          : 0;
      const waEpf =
        ((payroll.empEpfTaxPercent ?? 0) *
          (payroll.basicSalary?.toNumber() ?? 0)) /
        100;
      const waAdvance = payroll.advance?.toNumber() ?? 0;
      const waBeltDeduction = payroll.beltDeduction?.toNumber() ?? 0;
      const waBootDeduction = payroll.bootDeduction?.toNumber() ?? 0;
      const waUniformDeduction = payroll.uniformDeduction?.toNumber() ?? 0;
      const waOtherDeduction = payroll.otherDeduction?.toNumber() ?? 0;
      const waPTax = payroll.pTax?.toNumber() ?? 0;
      const waBonus = payroll.bonus?.toNumber() ?? 0;

      const waTotalDeduction =
        Math.round(waEsi) +
        Math.round(waEpf) +
        Math.round(waAdvance) +
        Math.round(waBeltDeduction) +
        Math.round(waBootDeduction) +
        Math.round(waUniformDeduction) +
        Math.round(waOtherDeduction) +
        Math.round(waPTax);

      return (
        Math.round(waGrossPay) +
        Math.round(waBonus) -
        Math.round(waTotalDeduction)
      );

    case "NEW_PAYROLL_REPORT":
      // New Payroll Report calculation (same as viewNewPayrollReport)
      const npBasicSalary = Number(payroll.basicSalary);
      const npUniform = Number(payroll.uniformAllowance);
      const npBonus = Number(payroll.bonus);
      const npExtraDuty = Number(payroll.extraDuty);

      const npGrossPay =
        Math.round(npBasicSalary) +
        Math.round(npUniform) +
        Math.round(npBonus) +
        Math.round(npExtraDuty);

      const npEsi =
        payroll.esi?.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) *
              (Math.round(npBasicSalary) + Math.round(npExtraDuty))) /
            100
          : 0;
      const npEpf =
        ((payroll.empEpfTaxPercent ?? 0) * Math.round(npBasicSalary)) / 100;
      const npOtherDeduction = payroll.otherDeduction?.toNumber() ?? 0;
      const npPTax = payroll.pTax?.toNumber() ?? 0;

      const npTotalDeduction =
        Math.round(npEsi) +
        Math.round(npEpf) +
        Math.round(npOtherDeduction) +
        Math.round(npPTax);

      return Math.round(npGrossPay) - Math.round(npTotalDeduction);

    case "DSL_REPORT":
      // DSL Report calculation (same as viewDslReport)
      const dslEightHourPay = Number(payroll.basicSalary);
      const dslUniform = payroll.uniformAllowance?.toNumber() ?? 0;
      const dslExtraDuty = payroll.extraDuty?.toNumber() ?? 0;
      const dslGrossPay =
        Math.round(dslEightHourPay) +
        Math.round(dslUniform) +
        Math.round(dslExtraDuty);

      const dslEmpESI =
        payroll.esi?.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * dslGrossPay) / 100
          : 0;
      const dslEmpEPF =
        ((payroll.empEpfTaxPercent ?? 0) * dslEightHourPay) / 100;
      const dslAdv = payroll.advance?.toNumber() ?? 0;
      const dslPTax = payroll.pTax?.toNumber() ?? 0;

      const dslTotalDeduction =
        Math.round(dslEmpEPF) +
        Math.round(dslEmpESI) +
        Math.round(dslPTax) +
        Math.round(dslAdv);

      return Math.round(dslGrossPay) - Math.round(dslTotalDeduction);

    case "LNT_REPORT":
      // LNT Report calculation (same as viewLntReport)
      const lntEightHourPay = Number(payroll.basicSalary);
      const lntUniform = payroll.uniformAllowance?.toNumber() ?? 0;
      const lntSpecialAllowance = payroll.specialAllowance?.toNumber() ?? 0;
      const lntWeeklyOff = payroll.weeklyOff?.toNumber() ?? 0;
      const lntExtraDuty = payroll.extraDuty?.toNumber() ?? 0;
      const lntGrossPay =
        Math.round(lntEightHourPay) +
        Math.round(lntUniform) +
        Math.round(lntSpecialAllowance) +
        Math.round(lntWeeklyOff) +
        Math.round(lntExtraDuty);

      const lntEmpESI =
        payroll.esi?.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * (lntGrossPay - lntWeeklyOff)) /
            100
          : 0;
      const lntEmpEPF =
        ((payroll.empEpfTaxPercent ?? 0) * lntEightHourPay) / 100;
      const lntAdv = payroll.advance?.toNumber() ?? 0;
      const lntPTax = payroll.pTax?.toNumber() ?? 0;

      const lntTotalDeduction =
        Math.round(lntEmpEPF) +
        Math.round(lntEmpESI) +
        Math.round(lntPTax) +
        Math.round(lntAdv);

      return Math.round(lntGrossPay) - Math.round(lntTotalDeduction);

    case "OTHERS_REPORT":
      // Others Report calculation (same as viewOtherReport)
      const othersBasicSalary = payroll.basicSalary?.toNumber() ?? 0;
      const othersKitAllowances = payroll.kitWashingAllowance?.toNumber() ?? 0;
      const othersCityAllowances = payroll.cityAllowance?.toNumber() ?? 0;
      const othersConvHra =
        (payroll.hra?.toNumber() ?? 0) + (payroll.conveyance?.toNumber() ?? 0);
      const othersGrossPay =
        Math.round(othersBasicSalary) +
        Math.round(othersKitAllowances) +
        Math.round(othersCityAllowances) +
        Math.round(othersConvHra);

      const othersEmpESI =
        payroll.esi?.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) *
              (othersGrossPay +
                Math.round(payroll.extraDuty?.toNumber() ?? 0))) /
            100
          : 0;
      const othersEmpEPF =
        ((payroll.empEpfTaxPercent ?? 0) * othersBasicSalary) / 100;
      const othersAdv = payroll.advance?.toNumber() ?? 0;
      const othersBeltDeduction = payroll.beltDeduction?.toNumber() ?? 0;
      const othersUniformDeduction = payroll.uniformDeduction?.toNumber() ?? 0;
      const othersPTax = payroll.pTax?.toNumber() ?? 0;

      const othersTotalDeduction =
        Math.round(othersEmpEPF) +
        Math.round(othersEmpESI) +
        Math.round(othersAdv) +
        Math.round(othersPTax) +
        Math.round(othersBeltDeduction) +
        Math.round(othersUniformDeduction);

      const othersExtraDuty = payroll.extraDuty?.toNumber() ?? 0;
      const othersUniform = payroll.uniformAllowance?.toNumber() ?? 0;
      const othersFourHourPay = payroll.fourHourPay?.toNumber() ?? 0;
      const othersSpecialAllowance = payroll.specialAllowance?.toNumber() ?? 0;
      const othersBonus = payroll.bonus?.toNumber() ?? 0;

      return (
        Math.round(othersGrossPay) +
        Math.round(othersExtraDuty) +
        Math.round(othersUniform) +
        Math.round(othersFourHourPay) +
        Math.round(othersSpecialAllowance) +
        Math.round(othersBonus) -
        Math.round(othersTotalDeduction)
      );

    case "NONE":
      return 0;
    default:
      return 0;
  }
}

// Helper: Calculate gross pay dynamically per report type (used by ESI reports)
function calculateGrossPayForESIByReportType(
  reportName: string,
  payroll: any,
): { grossPay: number; esiGrossPay: number } {
  switch (reportName) {
    case "VIEW_DS_REPORT": {
      const basicSalary = Number(payroll.basicSalary ?? 0);
      const hra = Number(payroll.hra ?? 0);
      const conveyance = Number(payroll.conveyance ?? 0);
      const kitWashingAllowance = Number(payroll.kitWashingAllowance ?? 0);
      const cityAllowance = Number(payroll.cityAllowance ?? 0);
      const extraDuty = Number(payroll.extraDuty ?? 0);
      const grossPay =
        Math.round(basicSalary) +
        Math.round(hra) +
        Math.round(conveyance) +
        Math.round(kitWashingAllowance) +
        Math.round(cityAllowance) +
        Math.round(extraDuty);
      // return Math.round(grossPay);
      return {
        grossPay,
        esiGrossPay: grossPay,
      };
    }
    case "WITHOUT_ALLOWANCE_REPORT": {
      const basicSalary = Number(payroll.basicSalary ?? 0);
      const extraDuty = Number(payroll.extraDuty ?? 0);
      const grossPay = Math.round(basicSalary) + Math.round(extraDuty);
      // return Math.round(grossPay);
      return {
        grossPay,
        esiGrossPay: grossPay,
      };
    }
    case "NEW_PAYROLL_REPORT": {
      const basicSalary = Number(payroll.basicSalary ?? 0);
      const uniform = Number(payroll.uniformAllowance ?? 0);
      const bonus = Number(payroll.bonus ?? 0);
      const extraDuty = Number(payroll.extraDuty ?? 0);
      const grossPay =
        Math.round(basicSalary) +
        Math.round(uniform) +
        Math.round(bonus) +
        Math.round(extraDuty);
      // return Math.round(grossPay);
      return {
        grossPay,
        esiGrossPay: grossPay - Math.round(uniform) - Math.round(bonus),
      };
    }
    case "DSL_REPORT": {
      const eightHourPay = Number(payroll.basicSalary ?? 0);
      const uniform = Number(payroll.uniformAllowance ?? 0);
      const extraDuty = Number(payroll.extraDuty ?? 0);
      const grossPay =
        Math.round(eightHourPay) + Math.round(uniform) + Math.round(extraDuty);
      // return Math.round(grossPay);
      return {
        grossPay,
        esiGrossPay: grossPay,
      };
    }
    case "LNT_REPORT": {
      const eightHourPay = Number(payroll.basicSalary ?? 0);
      const uniform = Number(payroll.uniformAllowance ?? 0);
      const specialAllowance = Number(payroll.specialAllowance ?? 0);
      const weeklyOff = Number(payroll.weeklyOff ?? 0);
      const extraDuty = Number(payroll.extraDuty ?? 0);
      const grossPay =
        Math.round(eightHourPay) +
        Math.round(uniform) +
        Math.round(specialAllowance) +
        Math.round(weeklyOff) +
        Math.round(extraDuty);
      return {
        grossPay,
        esiGrossPay: grossPay - Math.round(weeklyOff),
      };
      // return Math.round(grossPay);
    }
    case "OTHERS_REPORT": {
      const basicSalary = Number(payroll.basicSalary ?? 0);
      const kitAllowances = Number(payroll.kitWashingAllowance ?? 0);
      const cityAllowances = Number(payroll.cityAllowance ?? 0);
      const convHra =
        Number(payroll.hra ?? 0) + Number(payroll.conveyance ?? 0);
      const grossPay =
        Math.round(basicSalary) +
        Math.round(kitAllowances) +
        Math.round(cityAllowances) +
        Math.round(convHra);
      const extraDuty = Number(payroll.extraDuty ?? 0);
      return {
        grossPay,
        esiGrossPay: grossPay + Math.round(extraDuty),
      };
      // return Math.round(grossPay);
    }
    case "NONE":
    default:
      return {
        grossPay: 0,
        esiGrossPay: 0,
      };
  }
}

// Function to view DS Report
const viewDsReport = async (req: Request, res: Response): Promise<Response> => {
  const { postId, month, year } = req.params;

  try {
    // Verify if the post exists
    const post = await db.post.findUnique({
      where: {
        ID: Number(postId),
      },
    });

    if (!post || post.isDeleted) {
      console.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
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

    // Exclude payrolls with zero days present
    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }
    let index = 0;
    // Format DS report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const daysPresent = payroll.Attendance?.daysPresent ?? 0;

      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;

      const basicSalary: number = payroll.basicSalary?.toNumber() ?? 0;
      const extraDuty = payroll.extraDuty?.toNumber() ?? 0;
      const bonus = payroll.bonus?.toNumber() ?? 0;

      // Allowances
      const kitAllowance = payroll.kitWashingAllowance?.toNumber() ?? 0;
      // console.log("kit allowance in ds report ", kitAllowance);
      const convHra =
        (payroll.hra?.toNumber() ?? 0) + (payroll.conveyance?.toNumber() ?? 0);
      const cityAllowance = payroll.cityAllowance?.toNumber() ?? 0;
      console.log("kit allowance :", kitAllowance);
      console.log("convHra :", convHra);
      console.log("cityAllowance  :", cityAllowance);
      const grossPay: number = parseFloat(
        (
          basicSalary +
          convHra +
          kitAllowance +
          cityAllowance +
          extraDuty
        ).toFixed(2),
      );
      console.log("grossPay :", grossPay);
      const esi =
        payroll.esi.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * grossPay) / 100
          : 0;
      const epf = ((payroll.empEpfTaxPercent ?? 0) * basicSalary) / 100;
      const advance = payroll.advance?.toNumber() ?? 0;
      const beltDeduction = payroll.beltDeduction?.toNumber() ?? 0;
      const bootDeduction = payroll.bootDeduction?.toNumber() ?? 0;
      const uniformDeduction = payroll.uniformDeduction?.toNumber() ?? 0;
      const otherDeduction = payroll.otherDeduction?.toNumber() ?? 0;
      // const pTax = calculatePTax(basicSalary);
      const pTax = payroll.pTax?.toNumber() ?? 0;

      const totalDeduction =
        Math.round(esi) +
        Math.round(epf) +
        Math.round(advance) +
        Math.round(beltDeduction) +
        Math.round(bootDeduction) +
        Math.round(uniformDeduction) +
        Math.round(otherDeduction) +
        Math.round(pTax);

      console.log("totalDeduction :", totalDeduction);
      const netPay = grossPay - totalDeduction;

      // Helper function to format numbers
      const formatNumber = (num: number): number =>
        Math.round(parseFloat(num.toFixed(2)));

      return {
        slNo: index,
        empName: employee?.empName ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        basicSalary: formatNumber(basicSalary),
        allowances: {
          kitAllowances: formatNumber(kitAllowance),
          cityAllowances: formatNumber(cityAllowance),
          convHra: formatNumber(convHra),
        },
        grossPay: formatNumber(grossPay),
        extraDuty: formatNumber(extraDuty),
        deduction: {
          empESI: formatNumber(esi),
          empEPF: formatNumber(epf),
          adv: formatNumber(advance),
          pTax: formatNumber(pTax),
        },
        other: {
          belt: formatNumber(beltDeduction),
          boot: formatNumber(bootDeduction),
          uniform: formatNumber(uniformDeduction),
        },
        otherDeduction: formatNumber(otherDeduction),
        totalDeduction: formatNumber(totalDeduction),
        netPay: formatNumber(netPay),
      };
    });

    const totalGrossPay: number = formattedReports.reduce(
      (total, report) => total + report.grossPay,
      0,
    );

    const totalNetPay: number = formattedReports.reduce(
      (total, report) => total + report.netPay,
      0,
    );

    console.info("DS Report retrieved successfully.");

    return res.status(200).send({
      status: 200,
      success: true,
      message: "DS Report retrieved successfully.",
      dsReports: formattedReports,
      totalGrossPay,
      totalNetPay,
    });
  } catch (error: any) {
    console.error("Error viewing DS report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing DS report.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Function to view ESI report
const viewEsiReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  console.log("hitting view ESI report");
  const { postId, month, year } = req.params;

  try {
    // Verify if the post exists
    const post = await db.post.findUnique({
      where: {
        ID: Number(postId),
      },
    });

    if (!post || post.isDeleted) {
      console.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
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

    // Exclude payrolls with zero days present
    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    let index = 0;
    // Format ESI report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;

      const basicSalary: number = payroll.basicSalary.toNumber() ?? 0;
      const extraDuty: number = payroll.extraDuty?.toNumber() ?? 0;

      const kitAllowance: number = payroll.kitWashingAllowance?.toNumber() ?? 0;
      const convHra =
        (payroll.hra?.toNumber() ?? 0) + (payroll.conveyance?.toNumber() ?? 0);
      const cityAllowance = payroll.cityAllowance?.toNumber() ?? 0;
      console.log("What is basic salary : ", basicSalary);
      console.log("Allowances: ", kitAllowance, convHra, cityAllowance);
      const grossPay: number =
        basicSalary + convHra + kitAllowance + cityAllowance + extraDuty;

      console.log("calculated gross pay ", grossPay);
      // const empESI = ((payroll.empEsiTaxPercent ?? 0) * grossPay) / 100;
      const empESI =
        payroll.esi.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * grossPay) / 100
          : 0;

      const emplrESI: number =
        empESI !== 0 ? ((payroll.emplrEsiTaxPercent ?? 0) * grossPay) / 100 : 0;

      // Helper function to format numbers
      // Helper function to format numbers
      const formatNumber = (num: any): string => {
        const value = Math.round(Number(num)); // Convert to number
        return isNaN(value) ? "0.00" : value.toFixed(2); // Handle invalid numbers
      };

      return {
        slNo: index,
        accNo: employee?.esiNo ?? "N/A",
        empName: employee?.empName ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        grossPay: formatNumber(grossPay),
        empESI: formatNumber(empESI),
        emplrESI: formatNumber(emplrESI),
        total: formatNumber(empESI + emplrESI),
      };
    });

    // Calculate total gross pay and grand total of total ESI
    const totalGrossPay = formattedReports.reduce(
      (sum, report) => sum + parseFloat(report.grossPay),
      0,
    );

    const grandTotalEsi = formattedReports.reduce(
      (sum, report) => sum + parseFloat(report.total),
      0,
    );

    console.info("ESI Report retrieved successfully.");
    console.log("what are ESI reports data? ", formattedReports);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "ESI Report retrieved successfully.",
      esiReports: formattedReports,
      totalGrossPay: totalGrossPay.toFixed(2),
      grandTotalEsi: grandTotalEsi.toFixed(2),
    });
  } catch (error: any) {
    console.error("Error viewing ESI report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing ESI report.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Function to view DS Report without allowance row data
const viewtWithoutAllowanceReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.params;

  try {
    const post = await db.post.findUnique({
      where: {
        ID: Number(postId),
      },
    });

    if (!post || post.isDeleted) {
      console.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        postId: Number(postId),
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: { include: { Post: true, Rank: true } },
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

    // Exclude payrolls with zero days present
    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    let index = 0;
    // Format Without Allowance report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;

      const postRank = payroll.EmpPostRankLink?.PostRankLink;
      const designation = postRank?.Rank?.designation;

      const basicSalary = payroll.basicSalary?.toNumber() ?? 0;
      const extraDuty = payroll.extraDuty?.toNumber() ?? 0;
      const bonus: number = payroll.bonus?.toNumber() ?? 0;

      const grossPay: number = basicSalary + extraDuty; // TODO: Roundoff needed ?

      const esi =
        payroll.esi.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * grossPay) / 100
          : 0;
      const epf = ((payroll.empEpfTaxPercent ?? 0) * basicSalary) / 100;

      const advance = payroll.advance?.toNumber() ?? 0;
      const beltDeduction = payroll.beltDeduction?.toNumber() ?? 0;
      const bootDeduction = payroll.bootDeduction?.toNumber() ?? 0;
      const uniformDeduction = payroll.uniformDeduction?.toNumber() ?? 0;
      const otherDeduction = payroll?.otherDeduction?.toNumber() ?? 0;

      // const pTax = calculatePTax(basicSalary);
      const pTax = payroll.pTax?.toNumber() ?? 0;

      const totalDeduction =
        Math.round(esi) +
        Math.round(epf) +
        Math.round(advance) +
        Math.round(beltDeduction) +
        Math.round(bootDeduction) +
        Math.round(uniformDeduction) +
        Math.round(otherDeduction) +
        Math.round(pTax);

      const netPay: number =
        Math.round(grossPay) + Math.round(bonus) - Math.round(totalDeduction);

      // Helper function to format numbers
      const formatNumber = (num: number): string => Math.round(num).toFixed(2);

      return {
        slNo: index,
        empName: employee?.empName ?? "N/A",
        rank: designation ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        basicSalary: formatNumber(basicSalary),
        extraDuty: formatNumber(extraDuty),
        deduction: {
          empESI: formatNumber(esi),
          empEPF: formatNumber(epf),
          adv: formatNumber(advance),
          pTax: formatNumber(pTax),
        },
        other: {
          belt: formatNumber(beltDeduction),
          boot: formatNumber(bootDeduction),
          uniform: formatNumber(uniformDeduction),
        },
        bonus: formatNumber(bonus),
        otherDeduction: formatNumber(otherDeduction),
        totalDeduction: formatNumber(totalDeduction),
        netPay: formatNumber(netPay),
      };
    });

    const totalBasicSalary: number = formattedReports.reduce(
      (prev, curr) => prev + parseFloat(curr.basicSalary),
      0,
    );

    const totalNetPay: number = formattedReports.reduce(
      (prev, curr) => prev + parseFloat(curr.netPay),
      0,
    );

    console.info("Without Allowance Report retrieved successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Without Allowance Report retrieved successfully.",
      withoutAllowanceReports: formattedReports,
      totalBasicSalary,
      totalNetPay,
    });
  } catch (error: any) {
    console.error("Error viewing DS report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing DS report.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Function to view new payroll report
const viewNewPayrollReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.params;

  try {
    const post = await db.post.findUnique({
      where: {
        ID: Number(postId),
      },
    });

    if (!post || post.isDeleted) {
      console.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
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

    // Exclude payrolls with zero days present
    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    const formatNumber = (num: number): string => Math.round(num).toFixed(2);
    let index = 0;
    // Format New Payroll report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;

      const postRank = payroll.EmpPostRankLink?.PostRankLink;
      const designation = postRank?.Rank?.designation;

      // const basicSalary: number = payroll.basicSalary?.toNumber() ?? 0;
      // const uniform: number = payroll?.uniformAllowance?.toNumber() ?? 0;
      // const bonus: number = payroll.bonus?.toNumber() ?? 0;
      const basicSalary = Number(payroll.basicSalary);
      const uniform = Number(payroll.uniformAllowance);
      const bonus = Number(payroll.bonus);
      const extraDuty = Number(payroll.extraDuty);

      console.log(
        "basicSalary",
        basicSalary,
        "uniform",
        uniform,
        "bonus",
        bonus,
      );

      // const grossPay: number =
      //   basicSalary +
      //   (payroll.uniformAllowance?.toNumber() ?? 0) +
      //   (payroll.bonus?.toNumber() ?? 0) +
      //   (payroll.extraDuty?.toNumber() ?? 0);

      // const extraDuty: number = payroll.extraDuty?.toNumber() ?? 0;

      const grossPay =
        Math.round(basicSalary) +
        Math.round(uniform) +
        Math.round(bonus) +
        Math.round(extraDuty);
      // const grossPay = basicSalary + uniform + bonus;

      // const esi =
      //   ((payroll.empEsiTaxPercent ?? 0) * (grossPay + extraDuty)) / 100;
      // const epf = ((payroll.empEpfTaxPercent ?? 0) * basicSalary) / 100;
      const esi =
        payroll.esi.toNumber() !== 0
          ? // ? ((payroll.empEsiTaxPercent ?? 0) * basicSalary + extraDuty) / 100
            ((payroll.empEsiTaxPercent ?? 0) *
              (Math.round(basicSalary) + Math.round(extraDuty))) /
            100 // TODO: Roundoff needed ?
          : 0;
      console.log("esi in new payroll report: ", esi);
      const epf: number =
        ((payroll.empEpfTaxPercent ?? 0) * Math.round(basicSalary)) / 100;
      const emplrESI: number =
        esi !== 0
          ? // ? ((payroll.emplrEsiTaxPercent ?? 0) * basicSalary + extraDuty) / 100
            ((payroll.emplrEsiTaxPercent ?? 0) *
              (Math.round(basicSalary) + Math.round(extraDuty))) / // TODO: Roundoff needed ?
            100
          : 0;
      const emplrEPF: number =
        ((payroll.emplrEpfTaxPercent ?? 0) * Math.round(basicSalary)) / 100;

      console.log(
        "esi",
        esi,
        "epf",
        epf,
        "emplrESI",
        emplrESI,
        "emplrEPF",
        emplrEPF,
      );
      const otherDeduction: number = payroll?.otherDeduction?.toNumber() ?? 0;

      // const pTax = calculatePTax(basicSalary);
      const pTax: number = payroll.pTax?.toNumber() ?? 0;

      const totalDeduction: number =
        Math.round(esi) +
        Math.round(epf) +
        Math.round(otherDeduction) +
        Math.round(pTax);

      const netPay: number = grossPay - totalDeduction;

      // Helper function to format numbers
      const formatNumber = (num: number): number =>
        parseFloat(Math.round(num).toFixed(2));

      return {
        slNo: index,
        empName: employee?.empName ?? "N/A",
        rank: designation ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        basicSalary: formatNumber(basicSalary),
        uniform: formatNumber(uniform),
        bonus: formatNumber(bonus),
        total: formatNumber(grossPay),
        extraDuty: formatNumber(extraDuty),
        deduction: {
          empEPF: formatNumber(epf),
          empESI: formatNumber(esi),
          emplrEPF: formatNumber(emplrEPF),
          emplrESI: formatNumber(emplrESI),
        },
        pTax: formatNumber(pTax),
        otherDeduction: formatNumber(otherDeduction),
        totalDeduction: formatNumber(totalDeduction),
        netPay: formatNumber(netPay),
      };
    });

    const totalBasicSalary: number = formattedReports.reduce(
      (total, report) => total + report.basicSalary,
      0,
    );

    const totalNetPay: number = formattedReports.reduce(
      (total, report) => total + report.netPay,
      0,
    );

    console.info("New Payroll Report retrieved successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      message: "New Payroll Report retrieved successfully.",
      newPayrollReports: formattedReports,
      totalBasicSalary: formatNumber(totalBasicSalary),
      totalNetPay: formatNumber(totalNetPay),
    });
  } catch (error: any) {
    logger.error("Error viewing new payroll report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing new payroll report.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Function to view DSL report
const viewDslReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.params;

  console.log(
    " hitting dsl report with postId: ",
    postId,
    " month: ",
    month,
    " year: ",
    year,
  );
  try {
    const post = await db.post.findUnique({
      where: {
        ID: Number(postId),
      },
    });

    if (!post || post.isDeleted) {
      console.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
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

    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    let index = 0;
    // Format DSL report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;

      const postRank = payroll.EmpPostRankLink?.PostRankLink;
      const designation = postRank?.Rank?.designation;

      const basicSalary = payroll.basicSalary?.toNumber() ?? 0;
      console.log("Checkin basic salary in dsl report:::", basicSalary);
      // const eightHourPay: number =
      //   (basicSalary / new Date(Number(year), Number(month), 0).getDate()) *
      //   (attendance?.daysPresent ?? 0);
      const eightHourPay = Number(payroll.basicSalary);
      const extraDuty: number = payroll.extraDuty?.toNumber() ?? 0;

      const vda: number = payroll.vda?.toNumber() ?? 0;
      const uniform: number = payroll.uniformAllowance?.toNumber() ?? 0;
      // const hra: number = payroll.hra?.toNumber() ?? 0;

      const adv: number = payroll.advance?.toNumber() ?? 0;

      // const grossPay: number = eightHourPay + vda + uniform + hra + extraDuty;
      const grossPay: number =
        Math.round(eightHourPay) +
        // Math.round(vda) +
        Math.round(uniform) +
        Math.round(extraDuty);

      const empESI =
        payroll.esi.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * grossPay) / 100
          : 0;
      const empEPF = ((payroll.empEpfTaxPercent ?? 0) * eightHourPay) / 100;
      const emplrESI: number =
        empESI !== 0 ? ((payroll.emplrEsiTaxPercent ?? 0) * grossPay) / 100 : 0;
      const emplrEPF: number =
        ((payroll.emplrEpfTaxPercent ?? 0) * eightHourPay) / 100;

      // const pTax = calculatePTax(basicSalary);
      const pTax: number = payroll.pTax?.toNumber() ?? 0;
      // const weeklyOff = payroll.weeklyOff?.toNumber() ?? 0;

      const totalDeduction: number =
        // empEPF + empESI + pTax + adv + weeklyOff + emplrEPF + emplrESI;
        Math.round(empEPF) +
        Math.round(empESI) +
        Math.round(pTax) +
        Math.round(adv);

      const netPay: number = grossPay - totalDeduction;

      // Helper function to format numbers
      const formatNumber = (num: number): string => Math.round(num).toFixed(2);

      return {
        slNo: index,
        empName: employee?.empName ?? "N/A",
        rank: designation ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        eightHourPay: formatNumber(eightHourPay),
        vda: formatNumber(vda),
        uniform: formatNumber(uniform),
        // hra: formatNumber(hra),
        hra: formatNumber(0),
        total: formatNumber(grossPay),
        extraDuty: formatNumber(extraDuty),
        adv: formatNumber(adv),
        deduction: {
          empEPF: formatNumber(empEPF),
          empESI: formatNumber(empESI),
          emplrEPF: formatNumber(emplrEPF),
          emplrESI: formatNumber(emplrESI),
          pTax: formatNumber(pTax),
        },
        totalDeduction: formatNumber(totalDeduction),
        netPay: formatNumber(netPay),
      };
    });

    const totalGrossPay: number = formattedReports.reduce(
      (acc, curr) => acc + parseFloat(curr.total),
      0,
    );

    const totalNetPay: number = formattedReports.reduce(
      (acc, curr) => acc + parseFloat(curr.netPay),
      0,
    );

    console.info("DSL Report retrieved successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      message: "DSL Report retrieved successfully.",
      dslReports: formattedReports,
      totalGrossPay,
      totalNetPay,
    });
  } catch (error: any) {
    console.error("Error viewing DSL report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing DSL report.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Function to view LST report
const viewLntReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.params;
  console.log(
    "hitting lnt report with postId: ",
    postId,
    " month: ",
    month,
    " year: ",
    year,
  );
  try {
    const post = await db.post.findUnique({
      where: {
        ID: Number(postId),
      },
    });

    if (!post || post.isDeleted) {
      console.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
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

    // Exclude payrolls with zero days present
    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    let index = 0;
    // Format LST report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;

      const postRank = payroll.EmpPostRankLink?.PostRankLink;
      const designation = postRank?.Rank?.designation;

      const basicSalary: number = payroll.basicSalary?.toNumber() ?? 0;
      // const eightHourPay: number =
      //   (basicSalary / new Date(Number(year), Number(month), 0).getDate()) *
      //   (attendance?.daysPresent ?? 0);
      const eightHourPay = Number(payroll.basicSalary);
      const extraDuty: number = payroll.extraDuty?.toNumber() ?? 0;

      const vda: number = payroll.vda?.toNumber() ?? 0;
      const uniform: number = payroll.uniformAllowance?.toNumber() ?? 0;
      const specialAllowance: number =
        payroll.specialAllowance?.toNumber() ?? 0;
      const weeklyOff = payroll.weeklyOff?.toNumber() ?? 0;

      // const grossPay: number = eightHourPay + vda + uniform + specialAllowance;
      const grossPay =
        Math.round(eightHourPay) +
        Math.round(uniform) +
        Math.round(specialAllowance) +
        Math.round(weeklyOff) +
        Math.round(extraDuty);

      // const empESI =
      //   ((payroll.empEsiTaxPercent ?? 0) * (grossPay - weeklyOff)) / 100;
      // const empEPF = ((payroll.empEpfTaxPercent ?? 0) * eightHourPay) / 100;
      // const emplrESI: number =
      //   ((payroll.emplrEsiTaxPercent ?? 0) * (grossPay - weeklyOff)) / 100;
      // const emplrEPF: number =
      //   ((payroll.emplrEpfTaxPercent ?? 0) * eightHourPay) / 100;

      const empESI =
        payroll.esi.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * (grossPay - weeklyOff)) / 100
          : 0;
      const empEPF = ((payroll.empEpfTaxPercent ?? 0) * eightHourPay) / 100;
      const emplrESI: number =
        empESI !== 0
          ? ((payroll.emplrEsiTaxPercent ?? 0) * (grossPay - weeklyOff)) / 100
          : 0;
      const emplrEPF: number =
        ((payroll.emplrEpfTaxPercent ?? 0) * eightHourPay) / 100;

      const adv: number = payroll.advance?.toNumber() ?? 0;
      // const pTax = calculatePTax(basicSalary);
      const pTax: number = payroll.pTax?.toNumber() ?? 0;

      const totalDeduction: number =
        Math.round(empEPF) +
        Math.round(empESI) +
        Math.round(pTax) +
        Math.round(adv);

      const netPay: number = grossPay - totalDeduction;

      // Helper function to format numbers
      const formatNumber = (num: number): string => Math.round(num).toFixed(2);

      return {
        slNo: index,
        empName: employee?.empName ?? "N/A",
        rank: designation ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        eightHourPay: formatNumber(eightHourPay),
        vda: formatNumber(vda),
        uniform: formatNumber(uniform),
        specialAllowance: formatNumber(specialAllowance),
        weeklyOff: formatNumber(weeklyOff),
        total: formatNumber(grossPay),
        extraDuty: formatNumber(extraDuty),
        adv: formatNumber(adv),
        deduction: {
          empEPF: formatNumber(empEPF),
          empESI: formatNumber(empESI),
          emplrEPF: formatNumber(emplrEPF),
          emplrESI: formatNumber(emplrESI),
          pTax: formatNumber(pTax),
        },
        totalDeduction: formatNumber(totalDeduction),
        netPay: formatNumber(netPay),
      };
    });

    const totalAllowance: number = formattedReports.reduce(
      (acc, curr) => acc + parseFloat(curr.total),
      0,
    );

    const totalNetPay: number = formattedReports.reduce(
      (acc, curr) => acc + parseFloat(curr.netPay),
      0,
    );

    console.info("L&T Report retrieved successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      message: "L&T Report retrieved successfully.",
      lntReports: formattedReports,
      totalAllowance,
      totalNetPay,
    });
  } catch (error: any) {
    console.error("Error viewing LST report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing LST report.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Function to view other report
const viewOtherReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, month, year } = req.params;

  try {
    const post = await db.post.findUnique({
      where: {
        ID: Number(postId),
      },
    });

    if (!post || post.isDeleted) {
      console.error("Post does not exist in the database.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post does not exist in the database.",
      });
    }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
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

    // Exclude payrolls with zero days present
    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    const formatNumber = (num: number): string => Math.round(num).toFixed(2);

    let index = 0;
    // Format other report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;

      const basicSalary: number = payroll.basicSalary?.toNumber() ?? 0;
      const hourlyPay: number =
        basicSalary / new Date(Number(year), Number(month), 0).getDate() / 8;
      const extraDuty: number = payroll.extraDuty?.toNumber() ?? 0;
      // const fourHourPay = (attendance?.extraDutyFourHr ?? 0) * hourlyPay * 4;
      const fourHourPay = payroll.fourHourPay?.toNumber() ?? 0;
      const bonus: number = payroll.bonus?.toNumber() ?? 0;

      const kitAllowances: number =
        payroll.kitWashingAllowance?.toNumber() ?? 0;
      const convHra: number =
        (payroll.hra?.toNumber() ?? 0) + (payroll.conveyance?.toNumber() ?? 0);
      const cityAllowances: number = payroll.cityAllowance?.toNumber() ?? 0;
      const uniform: number = payroll.uniformAllowance?.toNumber() ?? 0;
      const specialAllowance: number =
        payroll.specialAllowance?.toNumber() ?? 0;

      const grossPay =
        Math.round(basicSalary) +
        Math.round(kitAllowances) +
        Math.round(cityAllowances) +
        Math.round(convHra);

      // const empESI =
      //   ((payroll.empEsiTaxPercent ?? 0) * (grossPay + Math.round(extraDuty))) /
      //   100;
      // const empEPF = ((payroll.empEpfTaxPercent ?? 0) * basicSalary) / 100;

      const empESI =
        payroll.esi.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) *
              (grossPay + Math.round(extraDuty))) /
            100
          : 0;
      const empEPF = ((payroll.empEpfTaxPercent ?? 0) * basicSalary) / 100;

      const adv: number = payroll.advance?.toNumber() ?? 0;
      const beltDeduction: number = payroll.beltDeduction?.toNumber() ?? 0;
      const uniformDeduction: number =
        payroll.uniformDeduction?.toNumber() ?? 0;
      // const pTax = calculatePTax(basicSalary);
      const pTax: number = payroll.pTax?.toNumber() ?? 0;

      const totalDeduction =
        Math.round(empEPF) +
        Math.round(empESI) +
        Math.round(adv) +
        Math.round(pTax) +
        Math.round(beltDeduction) +
        Math.round(uniformDeduction);

      const netPay: number =
        Math.round(grossPay) +
        Math.round(extraDuty) +
        Math.round(uniform) +
        Math.round(fourHourPay) +
        Math.round(specialAllowance) +
        Math.round(bonus) -
        Math.round(totalDeduction);

      return {
        slNo: index,
        empName: employee?.empName ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        basicSalary: formatNumber(basicSalary),
        allowance: {
          kitAllowances: formatNumber(kitAllowances),
          cityAllowances: formatNumber(cityAllowances),
          convHra: formatNumber(convHra),
        },
        grossPay: formatNumber(grossPay),
        extraDuty: formatNumber(extraDuty),
        uniform: formatNumber(uniform),
        fourHourPay: formatNumber(fourHourPay),
        specialAllowance: formatNumber(specialAllowance),
        bonus: formatNumber(bonus),
        deduction: {
          empEPF: formatNumber(empEPF),
          empESI: formatNumber(empESI),
          belt: formatNumber(beltDeduction),
          adv: formatNumber(adv),
          pTax: formatNumber(pTax),
          Uniform: formatNumber(uniformDeduction),
        },
        netPay: formatNumber(netPay),
      };
    });

    const totalGrossPay = formattedReports.reduce(
      (acc, curr) => acc + Number(curr.grossPay),
      0,
    );

    const totalNetPay = formattedReports.reduce(
      (acc, curr) => acc + Number(curr.netPay),
      0,
    );

    console.info("Others Report retrieved successfully.");
    console.info("Other reports: ", formattedReports);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Others Report retrieved successfully.",
      otherReports: formattedReports,
      totalGrossPay: formatNumber(totalGrossPay),
      totalNetPay: formatNumber(totalNetPay),
    });
  } catch (error: any) {
    console.error("Error viewing other report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing other report.",
    });
  } finally {
    await db.$disconnect();
  }
};

const viewEsiReportAllPost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  // const { postId, , year } = req.params;
  const { postIds, month, year } = req.body;
  // console.log("postIds: ", postIds, "month: ", month, "year: ", year);

  try {
    // Verify if the post exists
    if (!Array.isArray(postIds) || postIds.length === 0) {
      console.error("Invalid or missing post IDs.");
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Invalid or missing post IDs.",
      });
    }

    // Fetch posts to map postId -> reportName
    const posts = await db.post.findMany({
      where: { ID: { in: postIds.map((id: number) => Number(id)) }, isDeleted: false },
      select: { ID: true, reportName: true },
    });
    const allowedPostIds = posts.map((post) => post.ID);
    if (allowedPostIds.length === 0) {
      console.error("No valid posts found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No valid posts found for the given criteria.",
      });
    }
    const postReportTypeMap: Record<number, string> = {};
    posts.forEach((post) => {
      postReportTypeMap[post.ID] = post.reportName ?? "NONE";
    });

    // const post = await db.post.findUnique({
    //   where: {
    //     ID: Number(postId),
    //   },
    // });

    // if (!post) {
    //   console.error("Post does not exist in the database.");
    //   return res.status(404).send({
    //     status: 404,
    //     success: false,
    //     message: "Post does not exist in the database.",
    //   });
    // }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        // postId: Number(postId),
        postId: {
          in: allowedPostIds, // Exclude deleted posts
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
            // empName: "asc",
            esiNo: "asc", // Sort by ESI number
          },
        },
      },
    });

    // // Exclude payrolls with zero days present
    // payrolls = payrolls.filter((payroll: any) => {
    //   if (payroll.Attendance?.daysPresent !== 0) {
    //     return true;
    //   }
    // });

    // Exclude payrolls with zero days present and zero ESI tax
    payrolls = payrolls.filter((payroll: any) => {
      if (
        payroll.Attendance?.daysPresent !== 0 &&
        payroll.esi?.toNumber() !== 0
      ) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    let index = 0;
    // Format ESI report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;
      const reportName = postReportTypeMap[payroll.postId] ?? "NONE";
      const {
        grossPay,
        esiGrossPay,
      }: { grossPay: number; esiGrossPay: number } =
        calculateGrossPayForESIByReportType(reportName, payroll);

      // console.log("calculated gross pay ", grossPay);
      // const empESI = ((payroll.empEsiTaxPercent ?? 0) * grossPay) / 100;
      const empESI =
        payroll.esi.toNumber() !== 0
          ? ((payroll.empEsiTaxPercent ?? 0) * esiGrossPay) / 100
          : 0;

      const emplrESI: number =
        empESI !== 0
          ? ((payroll.emplrEsiTaxPercent ?? 0) * esiGrossPay) / 100
          : 0;

      // Helper function to format numbers
      // Helper function to format numbers
      const formatNumber = (num: any): string => {
        const value = Math.round(Number(num)); // Convert to number
        return isNaN(value) ? "0.00" : value.toFixed(2); // Handle invalid numbers
      };

      return {
        slNo: index,
        accNo: employee?.esiNo ?? "N/A",
        empName: employee?.empName ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        grossPay: formatNumber(esiGrossPay),
        empESI: formatNumber(empESI),
        emplrESI: formatNumber(emplrESI),
        total: formatNumber(empESI + emplrESI),
      };
    });

    // Calculate total gross pay and grand total of total ESI
    const totalGrossPay = formattedReports.reduce(
      (sum, report) => sum + parseFloat(report.grossPay),
      0,
    );

    const grandTotalEsi = formattedReports.reduce(
      (sum, report) => sum + parseFloat(report.total),
      0,
    );

    console.info("ESI Report retrieved successfully.");
    // console.log("what are ESI reports data? ", formattedReports);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "ESI Report retrieved successfully.",
      esiReports: formattedReports,
      totalGrossPay: totalGrossPay.toFixed(2),
      grandTotalEsi: grandTotalEsi.toFixed(2),
    });
  } catch (error: any) {
    console.error("Error viewing ESI report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing ESI report.",
    });
  } finally {
    await db.$disconnect();
  }
};

const viewEpfReportAllPost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  // const { postId, , year } = req.params;
  const { postIds, month, year } = req.body;
  try {
    // Verify if the post exists
    if (!Array.isArray(postIds) || postIds.length === 0) {
      console.error("Invalid or missing post IDs.");
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Invalid or missing post IDs.",
      });
    }

    // Exclude deleted posts
    const validPosts = await db.post.findMany({
      where: {
        ID: { in: postIds.map((id: number) => Number(id)) },
        isDeleted: false,
      },
      select: { ID: true },
    });
    const allowedPostIds = validPosts.map((p) => p.ID);
    if (allowedPostIds.length === 0) {
      console.warn("No valid posts found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No valid posts found for the given criteria.",
      });
    }

    // const post = await db.post.findUnique({
    //   where: {
    //     ID: Number(postId),
    //   },
    // });

    // if (!post) {
    //   console.error("Post does not exist in the database.");
    //   return res.status(404).send({
    //     status: 404,
    //     success: false,
    //     message: "Post does not exist in the database.",
    //   });
    // }

    // Fetch payroll entries
    let payrolls = await db.payroll.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        // postId: Number(postId),
        postId: {
          in: allowedPostIds, // Exclude deleted posts
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

    for (const payroll of payrolls) {
      console.log(
        "::: Payroll data , name: ",
        payroll.EmpPostRankLink.Employee.empName,
        "::: ESI No: ",
        payroll.EmpPostRankLink.Employee.esiNo,
      );
    }
    // Exclude payrolls with zero days present
    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    let index = 0;
    // Format ESI report data
    const formattedReports = payrolls.map((payroll: any) => {
      index++;
      const employee: Employee = payroll.EmpPostRankLink?.Employee;
      const attendance: Attendance = payroll.Attendance;

      const basicSalary: number = payroll.basicSalary.toNumber() ?? 0;
      const extraDuty: number = payroll.extraDuty?.toNumber() ?? 0;

      const kitAllowance: number = payroll.kitWashingAllowance?.toNumber() ?? 0;
      const convHra =
        (payroll.hra?.toNumber() ?? 0) + (payroll.conveyance?.toNumber() ?? 0);
      const cityAllowance = payroll.cityAllowance?.toNumber() ?? 0;
      // console.log("What is basic salary : ", basicSalary);
      // console.log("Allowances: ", kitAllowance, convHra, cityAllowance);
      // const grossPay: number =
      //   basicSalary + convHra + kitAllowance + cityAllowance + extraDuty;

      // console.log("calculated gross pay ", grossPay);
      // const empESI = ((payroll.empEsiTaxPercent ?? 0) * grossPay) / 100;
      const empEPF =
        payroll.epf.toNumber() !== 0
          ? ((payroll.empEpfTaxPercent ?? 0) * basicSalary) / 100
          : 0;

      const emplrEPF: number =
        empEPF !== 0
          ? ((payroll.emplrEpfTaxPercent ?? 0) * basicSalary) / 100
          : 0;

      // Helper function to format numbers
      // Helper function to format numbers
      const formatNumber = (num: any): string => {
        const value = Math.round(Number(num)); // Convert to number
        return isNaN(value) ? "0.00" : value.toFixed(2); // Handle invalid numbers
      };

      return {
        slNo: index,
        accNo: employee?.epfNo ?? "N/A",
        empName: employee?.empName ?? "N/A",
        days: attendance?.daysPresent ?? 0,
        // grossPay: formatNumber(grossPay),
        basicSalary: formatNumber(basicSalary),
        empEPF: formatNumber(empEPF),
        emplrEPF: formatNumber(emplrEPF),
        total: formatNumber(empEPF + emplrEPF),
      };
    });

    // Calculate total gross pay and grand total of total ESI
    // const totalGrossPay = formattedReports.reduce(
    //   (sum, report) => sum + parseFloat(report.grossPay),
    //   0,
    // );

    const totalBasicSalary = formattedReports.reduce(
      (sum, report) => sum + parseFloat(report.basicSalary),
      0,
    );

    const grandTotalEpf = formattedReports.reduce(
      (sum, report) => sum + parseFloat(report.total),
      0,
    );

    console.info("EPF Report retrieved successfully.");
    console.log("what are EPF reports data? ", formattedReports);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "ESI Report retrieved successfully.",
      epfReports: formattedReports,
      // totalGrossPay: totalGrossPay.toFixed(2),
      totalBasicSalary: totalBasicSalary.toFixed(2),
      grandTotalEpf: grandTotalEpf.toFixed(2),
    });
  } catch (error: any) {
    console.error("Error viewing EPF report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing EPF report.",
    });
  } finally {
    await db.$disconnect();
  }
};

// Function to view combined salary report
const viewSalaryReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postIds, month, year } = req.body;

  try {
    if (!Array.isArray(postIds) || postIds.length === 0) {
      logger.error("Invalid or missing post IDs.");
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Invalid or missing post IDs.",
      });
    }

    // Fetch posts to get reportName for each post
    const posts = await db.post.findMany({
      where: {
        ID: { in: postIds.map((id: number) => Number(id)) },
        isDeleted: false,
      },
      select: {
        ID: true,
        reportName: true,
      },
    });
    const allowedPostIds = posts.map((post) => post.ID);
    if (allowedPostIds.length === 0) {
      logger.error("No valid posts found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No valid posts found for the given criteria.",
      });
    }

    // Map postId to reportName
    const postReportTypeMap: Record<number, string> = {};
    posts.forEach((post) => {
      postReportTypeMap[post.ID] = post.reportName ?? "NONE";
    });

    // Fetch payrolls
    let payrolls = await db.payroll.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        postId: {
          in: allowedPostIds,
        },
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: {
              include: {
                Post: true,
              },
            },
          },
        },
        Attendance: true,
      },
      orderBy: {
        EmpPostRankLink: {
          PostRankLink: {
            Post: {
              postName: "asc",
            },
          },
        },
      },
    });

    payrolls.sort((a, b) => {
      const postA =
        a.EmpPostRankLink?.PostRankLink?.Post?.postName?.toUpperCase() || "";
      const postB =
        b.EmpPostRankLink?.PostRankLink?.Post?.postName?.toUpperCase() || "";
      if (postA < postB) return -1;
      if (postA > postB) return 1;

      // If post names are equal, sort by employee name
      const empA = a.EmpPostRankLink?.Employee?.empName?.toUpperCase() || "";
      const empB = b.EmpPostRankLink?.Employee?.empName?.toUpperCase() || "";
      if (empA < empB) return -1;
      if (empA > empB) return 1;
      return 0;
    });

    // Exclude payrolls with zero days present
    payrolls = payrolls.filter((payroll: any) => {
      if (payroll.Attendance?.daysPresent !== 0) {
        return true;
      }
    });

    if (payrolls.length === 0) {
      logger.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    let index = 0;
    const formattedReports = payrolls.map((payroll) => {
      index++;
      const employee = payroll.EmpPostRankLink?.Employee;
      const post = payroll.EmpPostRankLink?.PostRankLink?.Post;
      const postId = post?.ID ?? payroll.postId;
      const reportName = postReportTypeMap[postId] ?? "NONE";

      const netPay = calculateNetPayByReportType(reportName, payroll);

      return {
        slNo: index,
        empName: employee?.empName ?? "N/A",
        accountNum: employee?.accNum ?? "N/A",
        ifsc: employee?.ifsc ?? "N/A",
        bankName: employee?.bankName ?? "N/A",
        netPay: netPay.toFixed(2),
        postName: post?.postName ?? "N/A",
        reportType: reportName,
      };
    });

    const totalNetPay: number = formattedReports.reduce(
      (total, report) => total + parseFloat(report.netPay),
      0,
    );

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Combined salary report retrieved successfully.",
      salaryReport: formattedReports,
      totalNetPay: totalNetPay.toFixed(2),
    });
  } catch (error: any) {
    logger.error("Error viewing combined salary report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing combined salary report.",
    });
  } finally {
    await db.$disconnect();
  }
};
// const viewSalaryReport = async (
//   req: Request,
//   res: Response,
// ): Promise<Response> => {
//   const { postIds, month, year } = req.body;

//   try {
//     // Verify if the post exists
//     if (!Array.isArray(postIds) || postIds.length === 0) {
//       console.error("Invalid or missing post IDs.");
//       return res.status(400).send({
//         status: 400,
//         success: false,
//         message: "Invalid or missing post IDs.",
//       });
//     }

//     // Fetch payrolls
//     let payrolls = await db.payroll.findMany({
//       where: {
//         month: Number(month),
//         year: Number(year),
//         postId: {
//           in: postIds.map((id: number) => Number(id)),
//         },
//       },
//       include: {
//         EmpPostRankLink: {
//           include: {
//             Employee: true,
//             PostRankLink: {
//               include: {
//                 Post: true,
//               },
//             },
//           },
//         },

//         Attendance: true,
//       },
//       orderBy: {
//         EmpPostRankLink: {
//           PostRankLink: {
//             Post: {
//               postName: "asc",
//             },
//           },
//           // Employee: {
//           //   empName: "asc",
//           // },
//         },
//       },
//     });

//     // Exclude payrolls with zero days present
//     payrolls = payrolls.filter((payroll: any) => {
//       // console.log(
//       //   "Payroll with non-zero days present found:",
//       //   payroll.Attendance?.daysPresent,
//       //   " days for employee: ",
//       //   payroll.EmpPostRankLink?.Employee?.empName,
//       // );
//       if (payroll.Attendance?.daysPresent !== 0) {
//         return true;
//       }
//     });

//     // Check if payrolls are empty
//     if (payrolls.length === 0) {
//       console.warn("No payrolls found for the given criteria.");
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         message: "No payrolls found for the given criteria.",
//       });
//     }

//     let index = 0;
//     // Format salary report data
//     const formattedReports = payrolls.map((payroll) => {
//       index++;
//       const employee = payroll.EmpPostRankLink?.Employee;
//       const basicSalary: number = payroll.basicSalary?.toNumber() ?? 0;
//       const post = payroll.EmpPostRankLink?.PostRankLink?.Post;
//       console.log("post: ", post);
//       console.log("net pay:", payroll.netPay?.toNumber() ?? 0);
//       return {
//         slNo: index,
//         empName: employee?.empName ?? "N/A",
//         accountNum: employee?.accNum ?? "N/A",
//         ifsc: employee?.ifsc ?? "N/A",
//         bankName: employee?.bankName ?? "N/A",
//         // basicSalary: basicSalary.toFixed(2),
//         netPay:
//           Math.round(payroll.netPay?.toNumber() ?? 0).toFixed(2) ?? "0.00",
//         postName: post?.postName ?? "N/A",
//       };
//     });

//     const totalNetPay: number = Math.round(
//       payrolls.reduce((acc, curr) => {
//         return acc + Math.round(curr.netPay?.toNumber() ?? 0);
//       }, 0),
//     );

//     return res.status(200).send({
//       status: 200,
//       success: true,
//       message: "Combined salary report retrieved successfully.",
//       salaryReport: formattedReports,
//       totalNetPay,
//     });
//   } catch (error: any) {
//     console.error("Error viewing combined salary report:", error);
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message: "Internal server error while viewing combined salary report.",
//     });
//   } finally {
//     await db.$disconnect();
//   }
// };

const viewCombinedPTaxReport = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postIds, month, year } = req.body;

  try {
    // Verify if the posts ids are provided
    if (!Array.isArray(postIds) || postIds.length === 0) {
      console.error("Invalid or missing post IDs.");
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Invalid or missing post IDs.",
      });
    }

    // Exclude deleted posts
    const validPosts = await db.post.findMany({
      where: {
        ID: { in: postIds.map((id: number) => Number(id)) },
        isDeleted: false,
      },
      select: { ID: true },
    });
    const allowedPostIds = validPosts.map((p) => p.ID);
    if (allowedPostIds.length === 0) {
      console.warn("No valid posts found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No valid posts found for the given criteria.",
      });
    }

    // Fetch payrolls
    let payrolls = await db.payroll.findMany({
      where: {
        month: Number(month),
        year: Number(year),
        postId: {
          in: allowedPostIds,
        },
      },
      include: {
        EmpPostRankLink: {
          include: {
            Employee: true,
            PostRankLink: {
              include: {
                Post: true,
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

    // // Exclude payrolls with zero days present
    // payrolls = payrolls.filter((payroll: any) => {
    //   if (payroll.Attendance?.daysPresent !== 0) {
    //     return true;
    //   }
    // });

    // Exclude payrolls with zero days present or ptax of 0
    payrolls = payrolls.filter((payroll: any) => {
      if (
        payroll.Attendance?.daysPresent !== 0 &&
        payroll.pTax?.toNumber() !== 0
      ) {
        return true;
      }
    });

    // Check if payrolls are empty
    if (payrolls.length === 0) {
      console.warn("No payrolls found for the given criteria.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No payrolls found for the given criteria.",
      });
    }

    let index = 0;
    // Format P-Tax report data
    const formattedReports = payrolls.map((payroll) => {
      index++;
      const employee = payroll.EmpPostRankLink?.Employee;
      // const grossSalary: number = payroll.grossPay?.toNumber() ?? 0;
      const basicSalary: number = payroll.basicSalary?.toNumber() ?? 0;
      // const pTax: number = calculatePTax(grossSalary);
      const pTax: number = payroll.pTax?.toNumber() ?? 0;

      return {
        slNo: index,
        empName: employee?.empName ?? "N/A",
        postName:
          payroll.EmpPostRankLink?.PostRankLink?.Post?.postName ?? "N/A",
        basicSalary: basicSalary.toFixed(2),
        // grossPay: grossSalary.toFixed(2),
        pTax: pTax.toFixed(2),
        // totalPTax: totalPTax.toFixed(2),
      };
    });

    const totalPTax: number = Math.round(
      payrolls.reduce((acc, curr) => {
        return acc + Math.round(curr.pTax?.toNumber() ?? 0);
      }, 0),
    );

    const totalBasicSalary: number = Math.round(
      payrolls.reduce((acc, curr) => {
        return acc + Math.round(curr.basicSalary?.toNumber() ?? 0);
      }, 0),
    );

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Combined P-Tax report retrieved successfully.",
      pTaxReport: formattedReports,
      totalPTax: totalPTax.toFixed(2),
      totalBasicSalary,
    });
  } catch (error: any) {
    console.error("Error viewing combined P-Tax report:", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while viewing combined P-Tax report.",
    });
  } finally {
    await db.$disconnect();
  }
};

export {
  viewDsReport,
  viewEsiReport,
  viewtWithoutAllowanceReport,
  viewNewPayrollReport,
  viewDslReport,
  viewLntReport,
  viewOtherReport,
  viewEsiReportAllPost,
  viewEpfReportAllPost,
  viewSalaryReport,
  viewCombinedPTaxReport,
};
