import { Request, Response } from "express";

import { db } from "../configs/db.config";
import logger from "../helpers/logger";
import { calculatePTax } from "../helpers/functions";

const DEFAULT_GST_RATE = 18;
const INVOICE_ATTENDANCE_MODES = [
  "DERIVE_ATTENDANCE",
  "FULL_ATTENDANCE",
] as const;

const SELLER_INFO = {
  name: "Catla Broadband Services",
  address: "Jayanagar Rd, Jaya Nagar, Khanapara, Guwahati, Assam - 781022",
  gstin: "",
  pan: "",
};

type InvoiceAttendanceMode = (typeof INVOICE_ATTENDANCE_MODES)[number];

type PayrollWithLinks = Awaited<
  ReturnType<typeof getPayrollRowsForInvoice>
>[number];

const toNumber = (
  value: { toNumber: () => number } | number | null | undefined,
) => {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  return value.toNumber();
};

const round2 = (value: number) => Number(value.toFixed(2));

const getDaysInMonth = (month: number, year: number) =>
  new Date(year, month, 0).getDate();

const parseMonthYear = (monthRaw: string, yearRaw: string) => {
  const month = Number(monthRaw);
  const year = Number(yearRaw);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return { error: "Invalid month." };
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return { error: "Invalid year." };
  }

  return { month, year };
};

const getPayrollRowsForInvoice = async (
  postId: number,
  month: number,
  year: number,
) => {
  return db.payroll.findMany({
    where: {
      postId,
      month,
      year,
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
    },
    orderBy: {
      ID: "asc",
    },
  });
};

const calculateFullAttendanceNet = (
  payroll: PayrollWithLinks,
  month: number,
  year: number,
) => {
  const postRank = payroll.EmpPostRankLink?.PostRankLink;
  const monthDays = getDaysInMonth(month, year);

  const basicSalary = toNumber(postRank?.basicSalary);
  const conveyance = toNumber(postRank?.conveyance);
  const cityAllowance = toNumber(postRank?.cityAllowance);
  const kitWashingAllowance = toNumber(postRank?.kitWashingAllowance);
  const uniformAllowance = toNumber(postRank?.uniformAllowance);
  const specialAllowance = toNumber(postRank?.specialAllowance);
  const weeklyOff = toNumber(postRank?.weeklyOff);

  const bonus = toNumber(payroll.bonus);
  const extraDuty = toNumber(payroll.extraDuty);

  const grossPay =
    basicSalary +
    conveyance +
    cityAllowance +
    kitWashingAllowance +
    uniformAllowance +
    specialAllowance +
    weeklyOff +
    bonus +
    extraDuty;

  const esi = (toNumber(payroll.empEsiTaxPercent) * grossPay) / 100;
  const epf = (toNumber(payroll.empEpfTaxPercent) * basicSalary) / 100;
  const advance = toNumber(payroll.advance);
  const beltDeduction = toNumber(payroll.beltDeduction);
  const bootDeduction = toNumber(payroll.bootDeduction);
  const uniformDeduction = toNumber(payroll.uniformDeduction);
  const otherDeduction = toNumber(payroll.otherDeduction);
  const pTax = calculatePTax(basicSalary);

  const totalDeduction =
    esi +
    epf +
    advance +
    beltDeduction +
    bootDeduction +
    uniformDeduction +
    otherDeduction;

  const netPay =
    Math.round(grossPay) -
    Math.round(totalDeduction) -
    Math.round(pTax) +
    Math.round(bonus);

  return {
    attendanceDays: monthDays,
    billedNetAmount: round2(netPay),
  };
};

const generateInvoiceNumber = async (month: number, year: number) => {
  const monthPart = String(month).padStart(2, "0");
  const prefix = `INV/${year}${monthPart}/`;
  const latestInvoice = await db.invoice.findFirst({
    where: {
      invoiceNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      ID: "desc",
    },
    select: {
      invoiceNumber: true,
    },
  });

  let sequence = 1;
  if (latestInvoice?.invoiceNumber) {
    const parts = latestInvoice.invoiceNumber.split("/");
    const seqPart = parts[parts.length - 1];
    const parsed = Number(seqPart);
    if (!Number.isNaN(parsed)) {
      sequence = parsed + 1;
    }
  }

  return `${prefix}${String(sequence).padStart(3, "0")}`;
};

const getInvoiceStats = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId: postIdRaw, month: monthRaw, year: yearRaw } = req.params;
  const postId = Number(postIdRaw);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  const parsedMonthYear = parseMonthYear(monthRaw, yearRaw);
  if ("error" in parsedMonthYear) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: parsedMonthYear.error,
    });
  }

  const { month, year } = parsedMonthYear;

  try {
    const [post, payrollRows, existingInvoice] = await Promise.all([
      db.post.findUnique({
        where: { ID: postId },
      }),
      getPayrollRowsForInvoice(postId, month, year),
      db.invoice.findFirst({
        where: {
          postId,
          month,
          year,
        },
        select: {
          ID: true,
          invoiceNumber: true,
        },
      }),
    ]);

    if (!post || post.isDeleted) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not found.",
      });
    }

    if (!payrollRows.length) {
      return res.status(404).send({
        status: 404,
        success: false,
        message:
          "Payroll is not generated for the selected post and month. Please generate payroll first.",
      });
    }

    const deriveTaxableValue = round2(
      payrollRows.reduce((sum, payroll) => sum + toNumber(payroll.netPay), 0),
    );

    const fullAttendanceTaxableValue = round2(
      payrollRows.reduce(
        (sum, payroll) =>
          sum +
          calculateFullAttendanceNet(payroll, month, year).billedNetAmount,
        0,
      ),
    );

    const totalActualPresentDays = payrollRows.reduce(
      (sum, payroll) => sum + Number(payroll.workingDays ?? 0),
      0,
    );

    const monthDays = getDaysInMonth(month, year);

    return res.status(200).send({
      status: 200,
      success: true,
      stats: {
        postId,
        postName: post.postName.replace(/&amp;/g, "&"),
        month,
        year,
        employeeCount: payrollRows.length,
        monthDays,
        totalActualPresentDays,
        deriveTaxableValue,
        fullAttendanceTaxableValue,
        defaultGstRate: DEFAULT_GST_RATE,
        existingInvoice: existingInvoice
          ? {
              ID: existingInvoice.ID,
              invoiceNumber: existingInvoice.invoiceNumber,
            }
          : null,
      },
    });
  } catch (error) {
    logger.error("Error while fetching invoice stats.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching invoice stats.",
    });
  }
};

const generateInvoice = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const {
    postId: postIdRaw,
    month: monthRaw,
    year: yearRaw,
    attendanceMode: attendanceModeRaw,
    gstRate: gstRateRaw,
    invoiceDate: invoiceDateRaw,
  } = req.body ?? {};

  const postId = Number(postIdRaw);
  const month = Number(monthRaw);
  const year = Number(yearRaw);
  const attendanceMode = String(attendanceModeRaw) as InvoiceAttendanceMode;
  const gstRate =
    gstRateRaw === null || gstRateRaw === undefined || gstRateRaw === ""
      ? DEFAULT_GST_RATE
      : Number(gstRateRaw);

  if (!Number.isInteger(postId) || postId <= 0) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid month.",
    });
  }

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid year.",
    });
  }

  if (!INVOICE_ATTENDANCE_MODES.includes(attendanceMode)) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid attendance mode.",
    });
  }

  if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid GST rate.",
    });
  }

  const parsedInvoiceDate = invoiceDateRaw
    ? new Date(invoiceDateRaw)
    : new Date();
  if (Number.isNaN(parsedInvoiceDate.getTime())) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid invoice date.",
    });
  }

  try {
    const [post, payrollRows, existingInvoice] = await Promise.all([
      db.post.findUnique({ where: { ID: postId } }),
      getPayrollRowsForInvoice(postId, month, year),
      db.invoice.findFirst({
        where: {
          postId,
          month,
          year,
        },
        select: {
          ID: true,
          invoiceNumber: true,
        },
      }),
    ]);

    if (!post || post.isDeleted) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not found.",
      });
    }

    if (!payrollRows.length) {
      return res.status(404).send({
        status: 404,
        success: false,
        message:
          "Payroll is not generated for the selected post and month. Please generate payroll first.",
      });
    }

    if (existingInvoice) {
      return res.status(409).send({
        status: 409,
        success: false,
        message: `Invoice already exists for this post and month (${existingInvoice.invoiceNumber}).`,
      });
    }

    const invoiceItems = payrollRows.map((payroll) => {
      const employee = payroll.EmpPostRankLink?.Employee;
      const rank = payroll.EmpPostRankLink?.PostRankLink?.Rank;

      if (attendanceMode === "FULL_ATTENDANCE") {
        const fullAttendanceResult = calculateFullAttendanceNet(
          payroll,
          month,
          year,
        );
        return {
          employeeId: Number(employee?.ID ?? 0),
          employeeName: employee?.empName ?? "N/A",
          employeeCode: employee?.empId ?? null,
          designation: rank?.designation ?? null,
          attendanceDays: round2(fullAttendanceResult.attendanceDays),
          billedNetAmount: round2(fullAttendanceResult.billedNetAmount),
        };
      }

      return {
        employeeId: Number(employee?.ID ?? 0),
        employeeName: employee?.empName ?? "N/A",
        employeeCode: employee?.empId ?? null,
        designation: rank?.designation ?? null,
        attendanceDays: round2(Number(payroll.workingDays ?? 0)),
        billedNetAmount: round2(toNumber(payroll.netPay)),
      };
    });

    const taxableValue = round2(
      invoiceItems.reduce((sum, item) => sum + item.billedNetAmount, 0),
    );
    const gstAmount = round2((taxableValue * gstRate) / 100);
    const totalAmount = round2(taxableValue + gstAmount);

    let createdInvoiceId = 0;
    let createdInvoiceNumber = "";
    let created = false;
    let attempts = 0;

    while (!created && attempts < 3) {
      attempts += 1;
      const invoiceNumber = await generateInvoiceNumber(month, year);

      try {
        const createdInvoice = await db.$transaction(async (tx) => {
          return tx.invoice.create({
            data: {
              invoiceNumber,
              postId,
              month,
              year,
              invoiceDate: parsedInvoiceDate,
              attendanceMode,
              gstRate: round2(gstRate),
              taxableValue,
              gstAmount,
              totalAmount,
              status: "GENERATED",
              sellerName: SELLER_INFO.name,
              sellerAddress: SELLER_INFO.address,
              sellerGstin: SELLER_INFO.gstin,
              sellerPan: SELLER_INFO.pan,
              buyerName: post.postName.replace(/&amp;/g, "&"),
              buyerAddress: post.address,
              buyerGstin: post.gstin,
              buyerPan: post.pan,
              InvoiceItem: {
                createMany: {
                  data: invoiceItems,
                },
              },
            },
            select: {
              ID: true,
              invoiceNumber: true,
            },
          });
        });

        createdInvoiceId = createdInvoice.ID;
        createdInvoiceNumber = createdInvoice.invoiceNumber;
        created = true;
      } catch (error: any) {
        // P2002 handles unique constraint collision on invoiceNumber during concurrent generation.
        if (error?.code !== "P2002" || attempts >= 3) {
          throw error;
        }
      }
    }

    return res.status(201).send({
      status: 201,
      success: true,
      message: "Invoice generated successfully.",
      invoice: {
        invoiceId: createdInvoiceId,
        invoiceNumber: createdInvoiceNumber,
        postId,
        month,
        year,
      },
    });
  } catch (error) {
    logger.error("Error while generating invoice.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while generating invoice.",
    });
  }
};

const getInvoiceById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const invoiceId = Number(req.params.invoiceId);

  if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid invoice ID.",
    });
  }

  try {
    const invoice = await db.invoice.findUnique({
      where: {
        ID: invoiceId,
      },
      include: {
        Post: true,
        InvoiceItem: {
          orderBy: {
            employeeName: "asc",
          },
        },
      },
    });

    if (!invoice) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Invoice not found.",
      });
    }

    return res.status(200).send({
      status: 200,
      success: true,
      invoice: {
        ID: invoice.ID,
        invoiceNumber: invoice.invoiceNumber,
        postId: invoice.postId,
        postName: invoice.Post?.postName?.replace(/&amp;/g, "&") ?? "",
        month: invoice.month,
        year: invoice.year,
        invoiceDate: invoice.invoiceDate,
        attendanceMode: invoice.attendanceMode,
        gstRate: toNumber(invoice.gstRate),
        taxableValue: toNumber(invoice.taxableValue),
        gstAmount: toNumber(invoice.gstAmount),
        totalAmount: toNumber(invoice.totalAmount),
        status: invoice.status,
        seller: {
          name: invoice.sellerName,
          address: invoice.sellerAddress,
          gstin: invoice.sellerGstin,
          pan: invoice.sellerPan,
        },
        buyer: {
          name: invoice.buyerName,
          address: invoice.buyerAddress,
          gstin: invoice.buyerGstin,
          pan: invoice.buyerPan,
        },
        items: invoice.InvoiceItem.map((item) => ({
          ID: item.ID,
          employeeId: item.employeeId,
          employeeName: item.employeeName,
          employeeCode: item.employeeCode,
          designation: item.designation,
          attendanceDays: toNumber(item.attendanceDays),
          billedNetAmount: toNumber(item.billedNetAmount),
        })),
      },
    });
  } catch (error) {
    logger.error("Error while fetching invoice details.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching invoice details.",
    });
  }
};

export { getInvoiceStats, generateInvoice, getInvoiceById };
