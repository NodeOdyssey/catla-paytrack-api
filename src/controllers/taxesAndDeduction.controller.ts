import { Request, Response } from "express";
import logger from "../helpers/logger";
import { db } from "../configs/db.config";

// Function for creating a taxes and deduction record
const createTaxesAndDeduction = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const {
    taxDeducName,
    pTax,
    uniformDeduction = 0,
    otherDeduction = 0,
    epf,
    esi,
    employerEpf = 0,
    employerEsi = 0,
  } = req.body;

  try {
    const taxesAndDeductionCreated = await db.taxesAndDeduction.create({
      data: {
        taxDeducName,
        pTax,
        epf,
        esi,
        employerEpf,
        employerEsi,
        uniformDeduction,
        otherDeduction,
      },
    });

    logger.info(`Taxes and Deduction record created.`);
    return res.status(201).send({
      status: 201,
      success: true,
      message: "Taxes and Deduction record created successfully.",
      taxesAndDeduction: taxesAndDeductionCreated,
    });
  } catch (err: any) {
    logger.error("Error while creating Taxes and Deduction record: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "Internal server error while creating Taxes and Deduction record.",
    });
  }
};

// Function for updating a taxes and deduction record
const updateTaxesAndDeduction = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const { taxDeducName, pTax, esi, epf, uniformDeduction, otherDeduction } =
    req.body;

  try {
    const taxesAndDeduction = await db.taxesAndDeduction.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!taxesAndDeduction) {
      logger.error(`Taxes and Deduction record with ID ${id} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Taxes and Deduction record not found.",
      });
    }

    const updatedTaxesAndDeduction = await db.taxesAndDeduction.update({
      where: { ID: parseInt(id) },
      data: {
        taxDeducName,
        pTax,
        epf,
        esi,
        uniformDeduction,
        otherDeduction,
      },
    });

    logger.info(`Taxes and Deduction record with ID ${id} updated.`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Taxes and Deduction record updated successfully.",
      taxesAndDeduction: updatedTaxesAndDeduction,
    });
  } catch (err: any) {
    logger.error("Error while updating Taxes and Deduction record: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "Internal server error while updating Taxes and Deduction record.",
    });
  }
};

// Function for deleting a taxes and deduction record
const deleteTaxesAndDeduction = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  try {
    const taxesAndDeduction = await db.taxesAndDeduction.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!taxesAndDeduction) {
      logger.error(`Taxes and Deduction record with ID ${id} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Taxes and Deduction record not found.",
      });
    }

    await db.taxesAndDeduction.delete({ where: { ID: parseInt(id) } });

    logger.info(`Taxes and Deduction record with ID ${id} deleted.`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Taxes and Deduction record deleted successfully.",
    });
  } catch (err: any) {
    logger.error("Error while deleting Taxes and Deduction record: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "Internal server error while deleting Taxes and Deduction record.",
    });
  }
};

// Function for viewing a taxes and deduction record by ID
const viewTaxesAndDeductionById = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  try {
    const taxesAndDeduction = await db.taxesAndDeduction.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!taxesAndDeduction) {
      logger.error(`Taxes and Deduction record with ID ${id} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Taxes and Deduction record not found.",
      });
    }

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Taxes and Deduction record retrieved successfully.",
      taxesAndDeduction,
    });
  } catch (err: any) {
    logger.error("Error while retrieving Taxes and Deduction record: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "Internal server error while retrieving Taxes and Deduction record.",
    });
  }
};

// Function for viewing all taxes and deduction records
const viewAllTaxesAndDeductions = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const taxesAndDeductions = await db.taxesAndDeduction.findMany();

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Taxes and Deduction records retrieved successfully.",
      taxesAndDeductions,
    });
  } catch (err: any) {
    logger.error("Error while retrieving Taxes and Deduction records: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "Internal server error while retrieving Taxes and Deduction records.",
    });
  }
};

export {
  createTaxesAndDeduction,
  updateTaxesAndDeduction,
  deleteTaxesAndDeduction,
  viewTaxesAndDeductionById,
  viewAllTaxesAndDeductions,
};
