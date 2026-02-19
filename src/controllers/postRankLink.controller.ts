// Import npm modules
import { Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Import helpers
import logger from "../helpers/logger";

// Import database
import { db } from "../configs/db.config";
import { spec } from "node:test/reporters";

// Function for linking a rank to a post
// const createLinkRankToPost = async (
//   req: Request,
//   res: Response,
// ): Promise<Response> => {
//   const { postId, rankId } = req.params;

//   // Check if post ID and rank ID are valid
//   if (
//     !postId ||
//     isNaN(parseInt(postId)) ||
//     !rankId ||
//     isNaN(parseInt(rankId))
//   ) {
//     logger.error("Invalid post or rank ID.");
//     return res.status(400).send({
//       status: 400,
//       success: false,
//       message: "Invalid post or rank ID.",
//     });
//   }

//   try {
//     // Fetch the existing post
//     const post = await db.post.findUnique({
//       where: { ID: parseInt(postId) },
//     });

//     if (!post) {
//       logger.error("Post not found.");
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         message: "Post not created yet. Cannot link rank before creating post.",
//       });
//     }

//     // Fetch the existing rank
//     const rank = await db.rank.findUnique({
//       where: { ID: parseInt(rankId) },
//     });

//     if (!rank) {
//       logger.error("Rank not found.");
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         message: "Rank not found.",
//       });
//     }

//     // Check if the current rank is already linked with the post
//     const existingLink = await db.postRankLink.findFirst({
//       where: {
//         postId: parseInt(postId),
//         rankId: parseInt(rankId),
//       },
//     });

//     if (existingLink) {
//       logger.error(
//         `Rank "${rank.designation}" is already linked with the post "${post.postName}".`,
//       );
//       return res.status(409).send({
//         status: 409,
//         success: false,
//         message: `Cannot assign rank "${rank.designation}" to post "${post.postName}" more than once. Please remove duplicate rank - "${rank.designation}".`,
//       });
//     }

//     // Collect custom values if provided
//     const {
//       basicSalary,
//       kitWashingAllowance,
//       cityAllowance,
//       conveyance,
//       hra,
//       vda,
//       otherAllowance,
//       uniformAllowance,
//     } = req.body;

//     // Construct the postRankLinkData object
//     const postRankLinkData = {
//       postId: parseInt(postId),
//       rankId: parseInt(rankId),
//       basicSalary: basicSalary !== undefined ? basicSalary : rank.basicSalary,
//       kitWashingAllowance:
//         kitWashingAllowance !== undefined
//           ? kitWashingAllowance
//           : rank.kitWashingAllowance,
//       cityAllowance:
//         cityAllowance !== undefined ? cityAllowance : rank.cityAllowance,
//       conveyance: conveyance !== undefined ? conveyance : rank.conveyance,
//       hra: hra !== undefined ? hra : rank.hra,
//       vda: vda !== undefined ? vda : rank.vda,
//       uniformAllowance:
//         uniformAllowance !== undefined
//           ? uniformAllowance
//           : rank.uniformAllowance,
//       otherAllowance:
//         otherAllowance !== undefined ? otherAllowance : rank.otherAllowance,
//     };

//     // Link the rank to the post
//     const postRankLinkCreated = await db.postRankLink.create({
//       data: postRankLinkData,
//     });

//     logger.info(`Rank ${rank.designation} linked to post ${post.postName}.`);
//     return res.status(200).send({
//       status: 200,
//       success: true,
//       message: `Rank "${rank.designation}" assigned to the post "${post.postName}" successfully.`,
//       postRankLinks: { ...postRankLinkCreated, rank: rank.designation },
//     });
//   } catch (error) {
//     logger.error("Error linking rank to post.", error);
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message: "An error occurred while linking the rank to the post.",
//     });
//   }
// };
const createLinkRankToPost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId, rankId } = req.params;

  console.log("hitting api for creating rank link");
  // Check if post ID and rank ID are valid
  if (
    !postId ||
    isNaN(parseInt(postId)) ||
    !rankId ||
    isNaN(parseInt(rankId))
  ) {
    logger.error("Invalid post or rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post or rank ID.",
    });
  }

  try {
    // Fetch the existing post
    const post = await db.post.findUnique({
      where: { ID: parseInt(postId) },
    });

    if (!post || post.isDeleted) {
      logger.error("Post not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not created yet. Cannot link rank before creating post.",
      });
    }

    // Fetch the existing rank
    const rank = await db.rank.findUnique({
      where: { ID: parseInt(rankId) },
    });

    if (!rank) {
      logger.error("Rank not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Rank not found.",
      });
    }

    // Check if the current rank is already linked with the post
    const existingLink = await db.postRankLink.findFirst({
      where: {
        postId: parseInt(postId),
        rankId: parseInt(rankId),
      },
    });

    if (existingLink) {
      logger.error(
        `Rank "${rank.designation}" is already linked with the post "${post.postName.replace(/&amp;/g, "&")}".`,
      );
      return res.status(409).send({
        status: 409,
        success: false,
        message: `Cannot assign rank "${rank.designation}" to post "${post.postName.replace(/&amp;/g, "&")}" more than once. Please remove duplicate rank - "${rank.designation}".`,
      });
    }

    // Collect custom values if provided
    const {
      basicSalary,
      kitWashingAllowance,
      cityAllowance,
      conveyance,
      hra,
      vda,
      otherAllowance,
      uniformAllowance,
      weeklyOff,
      specialAllowance,
      // taxDeductionId,
    } = req.body;

    // Construct the postRankLinkData object
    const postRankLinkData = {
      postId: parseInt(postId),
      rankId: parseInt(rankId),
      basicSalary: parseInt(
        basicSalary !== undefined ? basicSalary : rank.basicSalary,
      ),
      kitWashingAllowance: parseInt(
        kitWashingAllowance !== undefined
          ? kitWashingAllowance
          : rank.kitWashingAllowance,
      ),
      cityAllowance: parseInt(
        cityAllowance !== undefined ? cityAllowance : rank.cityAllowance,
      ),
      conveyance: parseInt(
        conveyance !== undefined ? conveyance : rank.conveyance,
      ),
      hra: parseInt(hra !== undefined ? hra : rank.hra),
      vda: parseInt(vda !== undefined ? vda : rank.vda),
      uniformAllowance: parseInt(
        uniformAllowance !== undefined
          ? uniformAllowance
          : rank.uniformAllowance,
      ),
      otherAllowance: parseInt(
        otherAllowance !== undefined ? otherAllowance : rank.otherAllowance,
      ),
      weeklyOff: parseInt(weeklyOff ?? rank.weeklyOff),
      specialAllowance: parseInt(specialAllowance ?? rank.specialAllowance),
    };

    console.log("what is postRankLinkData :::::::::::::::", postRankLinkData);
    // Link the rank to the post
    const postRankLinkCreated = await db.postRankLink.create({
      data: postRankLinkData,
    });

    let taxDeductionId: number | null = null;

    if (basicSalary && basicSalary !== null) {
      if (basicSalary < 10000) {
        taxDeductionId = 1;
      } else if (basicSalary >= 10000 && basicSalary < 15000) {
        taxDeductionId = 2;
      } else {
        taxDeductionId = 3;
      }
    }
    // Create a TaxDeductionPostRankLink if taxDeductionId is provided
    if (taxDeductionId && !isNaN(taxDeductionId)) {
      await db.taxDeductionPostRankLink.create({
        data: {
          taxDeductionID: taxDeductionId,
          postRankLinkId: postRankLinkCreated.ID,
        },
      });
    }

    logger.info(
      `Rank ${rank.designation} linked to post ${post.postName.replace(/&amp;/g, "&")}.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Rank "${rank.designation}" assigned to the post "${post.postName.replace(/&amp;/g, "&")}" successfully.`,
      postRankLinks: { ...postRankLinkCreated, rank: rank.designation },
    });
  } catch (error) {
    logger.error("Error linking rank to post.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while linking the rank to the post.",
    });
  }
};

// Function for updating a post rank link
const updateLinkRankToPost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  // const { postId, rankId } = req.params;
  const { postRankLinkId } = req.params;

  console.log(
    "postRankLinkId in updateLinkRankToPost :::::::::::::::",
    postRankLinkId,
  );
  // Check if post ID and rank ID are valid
  if (!postRankLinkId || isNaN(parseInt(postRankLinkId))) {
    logger.error("Invalid PostRankId.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid PostRankId.",
    });
  }

  try {
    // Fetch the existing post rank link
    const postRankLink = await db.postRankLink.findFirst({
      where: {
        ID: parseInt(postRankLinkId),
      },
      include: {
        TaxDeductionPostRankLink: true,
      },
    });

    if (!postRankLink) {
      logger.error("Post rank link not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post rank link not found.",
      });
    }

    // Collect updated values from the request body
    const {
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
      taxDeductionId,
    } = req.body;

    // Construct the updated postRankLinkData object
    const updatedPostRankLinkData = {
      basicSalary: basicSalary ?? postRankLink.basicSalary,
      kitWashingAllowance:
        kitWashingAllowance ?? postRankLink.kitWashingAllowance,
      cityAllowance: cityAllowance ?? postRankLink.cityAllowance,
      conveyance: conveyance ?? postRankLink.conveyance,
      hra: hra ?? postRankLink.hra,
      vda: vda ?? postRankLink.vda,
      uniformAllowance: uniformAllowance ?? postRankLink.uniformAllowance,
      otherAllowance: otherAllowance ?? postRankLink.otherAllowance,
      weeklyOff: weeklyOff ?? postRankLink.weeklyOff,
      specialAllowance: specialAllowance ?? postRankLink.specialAllowance,
    };

    // Update the post rank link in the database
    const updatedPostRankLink = await db.postRankLink.update({
      where: { ID: postRankLink.ID },
      data: updatedPostRankLinkData,
    });

    // Check whether tax deduction link id has been changed
    if (
      taxDeductionId &&
      !isNaN(parseInt(taxDeductionId)) &&
      taxDeductionId !== postRankLink.TaxDeductionPostRankLink[0].taxDeductionID
    ) {
      console.log("Need to update tax deduction link");
      console.log("new tax deduction id: ", taxDeductionId);
      console.log("postRankLinkId: ", postRankLinkId);
      //   // Delete the existing tax deduction link
      const taxDeductionPostRankLink =
        await db.taxDeductionPostRankLink.findFirst({
          where: {
            postRankLinkId: parseInt(postRankLinkId),
            taxDeductionID:
              postRankLink.TaxDeductionPostRankLink[0].taxDeductionID,
          },
        });

      console.log(
        "taxDeductionPostRankLink :::::::::::",
        taxDeductionPostRankLink,
      );

      if (taxDeductionPostRankLink) {
        await db.taxDeductionPostRankLink.update({
          where: {
            ID: taxDeductionPostRankLink.ID,
          },
          data: {
            taxDeductionID: parseInt(taxDeductionId),
            postRankLinkId: postRankLink.ID,
          },
        });
      }

      //   // Create a new tax deduction link
      //   await db.taxDeductionPostRankLink.create({
      //     data: {
      //       taxDeductionID: parseInt(req.body.taxDeductionId),
      //       postRankLinkId: postRankLink.ID,
      //     },
      //   });
    }

    console.log("updatedPostRankLink :::::::::::", updatedPostRankLink);

    logger.info(`Post rank link updated successfully.`);
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Post rank link updated successfully.`,
      data: updatedPostRankLink,
    });
  } catch (error) {
    logger.error("Error updating post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while updating the post rank link.",
    });
  }
};

// Function for viewing all ranks linked to a post
// const viewAllRanksLinkedToPost = async (
//   req: Request,
//   res: Response,
// ): Promise<Response> => {
//   const { postId } = req.params;

//   // Check if post ID is valid
//   if (!postId || isNaN(parseInt(postId))) {
//     logger.error("Invalid post ID.");
//     return res.status(400).send({
//       status: 400,
//       success: false,
//       message: "Invalid post ID.",
//     });
//   }

//   // Check if post exists
//   const post = await db.post.findUnique({
//     where: { ID: parseInt(postId) },
//   });
//   if (!post) {
//     logger.error("Post not found.");
//     return res.status(404).send({
//       status: 404,
//       success: false,
//       message: "Post not found.",
//     });
//   }

//   try {
//     // Fetch all ranks linked to the post from the PostRankLink table
//     const postRankLinks = await db.postRankLink.findMany({
//       where: { postId: parseInt(postId) },
//       include: {
//         Rank: true, // Include the Rank details
//         Post: true,
//         TaxDeductionPostRankLink: {
//           select: {
//             TaxesAndDeduction: {
//               select: {
//                 taxDeducName: true,
//               },
//             },
//           },
//         },
//       },
//     });

//     if (postRankLinks.length === 0) {
//       logger.info(`No ranks linked to the post ${post.postName} yet.`);
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         postRankLinks: [],
//       });
//     }

//     // Map the data to include necessary details
//     const linkedRanks = postRankLinks.map((link) => ({
//       ID: link.ID,
//       postId: link.postId,
//       rankId: link.rankId,
//       designation: link.Rank.designation,
//       basicSalary: (link.basicSalary ?? 0).toFixed(2),
//       kitWashingAllowance: (link.kitWashingAllowance ?? 0).toFixed(2),
//       cityAllowance: (link.cityAllowance ?? 0).toFixed(2),
//       conveyance: (link.conveyance ?? 0).toFixed(2),
//       hra: (link.hra ?? 0).toFixed(2),
//       vda: (link.vda ?? 0).toFixed(2),
//       uniformAllowance: (link.uniformAllowance ?? 0).toFixed(2),
//       otherAllowance: (link.otherAllowance ?? 0).toFixed(2),
//       taxDeducName: link.TaxDeductionPostRankLink[0]
//         ? link.TaxDeductionPostRankLink[0].TaxesAndDeduction.taxDeducName
//         : "",
//       taxDeductionPostRankLinkId: link.ID,
//       CreatedAt: link.createdAt,
//       UpdatedAt: link.updatedAt,
//     }));

//     return res.status(200).send({
//       status: 200,
//       success: true,
//       postRankLinks: linkedRanks,
//     });
//   } catch (error) {
//     logger.error("Error fetching ranks linked to post.", error);
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message: "An error occurred while fetching ranks linked to the post.",
//     });
//   }
// };
const viewAllRanksLinkedToPost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId } = req.params;

  // Check if post ID is valid
  if (!postId || isNaN(parseInt(postId))) {
    logger.error("Invalid post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  // Check if post exists
  const post = await db.post.findUnique({
    where: { ID: parseInt(postId) },
  });
  if (!post || post.isDeleted) {
    logger.error("Post not found.");
    return res.status(404).send({
      status: 404,
      success: false,
      message: "Post not found.",
    });
  }

  try {
    // Fetch all ranks linked to the post from the PostRankLink table
    const postRankLinks = await db.postRankLink.findMany({
      where: { postId: parseInt(postId) },
      include: {
        Rank: true, // Include the Rank details
        Post: true,
        TaxDeductionPostRankLink: {
          include: {
            TaxesAndDeduction: true,
          },
        },
      },
    });

    if (postRankLinks.length === 0) {
      logger.info(
        `No ranks linked to the post ${post.postName.replace(/&amp;/g, "&")} yet.`,
      );
      return res.status(404).send({
        status: 404,
        success: false,
        postRankLinks: [],
      });
    }

    // Map the data to include necessary details
    const linkedRanks = postRankLinks.map((link) => {
      const taxDeduction = link.TaxDeductionPostRankLink[0]?.TaxesAndDeduction;

      return {
        ID: link.ID,
        postId: link.postId,
        rankId: link.rankId,
        designation: link.Rank.designation,
        basicSalary: (link.basicSalary ?? 0).toFixed(2),
        kitWashingAllowance: (link.kitWashingAllowance ?? 0).toFixed(2),
        cityAllowance: (link.cityAllowance ?? 0).toFixed(2),
        conveyance: (link.conveyance ?? 0).toFixed(2),
        hra: (link.hra ?? 0).toFixed(2),
        vda: (link.vda ?? 0).toFixed(2),
        uniformAllowance: (link.uniformAllowance ?? 0).toFixed(2),
        otherAllowance: (link.otherAllowance ?? 0).toFixed(2),
        weeklyOff: link.weeklyOff,
        specialAllowance: link.specialAllowance,
        taxDeductionId: taxDeduction ? taxDeduction.ID : null,
        taxDeducName: taxDeduction ? taxDeduction.taxDeducName : "",
        CreatedAt: link.createdAt,
        UpdatedAt: link.updatedAt,
      };
    });

    console.log("data sending to frontend: ", linkedRanks);
    return res.status(200).send({
      status: 200,
      success: true,
      postRankLinks: linkedRanks,
    });
  } catch (error) {
    logger.error("Error fetching ranks linked to post.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while fetching ranks linked to the post.",
    });
  }
};

// Function for deleting a post rank link
// const deleteLinkRankToPost = async (
//   req: Request,
//   res: Response,
// ): Promise<Response> => {
//   const { postRankLinkId } = req.params;
//   // Check if post ID and rank ID are valid
//   if (!postRankLinkId || isNaN(parseInt(postRankLinkId))) {
//     logger.error("Invalid post-rank-link id ID.");
//     return res.status(400).send({
//       status: 400,
//       success: false,
//       message: "Invalid post or rank ID.",
//     });
//   }

//   // try {
//   //   // Fetch the existing post rank link
//   //   const postRankLink = await db.postRankLink.findUnique({
//   //     where: {
//   //       ID: parseInt(postRankLinkId),
//   //     },
//   //     include: { Rank: true, Post: true },
//   //   });

//   //   if (!postRankLink) {
//   //     logger.error("Post rank link not found.");
//   //     return res.status(404).send({
//   //       status: 404,
//   //       success: false,
//   //       message: "Post rank link not found.",
//   //     });
//   //   }

//   //   // Delete the post rank link from the database
//   //   await db.postRankLink.delete({
//   //     where: { ID: postRankLink.ID },
//   //   });

//   //   logger.info(
//   //     `Rank ${postRankLink.Rank.designation} deleted from post "${postRankLink.Post.postName}" successfully.`,
//   //   );
//   //   return res.status(200).send({
//   //     status: 200,
//   //     success: true,
//   //     message: `Rank "${postRankLink.Rank.designation}" deleted from post "${postRankLink.Post.postName}" successfully.`,
//   //     rankId: postRankLink.Rank.ID,
//   //   });
//   // } catch (error) {
//   //   if (
//   //     error instanceof PrismaClientKnownRequestError &&
//   //     error.code === "P2003"
//   //   ) {
//   //     logger.error(
//   //       `Rank "${postRankLink.Rank.designation}" cannont be deleted from post "${postRankLink.Post.postName}"  as it is linked to another entity.`,
//   //     );
//   //     return res.status(409).send({
//   //       status: 409,
//   //       success: false,
//   //       errorCode: "P2003",
//   //       message: `Post "${post?.postName}" cannot be deleted as it is linked to another entity.`,
//   //     });
//   //   }

//   //   logger.error("Error deleting post rank link.", error);
//   //   return res.status(500).send({
//   //     status: 500,
//   //     success: false,
//   //     message: "An error occurred while deleting the post rank link.",
//   //   });
//   // }

//   try {
//     // Fetch the existing post rank link
//     const postRankLink = await db.postRankLink.findUnique({
//       where: {
//         ID: parseInt(postRankLinkId),
//       },
//       include: { Rank: true, Post: true },
//     });

//     if (!postRankLink) {
//       logger.error("Post rank link not found.");
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         message: "Post rank link not found.",
//       });
//     }

//     try {
//       // Delete the post rank link from the database
//       await db.postRankLink.delete({
//         where: { ID: postRankLink.ID },
//       });
//     } catch (error) {
//       if (
//         error instanceof PrismaClientKnownRequestError &&
//         error.code === "P2003"
//       ) {
//         logger.error(`Cannot be deleted as it is linked to another entity.`);
//         return res.status(409).send({
//           status: 409,
//           success: false,
//           errorCode: "P2003",
//           message: `Rank  "${postRankLink.Rank.designation}" cannot be deleted as it is linked to another entity.`,
//         });
//       }
//     }

//     logger.info(
//       `Rank ${postRankLink.Rank.designation} deleted from post "${postRankLink.Post.postName}" successfully.`,
//     );
//     return res.status(200).send({
//       status: 200,
//       success: true,
//       message: `Rank "${postRankLink.Rank.designation}" deleted from post "${postRankLink.Post.postName}" successfully.`,
//       rankId: postRankLink.Rank.ID,
//     });
//   } catch (error) {
//     logger.error("Error deleting post.", error);
//     const errorMessage = `An error occurred while deleting post rank link ${postRankLinkId}`;
//     logger.error(errorMessage, error);
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message: errorMessage,
//     });
//   }
// };
// Function for deleting a post rank link
const deleteLinkRankToPost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postRankLinkId } = req.params;

  // Check if postRankLinkId is valid
  if (!postRankLinkId || isNaN(parseInt(postRankLinkId))) {
    logger.error("Invalid post-rank-link id.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post or rank ID.",
    });
  }

  try {
    // Fetch the existing post rank link
    const postRankLink = await db.postRankLink.findUnique({
      where: {
        ID: parseInt(postRankLinkId),
      },
      include: { Rank: true, Post: true },
    });

    if (!postRankLink) {
      logger.error("Post rank link not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post rank link not found.",
      });
    }

    // Delete related TaxDeductionPostRankLink entries
    await db.taxDeductionPostRankLink.deleteMany({
      where: { postRankLinkId: postRankLink.ID },
    });

    // Delete the post rank link from the database
    await db.postRankLink.delete({
      where: { ID: postRankLink.ID },
    });

    logger.info(
      `Rank ${postRankLink.Rank.designation} deleted from post "${postRankLink.Post.postName.replace(/&amp;/g, "&")}" successfully.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Rank "${postRankLink.Rank.designation}" deleted from post "${postRankLink.Post.postName.replace(/&amp;/g, "&")}" successfully.`,
      rankId: postRankLink.Rank.ID,
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      logger.error("Cannot be deleted as it is linked to another entity.");
      return res.status(409).send({
        status: 409,
        success: false,
        errorCode: "P2003",
        message: `Rank cannot be deleted as it is linked to another entity.`,
      });
    }

    logger.error("Error deleting post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while deleting the post rank link.",
    });
  }
};

export {
  createLinkRankToPost,
  updateLinkRankToPost,
  viewAllRanksLinkedToPost,
  deleteLinkRankToPost,
};
