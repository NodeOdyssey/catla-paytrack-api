import { Request, Response } from "express";
import logger from "../helpers/logger";
import { db } from "../configs/db.config";

// Function for creating a Tax Deduction Post Rank Link record
// Function for creating a Tax Deduction Post Rank Link record
const createTaxDeductionPostRankLink = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { taxDeductionID, postRankLinkId } = req.params;

  // Check if taxDeductionID and postRankLinkId are valid
  if (
    !taxDeductionID ||
    isNaN(parseInt(taxDeductionID)) ||
    !postRankLinkId ||
    isNaN(parseInt(postRankLinkId))
  ) {
    logger.error("Invalid Tax Deduction or Post-Rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Tax Deduction or Post-Rank ID.",
    });
  }

  // Check if the postRankLinkId exists in the PostRankLink table
  const postRankLink = await db.postRankLink.findFirst({
    where: {
      ID: parseInt(postRankLinkId),
    },
    include: {
      Rank: true,
      Post: true,
    },
  });

  if (!postRankLink) {
    logger.error(`Post Rank Link ${postRankLinkId} does not exist.`);
    return res.status(404).send({
      status: 404,
      success: false,
      message: "Post Rank Link does not exist.",
    });
  }

  // Check if the taxDeductionID exists in the TaxesAndDeduction table
  const taxDeduction = await db.taxesAndDeduction.findFirst({
    where: {
      ID: parseInt(taxDeductionID),
    },
  });

  if (!taxDeduction) {
    logger.error(`Tax Deduction ${taxDeductionID} does not exist.`);
    return res.status(404).send({
      status: 404,
      success: false,
      message: "Tax Deduction does not exist.",
    });
  }

  // Check if any tax deduction is already linked with the post
  const existingLinks = await db.taxDeductionPostRankLink.findMany({
    where: {
      postRankLinkId: parseInt(postRankLinkId),
    },
    include: {
      PostRankLink: { include: { Post: true, Rank: true } },
    },
  });

  if (existingLinks.length > 0) {
    logger.error(
      `Tax Deduction ${taxDeduction.taxDeducName} is already linked with ${existingLinks[0].PostRankLink.Rank.designation} for post ${existingLinks[0].PostRankLink.Post.postName.replace(/&amp;/g, "&")}.`,
    );
    return res.status(409).send({
      status: 409,
      success: false,
      message: ` Tax Deduction ${taxDeduction.taxDeducName} is already scheduled with ${existingLinks[0].PostRankLink.Rank.designation} for post ${existingLinks[0].PostRankLink.Post.postName.replace(/&amp;/g, "&")}. Please remove it first.`,
    });
  }

  // Check if the current tax deduction is already linked with the post
  const existingLink = await db.taxDeductionPostRankLink.findFirst({
    where: {
      taxDeductionID: parseInt(taxDeductionID),
      postRankLinkId: parseInt(postRankLinkId),
    },
    include: {
      TaxesAndDeduction: true,
      PostRankLink: { include: { Post: true, Rank: true } },
    },
  });

  if (existingLink) {
    logger.error(
      `Tax ${existingLink.TaxesAndDeduction.taxDeducName} is already linked with ${existingLink.PostRankLink.Rank.designation} for post ${existingLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}.`,
    );
    return res.status(409).send({
      status: 409,
      success: false,
      message: `Tax ${existingLink.TaxesAndDeduction.taxDeducName} is already scheduled with ${existingLink.PostRankLink.Rank.designation} for post ${existingLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}.`,
    });
  }

  try {
    const createdLink = await db.taxDeductionPostRankLink.create({
      data: {
        taxDeductionID: parseInt(taxDeductionID),
        postRankLinkId: parseInt(postRankLinkId),
      },
    });

    const link = await db.taxDeductionPostRankLink.findUnique({
      where: {
        ID: createdLink.ID,
      },
      include: {
        TaxesAndDeduction: { select: { taxDeducName: true } },
        PostRankLink: {
          include: {
            Post: { select: { postName: true } },
            Rank: { select: { designation: true } },
          },
        },
      },
    });

    if (!link) {
      logger.error("Link not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Link not registered properly.",
      });
    }

    const taxDeducPostRankLink = {
      ID: link.ID,
      taxDeductionID: link.taxDeductionID,
      postRankLinkId: link.postRankLinkId,
      designation: link.PostRankLink.Rank.designation,
      taxDeducName: link.TaxesAndDeduction.taxDeducName,
    };
    logger.info(
      `Tax ${taxDeduction.taxDeducName} linked with ${postRankLink.Rank.designation} for post ${postRankLink.Post.postName.replace(/&amp;/g, "&")}.`,
    );
    return res.status(201).send({
      status: 201,
      success: true,
      message: `Tax ${link?.TaxesAndDeduction.taxDeducName} scheduled with ${link?.PostRankLink.Rank.designation} for post ${link.PostRankLink.Post.postName.replace(/&amp;/g, "&")} successfully.`,
      taxDeducPostRankLink,
    });
  } catch (err: any) {
    logger.error("Error while creating record: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while creating record.",
    });
  }
};

// Function for viewing all Tax Deduction Post Rank Link records
const viewAllTaxDeductionPostRankLinks = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  try {
    const links = await db.taxDeductionPostRankLink.findMany();

    if (!links || links.length === 0) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No records found.",
      });
    }

    return res.status(200).send({
      status: 200,
      success: true,
      message: "Records retrieved successfully.",
      links,
    });
  } catch (err: any) {
    logger.error("Error while retrieving records: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while retrieving records.",
    });
  }
};

// Function for deleting a Tax Deduction Post Rank Link record
const deleteTaxDeductionPostRankLink = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  // const { id } = req.params;
  const { taxDeductionPostRankLinkId } = req.params;

  // Check if taxDeductionID and postRankLinkId are valid
  if (
    !taxDeductionPostRankLinkId ||
    isNaN(parseInt(taxDeductionPostRankLinkId))
  ) {
    logger.error("Invalid Tax deduction post rank link ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Tax deduction post rank link ID.",
    });
  }

  // Check if the taxDeductionPostRankLinkId exists in the TaxDeductionPostRankLink table
  const taxDeductionPostRankLink = await db.taxDeductionPostRankLink.findFirst({
    where: {
      ID: parseInt(taxDeductionPostRankLinkId),
    },
  });

  if (!taxDeductionPostRankLink) {
    logger.error(
      `Tax Deduction Post Rank Link ${taxDeductionPostRankLinkId} does not exist.`,
    );
    return res.status(404).send({
      status: 404,
      success: false,
      message: "Tax Deduction Post Rank Link does not exist.",
    });
  }

  // Delete the taxDeductionPostRankLink
  try {
    const deletedLink = await db.taxDeductionPostRankLink.delete({
      where: {
        ID: parseInt(taxDeductionPostRankLinkId),
      },
      select: {
        TaxesAndDeduction: { select: { taxDeducName: true } },
        PostRankLink: {
          select: {
            Rank: { select: { designation: true } },
            Post: { select: { postName: true } },
          },
        },
      },
    });

    logger.info(
      `Tax ${deletedLink.TaxesAndDeduction.taxDeducName} removed from  ${deletedLink.PostRankLink.Rank.designation} for post ${deletedLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")} successfully.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Tax ${deletedLink.TaxesAndDeduction.taxDeducName} removed from  ${deletedLink.PostRankLink.Rank.designation} for post ${deletedLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")} successfully.`,
      link: deletedLink,
    });
  } catch (err: any) {
    logger.error("Error while deleting record: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while deleting record.",
    });
  }
};

// Function to get all tax and deductions linked to a specific post
const getTaxDeductionsByPostId = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId } = req.params;

  if (!postId || isNaN(parseInt(postId))) {
    logger.error("Invalid Post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Post ID.",
    });
  }

  // Check if the post exists in the database
  const post = await db.post.findUnique({
    where: { ID: parseInt(postId) },
    select: { ID: true, postName: true },
  });

  if (!post) {
    logger.error(`Post ${postId} does not exist.`);
    return res.status(404).send({
      status: 404,
      success: false,
      message: `Post ${postId} does not exist.`,
    });
  }

  try {
    // Fetch PostRankLinks associated with the given postId
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

    const taxDeductionPostRankLinks =
      await db.taxDeductionPostRankLink.findMany({
        where: {
          postRankLinkId: {
            in: postRankLinkIds,
          },
        },
        select: {
          ID: true,
          taxDeductionID: true,
          postRankLinkId: true,
          TaxesAndDeduction: {
            select: { taxDeducName: true },
          },
          PostRankLink: {
            select: {
              Rank: {
                select: {
                  designation: true,
                  basicSalary: true,
                },
              },
            },
          },
        },
      });

    if (!taxDeductionPostRankLinks || taxDeductionPostRankLinks.length === 0) {
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No tax deductions found for this post.",
      });
    }

    logger.info("Tax deductions retrieved successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      message: "Tax deduction schedule retrieved successfully.",
      taxDeductionPostRankLinks: taxDeductionPostRankLinks.map((link) => ({
        ID: link.ID,
        taxDeductionID: link.taxDeductionID,
        postRankLinkId: link.postRankLinkId,
        taxDeducName: link.TaxesAndDeduction.taxDeducName,
        rank: link.PostRankLink.Rank.designation,
        basicSalary: link.PostRankLink.Rank.basicSalary,
      })),
    });
  } catch (err: any) {
    logger.error("Error while retrieving tax deductions: ", err);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while retrieving tax deductions.",
    });
  }
};

export {
  createTaxDeductionPostRankLink,
  viewAllTaxDeductionPostRankLinks,
  deleteTaxDeductionPostRankLink,
  getTaxDeductionsByPostId,
};
