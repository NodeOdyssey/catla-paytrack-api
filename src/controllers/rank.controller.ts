// Import npm modules
import { Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Import helpers
import logger from "../helpers/logger";

// Import database
import { db } from "../configs/db.config";

// Function for creating a rank
const createRank = async (req: Request, res: Response): Promise<Response> => {
  const {
    designation,
    basicSalary,
    kitWashingAllowance,
    cityAllowance,
    conveyance,
    hra,
    vda,
    uniformAllowance,
    otherAllowance,
    weeklyOff,
    specialAllowance,
  } = req.body;
  console.log("Create rank api trigger");
  // Check for duplicates
  const duplicateChecks = [
    { field: "designation", value: designation, name: "designation" },
  ];

  //TODO: Move this to a separate file in helpers folder
  const checkDuplicate = async (field: string, value: any) => {
    const existingRecord = await db.rank.findFirst({
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

  // Fetch and store rank data in rank object
  const rankData = {
    designation: designation,
    basicSalary: basicSalary,
    kitWashingAllowance: kitWashingAllowance,
    cityAllowance: cityAllowance,
    conveyance: conveyance,
    hra: hra,
    vda: vda,
    uniformAllowance: uniformAllowance,
    otherAllowance: otherAllowance,
    weeklyOff: weeklyOff,
    specialAllowance: specialAllowance,
  };

  // Create rank
  try {
    const rankCreated = await db.rank.create({
      data: rankData,
    });
    logger.info(`Rank ${rankCreated.designation} created.`);
    return res.status(201).send({
      status: 201,
      success: true,
      message: `Rank "${rankCreated.designation}" registered successfully.`,
      rank: rankCreated,
    });
  } catch (err: any) {
    logger.error("Error while creating rank: ", err);

    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while registering rank.",
    });
  }
};

// Function for fetching all ranks
const getAllRanks = async (req: Request, res: Response): Promise<Response> => {
  console.log("Get all ranks api trigger");
  try {
    const ranks = await db.rank.findMany({
      orderBy: {
        designation: "asc",
      },
      where: {
        isDeleted: false,
      },
    });

    if (ranks.length === 0) {
      logger.info("No ranks found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No ranks found.",
      });
    }

    logger.info(`${ranks.length} ranks retrieved successfully.`);
    return res.status(200).send({
      status: 200,
      success: true,
      count: ranks.length,
      message: `${ranks.length} ranks retrieved successfully.`,
      ranks,
    });
  } catch (err: any) {
    logger.error("Error while fetching ranks: ", err.message);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching ranks.",
    });
  }
};

// Function for fetching a rank by ID
const getRankById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  // Check if rank ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid rank ID.",
    });
  }

  try {
    // Fetch the rank by ID
    const rank = await db.rank.findUnique({
      where: { ID: parseInt(id) },
    });

    // Check if the rank exists
    if (!rank) {
      logger.info(`Rank with ID ${id} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        message: `Rank with ID ${id} not found.`,
      });
    }

    logger.info(
      `Rank information for "${rank.designation}" retrieved successfully.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Rank information for "${rank.designation}" retrieved successfully.`,
      rank,
    });
  } catch (err: any) {
    logger.error("Error while fetching rank: ", err.message);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching rank.",
    });
  }
};

// Function for updating a rank
const updateRank = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  // Check if rank ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid rank ID.",
    });
  }

  const {
    designation,
    basicSalary,
    kitWashingAllowance,
    cityAllowance,
    conveyance,
    hra,
    vda,
    uniformAllowance,
    otherAllowance,
    weeklyOff,
    specialAllowance,
  } = req.body;

  // Fetch the existing rank
  const rank = await db.rank.findUnique({
    where: { ID: parseInt(id) },
  });

  if (!rank) {
    logger.error(`Rank with ID ${id} not found.`);
    return res.status(404).send({
      status: 404,
      success: false,
      message: `Rank with ID ${id} not found.`,
    });
  }

  // Prepare the updated rank data object
  const updatedRankData = {
    designation: designation || rank.designation,
    basicSalary: basicSalary || rank.basicSalary,
    kitWashingAllowance: kitWashingAllowance || rank.kitWashingAllowance,
    cityAllowance: cityAllowance || rank.cityAllowance,
    conveyance: conveyance || rank.conveyance,
    hra: hra || rank.hra,
    vda: vda || rank.vda,
    uniformAllowance: uniformAllowance || rank.uniformAllowance,
    otherAllowance: otherAllowance || rank.otherAllowance,
    weeklyOff: weeklyOff || rank.weeklyOff,
    specialAllowance: specialAllowance || rank.specialAllowance,
  };

  // Update the rank in the database
  try {
    const updatedRank = await db.rank.update({
      where: { ID: parseInt(id) },
      data: updatedRankData,
    });

    console.log("yay");

    logger.info(`Rank ${updatedRank.designation} updated successfully.`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Rank details for "${updatedRank.designation}" updated successfully.`,
      data: updatedRank,
    });
  } catch (error) {
    logger.error("Error updating rank.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while updating the rank.",
    });
  }
};

const deleteRank = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid rank ID.",
    });
  }

  let rank;

  try {
    // Fetch the existing rank
    rank = await db.rank.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!rank) {
      logger.error("Rank not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Rank not found.",
      });
    }

    // Delete the rank from the database
    // await db.rank.delete({
    //   where: { ID: parseInt(id) },
    // });
    await db.rank.update({
      where: { ID: parseInt(id) },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    logger.info(`Rank ${rank.designation} deleted successfully.`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Rank "${rank.designation}" removed from the records successfully.`,
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      logger.error(
        `Rank "${rank?.designation}" cannot be deleted as it is linked to another entity.`,
      );
      return res.status(409).send({
        status: 409,
        success: false,
        errorCode: "P2003",
        message: `Rank "${rank?.designation}" cannot be deleted as it is linked to another entity.`,
      });
    }

    logger.error("Error deleting rank.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while deleting the rank.",
    });
  }
};

export { createRank, getAllRanks, getRankById, updateRank, deleteRank };
