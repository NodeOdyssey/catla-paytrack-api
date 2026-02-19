// Import npm modules
import { Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Import helpers
import logger from "../helpers/logger";

// Import database
import { db } from "../configs/db.config";
import { empStatus, status } from "@prisma/client";

//Function for creating an employee post rank link
const createEmpPostRankLink = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { empTableId, postRankLinkId, dateOfPosting } = req.body;

  if (
    !empTableId ||
    isNaN(parseInt(empTableId)) ||
    !postRankLinkId ||
    isNaN(parseInt(postRankLinkId))
  ) {
    logger.error("Invalid Employee or Post-Rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Employee or Post-Rank ID.",
    });
  }

  try {
    // Validate employee existence
    const employee = await db.employee.findUnique({
      where: { ID: parseInt(empTableId) },
    });

    if (!employee) {
      logger.error("Employee not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Employee not found.",
      });
    }

    // Verify whether post rank link exists
    const postRankLink = await db.postRankLink.findUnique({
      where: { ID: parseInt(postRankLinkId) },
      include: {
        Post: { select: { ID: true, postName: true, isDeleted: true } },
        Rank: { select: { designation: true } },
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

    if (postRankLink.Post.isDeleted) {
      logger.error("Post not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not found.",
      });
    }

    // const existingLinkWithSamePostRank = await db.empPostRankLink.findFirst({
    //   where: {
    //     empTableId: parseInt(empTableId),
    //     postRankLinkId: {
    //       in: await db.postRankLink
    //         .findMany({
    //           where: {
    //             postId: postRankLink.Post.ID,
    //           },
    //           select: {
    //             ID: true,
    //           },
    //         })
    //         .then((links) => links.map((link) => link.ID)),
    //     },
    //   },
    //   include: {
    //     PostRankLink: { select: { Rank: true } },
    //   },
    // });

    // // console.log(
    // //   "existingLinkWithSamePostRank ::::::::::",
    // //   existingLinkWithSamePostRank,
    // // );

    // if (existingLinkWithSamePostRank) {
    //   logger.error(
    //     `Employee ${employee.empName} is already posted as ${existingLinkWithSamePostRank.PostRankLink.Rank.designation} in the current post.`,
    //   );
    //   return res.status(400).send({
    //     status: 400,
    //     success: false,
    //     message: `Employee "${employee.empName}" is already posted as "${existingLinkWithSamePostRank.PostRankLink.Rank.designation}" in the current post.`,
    //   });
    // }

    // Check if employee is active in the current post rank
    const activeLinkInCurrentPost = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        status: "Active",
        PostRankLink: {
          postId: await db.postRankLink
            .findUnique({
              where: { ID: parseInt(postRankLinkId) },
            })
            .then((link) => link?.postId),
        },
      },
    });

    // console.log("activeLinkInCurrentPost ::::::::::", activeLinkInCurrentPost);
    if (activeLinkInCurrentPost) {
      logger.error("Employee is already active in the specified post.");
      return res.status(400).send({
        status: 400,
        success: false,
        message: `Employee "${employee.empName}" is already active in the specified post.`,
      });
    }

    const mostRecentLink = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        status: "Active",
      },
      include: { PostRankLink: { select: { Post: true } } },
    });

    if (
      mostRecentLink &&
      new Date(dateOfPosting) < new Date(mostRecentLink.dateOfPosting)
    ) {
      logger.error("Transfer date cannot be before the current posting date.");
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Transfer date cannot be before the current posting date.",
      });
    }

    if (mostRecentLink) {
      await db.empPostRankLink.update({
        where: { ID: mostRecentLink.ID },
        data: {
          status: "Inactive",
          dateOfTransfer: dateOfPosting,
          transferredTo: postRankLink.Post.postName.replace(/&amp;/g, "&"),
        },
      });
    }

    const empPostRankLink = await db.empPostRankLink.create({
      data: {
        empTableId: parseInt(empTableId),
        postRankLinkId: parseInt(postRankLinkId),
        dateOfPosting: new Date(dateOfPosting),
        dateOfTransfer: null,
        transferredFrom: mostRecentLink
          ? mostRecentLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")
          : null,
        dateOfDischarge: null,
      },
      include: {
        PostRankLink: {
          select: {
            Rank: true,
            Post: true,
            ID: true,
          },
        },
      },
    });

    // Update the employee status in the database
    await db.employee.update({
      where: { ID: parseInt(empTableId) },
      data: { empStatus: empStatus.Active },
    });

    // console.log("empPostRankLink created :::::::::::::", empPostRankLink);
    const empPostRankData = {
      ...empPostRankLink,
      postName: empPostRankLink.PostRankLink.Post.postName.replace(
        /&amp;/g,
        "&",
      ),
      rankName: empPostRankLink.PostRankLink.Rank.designation,
      postRankLinkID: empPostRankLink.PostRankLink.ID,
      status: empPostRankLink.status,
    };
    logger.info(
      `Employee "${employee.empName}" has been posted as "${postRankLink.Rank.designation}" in the post "${postRankLink.Post.postName.replace(/&amp;/g, "&")}" successfully.`,
    );
    return res.status(201).send({
      status: 201,
      success: true,
      message: `Employee "${employee.empName}" has been posted as "${postRankLink.Rank.designation}" in the post "${postRankLink.Post.postName.replace(/&amp;/g, "&")}" successfully.`,
      empPostRank: empPostRankData,
    });
  } catch (error) {
    logger.error("Error creating employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while creating the employee post rank link.",
    });
  }
};

// Function for reading an employee post rank link
const getEmpPostRankLink = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  try {
    const empPostRankLink = await db.empPostRankLink.findUnique({
      where: { ID: parseInt(id) },
      include: {
        Employee: true,
        PostRankLink: true,
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

    logger.info("Employee post rank link retrieved successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      data: empPostRankLink,
    });
  } catch (error) {
    logger.error("Error retrieving employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "An error occurred while retrieving the employee post rank link.",
    });
  }
};

// Function for getting the most recent employee post rank link by employee ID
const getMostRecentEmpPostRankLinkByEmpId = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { empTableId } = req.params;

  try {
    // Verify the employee
    const employee = await db.employee.findUnique({
      where: { ID: parseInt(empTableId) },
    });

    if (!employee) {
      logger.error("Employee not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Employee not found.",
      });
    }

    // Get the most recent active employee post rank link
    const empPostRankLink = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        status: "Active",
      },
      orderBy: {
        dateOfPosting: "desc",
      },
      include: {
        PostRankLink: {
          include: {
            Post: { select: { postName: true } },
            Rank: { select: { designation: true } },
          },
        },
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

    const postName = empPostRankLink.PostRankLink.Post.postName.replace(
      /&amp;/g,
      "&",
    );
    const rankName = empPostRankLink.PostRankLink.Rank.designation;
    const dateOfPosting = empPostRankLink.dateOfPosting;
    const status = empPostRankLink.status;
    const empPostRank = {
      ID: empPostRankLink.ID,
      postRankLinkId: empPostRankLink.PostRankLink.ID,
      postName,
      rankName,
      dateOfPosting,
      status,
    };

    console.log("empPostRank found :::::::::::::", empPostRank);

    logger.info("Employee post rank link retrieved successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      empPostRank,
    });
  } catch (error) {
    logger.error("Error retrieving employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "An error occurred while retrieving the employee post rank link.",
    });
  }
};

// Function for updating an employee post rank link
const updateEmpPostRankLink = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;
  const {
    dateOfPosting,
    transferredFrom,
    dateOfTransfer,
    transferredTo,
    reApplyDate,
    dateOfRehire,
  } = req.body;

  try {
    const empPostRankLink = await db.empPostRankLink.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!empPostRankLink) {
      logger.error("Employee post rank link not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Employee post rank link not found.",
      });
    }

    const updatedEmpPostRankLink = await db.empPostRankLink.update({
      where: { ID: parseInt(id) },
      data: {
        dateOfPosting: dateOfPosting
          ? new Date(dateOfPosting)
          : empPostRankLink.dateOfPosting,
        // transferredFrom: transferredFrom ?? empPostRankLink.transferredFrom,
        // dateOfTransfer: dateOfTransfer
        //   ? new Date(dateOfTransfer)
        //   : empPostRankLink.dateOfTransfer,
        // transferredTo: transferredTo ?? empPostRankLink.transferredTo,
        // reApplyDate: reApplyDate
        //   ? new Date(reApplyDate)
        //   : empPostRankLink.reApplyDate,
        // dateOfRehire: dateOfRehire
        //   ? new Date(dateOfRehire)
        //   : empPostRankLink.dateOfRehire,
      },
    });

    logger.info("Employee post rank link updated successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      data: updatedEmpPostRankLink,
    });
  } catch (error) {
    logger.error("Error updating employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while updating the employee post rank link.",
    });
  }
};

// Function for deleting an employee post rank link
const dischargeEmployee = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { empTableId, postRankLinkId, dateOfDischarge } = req.params;

  // console.log(
  //   "empTableId, postRankLinkId, dateOfDischarge :::::",
  //   empTableId,
  //   postRankLinkId,
  //   dateOfDischarge,
  // );
  // Check if post ID and rank ID are valid
  if (
    !empTableId ||
    isNaN(parseInt(empTableId)) ||
    !postRankLinkId ||
    isNaN(parseInt(postRankLinkId))
  ) {
    logger.error("Invalid Employee or Post-Rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Employee or Post-Rank ID.",
    });
  }

  try {
    const empPostRankLink = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        postRankLinkId: parseInt(postRankLinkId),
        status: "Active", // Ensure you are fetching the active link
      },
      include: {
        Employee: {
          select: {
            empName: true,
          },
        },
        PostRankLink: {
          include: {
            Post: {
              select: {
                postName: true,
              },
            },
            Rank: {
              select: {
                designation: true,
              },
            },
          },
        },
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

    if (empPostRankLink) {
      if (new Date(dateOfDischarge) < new Date(empPostRankLink.dateOfPosting)) {
        logger.error(
          "Discharge date cannot be before the current posting date.",
        );
        return res.status(400).send({
          status: 400,
          success: false,
          message: "Discharge date cannot be before the current posting date.",
        });
      }
    }

    await db.empPostRankLink.update({
      where: { ID: empPostRankLink.ID },
      data: {
        status: "Discharged",
        dateOfDischarge: new Date(dateOfDischarge),
      },
    });

    // update employee status to inactive
    await db.employee.update({
      where: { ID: empPostRankLink.empTableId },
      data: {
        empStatus: empStatus.Discharged,
        dateOfDischarge: new Date(dateOfDischarge),
      },
    });

    logger.info(
      `${empPostRankLink.PostRankLink.Rank.designation} ${empPostRankLink.Employee.empName} has been discharged from the post ${empPostRankLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")} successfully.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `${empPostRankLink.PostRankLink.Rank.designation} "${empPostRankLink.Employee.empName}" has been discharged from the post "${empPostRankLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}" successfully.`,
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
        message: `Employee cannot be discharged as it is linked to another entity.`,
      });
    }

    logger.error("Error deleting employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while deleting the employee post rank link.",
    });
  }
};

const resignEmployee = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { empTableId, postRankLinkId, dateOfResignation } = req.params;

  console.log(
    "empTableId, postRankLinkId, dateOfResignation :::::",
    empTableId,
    postRankLinkId,
    dateOfResignation,
  );
  // Check if post ID and rank ID are valid
  if (
    !empTableId ||
    isNaN(parseInt(empTableId)) ||
    !postRankLinkId ||
    isNaN(parseInt(postRankLinkId))
  ) {
    logger.error("Invalid Employee or Post-Rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Employee or Post-Rank ID.",
    });
  }

  try {
    const empPostRankLink = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        postRankLinkId: parseInt(postRankLinkId),
        status: "Active",
      },
      include: {
        Employee: {
          select: {
            empName: true,
          },
        },
        PostRankLink: {
          include: {
            Post: {
              select: {
                postName: true,
              },
            },
            Rank: {
              select: {
                designation: true,
              },
            },
          },
        },
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

    if (empPostRankLink) {
      if (
        new Date(dateOfResignation) < new Date(empPostRankLink.dateOfPosting)
      ) {
        logger.error(
          "Resignation date cannot be before the current posting date.",
        );
        return res.status(400).send({
          status: 400,
          success: false,
          message:
            "Resignation date cannot be before the current posting date.",
        });
      }
    }

    await db.empPostRankLink.update({
      where: { ID: empPostRankLink.ID },
      data: {
        status: "Resigned",
        dateOfResignation: new Date(dateOfResignation),
      },
    });

    // update employee status to inactive
    await db.employee.update({
      where: { ID: empPostRankLink.empTableId },
      data: {
        empStatus: empStatus.Resigned,
        dateOfResignation: new Date(dateOfResignation),
      },
    });

    logger.info(
      `${empPostRankLink.PostRankLink.Rank.designation} ${empPostRankLink.Employee.empName} has resigned from the post ${empPostRankLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `${empPostRankLink.PostRankLink.Rank.designation} "${empPostRankLink.Employee.empName}" has resigned from the post "${empPostRankLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}".`,
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
        message: `Employee cannot be marked resigned as it is linked to another entity.`,
      });
    }

    logger.error("Error deleting employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while marking resignation for the employee.",
    });
  }
};

const abscondEmployee = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { empTableId, postRankLinkId, dateOfAbsconding } = req.params;

  console.log(
    "empTableId, postRankLinkId, dateOfAbsconding :::::",
    empTableId,
    postRankLinkId,
    dateOfAbsconding,
  );
  // Check if post ID and rank ID are valid
  if (
    !empTableId ||
    isNaN(parseInt(empTableId)) ||
    !postRankLinkId ||
    isNaN(parseInt(postRankLinkId))
  ) {
    logger.error("Invalid Employee or Post-Rank ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Employee or Post-Rank ID.",
    });
  }

  try {
    const empPostRankLink = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        postRankLinkId: parseInt(postRankLinkId),
        status: "Active",
      },
      include: {
        Employee: {
          select: {
            empName: true,
          },
        },
        PostRankLink: {
          include: {
            Post: {
              select: {
                postName: true,
              },
            },
            Rank: {
              select: {
                designation: true,
              },
            },
          },
        },
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

    if (empPostRankLink) {
      if (
        new Date(dateOfAbsconding) < new Date(empPostRankLink.dateOfPosting)
      ) {
        logger.error(
          "Date of absconding cannot be before the current posting date.",
        );
        return res.status(400).send({
          status: 400,
          success: false,
          message:
            "Date of absconding date cannot be before the current posting date.",
        });
      }
    }

    await db.empPostRankLink.update({
      where: { ID: empPostRankLink.ID },
      data: {
        status: "Absconded",
        dateOfAbsconding: new Date(dateOfAbsconding),
      },
    });

    // update employee status to inactive
    await db.employee.update({
      where: { ID: empPostRankLink.empTableId },
      data: {
        empStatus: empStatus.Absconded,
        dateOfAbsconding: new Date(dateOfAbsconding),
      },
    });

    logger.info(
      `${empPostRankLink.PostRankLink.Rank.designation} ${empPostRankLink.Employee.empName} has absconded from the post ${empPostRankLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `${empPostRankLink.PostRankLink.Rank.designation} "${empPostRankLink.Employee.empName}" has absconded from the post "${empPostRankLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}".`,
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
        message: `Employee cannot be marked as absconded as it is linked to another entity.`,
      });
    }

    logger.error("Error deleting employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while marking absconding for the employee.",
    });
  }
};

// Function for transferring an employee post rank link
// const transferEmpPostRankLink = async (
//   req: Request,
//   res: Response,
// ): Promise<Response> => {
//   const { empTableId, postRankLinkId } = req.params;
//   const { dateOfPosting } = req.body;

//   console.log("transfer :::::", empTableId, postRankLinkId, dateOfPosting);
//   // Validate IDs
//   if (
//     !empTableId ||
//     isNaN(parseInt(empTableId)) ||
//     !postRankLinkId ||
//     isNaN(parseInt(postRankLinkId))
//   ) {
//     logger.error("Invalid Employee or Post-Rank Link IDs.");
//     return res.status(400).send({
//       status: 400,
//       success: false,
//       message: "Invalid Employee or Post-Rank Link IDs.",
//     });
//   }

//   try {
//     // Validate employee existence
//     const employee = await db.employee.findUnique({
//       where: { ID: parseInt(empTableId) },
//     });
//     if (!employee) {
//       logger.error("Employee not found.");
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         message: "Employee not found.",
//       });
//     }

//     // Verify whether post rank link exists
//     const postRankLink = await db.postRankLink.findUnique({
//       where: { ID: parseInt(postRankLinkId) },
//       include: {
//         Post: { select: { ID: true, postName: true } },
//         Rank: { select: { designation: true } },
//       },
//     });

//     if (!postRankLink) {
//       logger.error("Post rank link not found.");
//       return res.status(404).send({
//         status: 404,
//         success: false,
//         message: "Post rank link not found.",
//       });
//     }

//     // // Validate transfer date
//     // const incomingLink = await db.empPostRankLink.findFirst({
//     //   where: {
//     //     postRankLinkId: parseInt(postRankLinkId),
//     //     empTableId: parseInt(empTableId),
//     //   },
//     // });

//     // if (
//     //   incomingLink &&
//     //   new Date(dateOfPosting) < new Date(incomingLink.dateOfPosting)
//     // ) {
//     //   logger.error("Transfer date cannot be before the current posting date.");
//     //   return res.status(400).send({
//     //     status: 400,
//     //     success: false,
//     //     message: "Transfer date cannot be before the current posting date.",
//     //   });
//     // }

//     const existingLinkWithSamePostRank = await db.empPostRankLink.findFirst({
//       where: {
//         empTableId: parseInt(empTableId),
//         postRankLinkId: {
//           in: await db.postRankLink
//             .findMany({
//               where: {
//                 postId: postRankLink.Post.ID,
//               },
//               select: {
//                 ID: true,
//               },
//             })
//             .then((links) => links.map((link) => link.ID)),
//         },
//       },
//       include: {
//         PostRankLink: { select: { Rank: true } },
//       },
//     });

//     console.log(
//       "existingLinkWithSamePostRank ::::::::::",
//       existingLinkWithSamePostRank,
//     );

//     if (existingLinkWithSamePostRank) {
//       logger.error(
//         `Employee ${employee.empName} is already posted as ${existingLinkWithSamePostRank.PostRankLink.Rank.designation} in the current post.`,
//       );
//       return res.status(400).send({
//         status: 400,
//         success: false,
//         message: `Employee "${employee.empName}" is already posted as "${existingLinkWithSamePostRank.PostRankLink.Rank.designation}" in the current post.`,
//       });
//     }

//     const existingLinksWithOtherPostRanks = await db.empPostRankLink.findMany({
//       where: {
//         empTableId: parseInt(empTableId),
//       },
//       include: { PostRankLink: { select: { Post: true } } },
//     });

//     console.log(
//       "existingLinksWithOtherPostRanks ::::::::::",
//       existingLinksWithOtherPostRanks,
//     );

//     // Check if employee is active in the current post rank
//     // const activeLinkInCurrentPost = await db.empPostRankLink.findFirst({
//     //   where: {
//     //     empTableId: parseInt(empTableId),
//     //     // postRankLinkId: parseInt(postRankLinkId),
//     //     status: "Active",
//     //   },
//     // });

//     // console.log("activeLinkInCurrentPost ::::::::::", activeLinkInCurrentPost);
//     // if (activeLinkInCurrentPost) {
//     //   logger.error("Employee is already active in the specified post.");
//     //   return res.status(400).send({
//     //     status: 400,
//     //     success: false,
//     //     message: `Employee "${employee.empName}" is already active in the specified post.`,
//     //   });
//     // }

//     const mostRecentLink = existingLinksWithOtherPostRanks.reduce(
//       (prev, current) => {
//         if (!prev || prev.dateOfPosting < current.dateOfPosting) {
//           return current;
//         } else {
//           return prev;
//         }
//       },
//       undefined as (typeof existingLinksWithOtherPostRanks)[0] | undefined,
//     );

//     if (mostRecentLink) {
//       if (new Date(dateOfPosting) < new Date(mostRecentLink.dateOfPosting)) {
//         logger.error(
//           "Transfer date cannot be before the current posting date.",
//         );
//         return res.status(400).send({
//           status: 400,
//           success: false,
//           message: "Transfer date cannot be before the current posting date.",
//         });
//       }
//       await db.empPostRankLink.update({
//         where: { ID: mostRecentLink.ID },
//         data: {
//           status: "Inactive",
//           dateOfTransfer: dateOfPosting,
//           transferredTo: postRankLink.Post.postName,
//         },
//       });
//     }

//     // Create a new employee post rank link
//     const newEmpPostRankLink = await db.empPostRankLink.create({
//       data: {
//         empTableId: parseInt(empTableId),
//         postRankLinkId: parseInt(postRankLinkId),
//         dateOfPosting: new Date(dateOfPosting),
//         transferredFrom: mostRecentLink
//           ? mostRecentLink.PostRankLink.Post.postName
//           : null,
//         status: "Active",
//       },
//       include: {
//         Employee: true,
//         PostRankLink: { include: { Post: true, Rank: true } },
//       },
//     });

//     const empPostRankData = {
//       ...newEmpPostRankLink,
//       postName: newEmpPostRankLink.PostRankLink.Post.postName,
//       rankName: newEmpPostRankLink.PostRankLink.Rank.designation,
//       postRankLinkID: newEmpPostRankLink.PostRankLink.ID,
//     };
//     logger.info(
//       `Employee ${newEmpPostRankLink.Employee.empName} linked to post-rank link ${newEmpPostRankLink.postRankLinkId} successfully.`,
//     );
//     return res.status(200).send({
//       status: 200,
//       success: true,
//       message: `Employee "${newEmpPostRankLink.Employee.empName}" transferred to post "${newEmpPostRankLink.PostRankLink.Post.postName}" as "${newEmpPostRankLink.PostRankLink.Rank.designation}" successfully.`,
//       empPostRank: empPostRankData,
//     });
//   } catch (error) {
//     if (
//       error instanceof PrismaClientKnownRequestError &&
//       error.code === "P2003"
//     ) {
//       logger.error("Cannot be deleted as it is linked to another entity.");
//       return res.status(409).send({
//         status: 409,
//         success: false,
//         errorCode: "P2003",
//         message: `Employee cannot be transferred as it is linked to another entity.`,
//       });
//     }

//     logger.error("Error transferring employee post rank link.", error);
//     return res.status(500).send({
//       status: 500,
//       success: false,
//       message:
//         "An error occurred while transferring the employee post rank link.",
//     });
//   }
// };

const transferEmpPostRankLink = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { empTableId, postRankLinkId } = req.params;
  const { dateOfPosting } = req.body;

  // console.log("transfer :::::", empTableId, postRankLinkId, dateOfPosting);

  if (
    !empTableId ||
    isNaN(parseInt(empTableId)) ||
    !postRankLinkId ||
    isNaN(parseInt(postRankLinkId))
  ) {
    logger.error("Invalid Employee or Post-Rank Link IDs.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Employee or Post-Rank Link IDs.",
    });
  }

  try {
    const employee = await db.employee.findUnique({
      where: { ID: parseInt(empTableId) },
    });
    if (!employee) {
      logger.error("Employee not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Employee not found.",
      });
    }

    const postRankLink = await db.postRankLink.findUnique({
      where: { ID: parseInt(postRankLinkId) },
      include: {
        Post: { select: { ID: true, postName: true } },
        Rank: { select: { designation: true } },
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

    // Check if employee is active in the current post rank
    const activeLinkInCurrentPost = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        status: "Active",
        PostRankLink: {
          postId: await db.postRankLink
            .findUnique({
              where: { ID: parseInt(postRankLinkId) },
            })
            .then((link) => link?.postId),
        },
      },
    });

    // console.log("activeLinkInCurrentPost ::::::::::", activeLinkInCurrentPost);
    if (activeLinkInCurrentPost) {
      logger.error("Employee is already active in the specified post.");
      return res.status(400).send({
        status: 400,
        success: false,
        message: `Employee "${employee.empName}" is already active in the specified post.`,
      });
    }

    const mostRecentLink = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        status: "Active",
      },
      include: { PostRankLink: { select: { Post: true } } },
    });

    if (
      mostRecentLink &&
      new Date(dateOfPosting) < new Date(mostRecentLink.dateOfPosting)
    ) {
      logger.error("Transfer date cannot be before the current posting date.");
      return res.status(400).send({
        status: 400,
        success: false,
        message: "Transfer date cannot be before the current posting date.",
      });
    }

    if (mostRecentLink) {
      await db.empPostRankLink.update({
        where: { ID: mostRecentLink.ID },
        data: {
          status: "Transferred",
          dateOfTransfer: dateOfPosting,
          transferredTo: postRankLink.Post.postName.replace(/&amp;/g, "&"),
        },
      });
    }

    const newEmpPostRankLink = await db.empPostRankLink.create({
      data: {
        empTableId: parseInt(empTableId),
        postRankLinkId: parseInt(postRankLinkId),
        dateOfPosting: new Date(dateOfPosting),
        transferredFrom: mostRecentLink
          ? mostRecentLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")
          : null,
        status: "Active",
      },
      include: {
        Employee: true,
        PostRankLink: { include: { Post: true, Rank: true } },
      },
    });

    const empPostRankData = {
      ...newEmpPostRankLink,
      postName: newEmpPostRankLink.PostRankLink.Post.postName.replace(
        /&amp;/g,
        "&",
      ),
      rankName: newEmpPostRankLink.PostRankLink.Rank.designation,
      postRankLinkID: newEmpPostRankLink.PostRankLink.ID,
    };
    logger.info(
      `Employee ${newEmpPostRankLink.Employee.empName} linked to post-rank link ${newEmpPostRankLink.postRankLinkId} successfully.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Employee "${newEmpPostRankLink.Employee.empName}" transferred to post "${newEmpPostRankLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")}" as "${newEmpPostRankLink.PostRankLink.Rank.designation}" successfully.`,
      empPostRank: empPostRankData,
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
        message: `Employee cannot be transferred as it is linked to another entity.`,
      });
    }

    logger.error("Error transferring employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "An error occurred while transferring the employee post rank link.",
    });
  }
};

// Function for getting employees by post ID
const getEmployeesByPostId = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId } = req.params;

  // Validate postId
  if (!postId || isNaN(parseInt(postId))) {
    logger.error("Invalid Post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Post ID.",
    });
  }

  try {
    const post = await db.post.findUnique({
      where: { ID: parseInt(postId) },
      select: { isDeleted: true },
    });

    if (!post || post.isDeleted) {
      logger.error("Post not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not found.",
      });
    }

    // Fetch PostRankLinks associated with the given postId
    const postRankLinks = await db.postRankLink.findMany({
      where: {
        postId: parseInt(postId),
      },
      select: {
        ID: true,
      },
    });

    const postRankLinkIds = postRankLinks.map((link) => link.ID);

    if (postRankLinkIds.length === 0) {
      logger.error("No ranks have been assigned to this post yet.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No ranks have been assigned to this post yet.",
      });
    }

    const empPostRankLinks = await db.empPostRankLink.findMany({
      where: {
        postRankLinkId: {
          in: postRankLinkIds,
        },
      },
      orderBy: {
        // CreatedAt: "desc", // Order by createdAt in descending order
        Employee: {
          empName: "asc",
        },
      },
      select: {
        ID: true,
        empTableId: true,
        postRankLinkId: true,
        dateOfPosting: true,
        dateOfDischarge: true,
        dateOfTransfer: true,
        transferredFrom: true,
        transferredTo: true,
        promotedTo: true,
        promotedFrom: true,
        dateOfPromotion: true,
        dateOfAbsconding: true,
        dateOfResignation: true,
        dateOfRejoining: true,
        status: true,
        Employee: {
          select: {
            empId: true,
            empName: true,
          },
        },
        PostRankLink: {
          select: {
            Rank: {
              select: {
                designation: true,
              },
            },
          },
        },
      },
    });

    if (!empPostRankLinks || empPostRankLinks.length === 0) {
      logger.error("No employees found for this post.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No employees found for this post.",
      });
    }

    const empPostRankLinksData = empPostRankLinks.map((link) => ({
      ID: link.ID,
      empId: link.Employee.empId,
      empTableId: link.empTableId,
      postRankLinkId: link.postRankLinkId,
      dateOfPosting: link.dateOfPosting,
      dateOfDischarge: link.dateOfDischarge,
      dateOfTransfer: link.dateOfTransfer,
      transferredFrom: link.transferredFrom,
      transferredTo: link.transferredTo,
      promotedTo: link.promotedTo,
      promotedFrom: link.promotedFrom,
      dateOfPromotion: link.dateOfPromotion,
      status: link.status,
      empName: link.Employee.empName,
      rank: link.PostRankLink.Rank.designation,
      dateOfResignation: link.dateOfResignation,
      dateOfAbsconding: link.dateOfAbsconding,
      dateOfRejoining: link.dateOfRejoining,
    }));

    logger.info("Employees retrieved successfully.");
    return res.status(200).send({
      status: 200,
      success: true,
      empPostRankLinks: empPostRankLinksData,
    });
  } catch (error) {
    logger.error("Error retrieving employees by post ID.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while retrieving employees.",
    });
  }
};

const promoteEmpPostRankLink = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { empTableId, postRankLinkId } = req.params;
  const { dateOfPromotion } = req.body;

  if (
    !empTableId ||
    isNaN(parseInt(empTableId)) ||
    !postRankLinkId ||
    isNaN(parseInt(postRankLinkId))
  ) {
    logger.error("Invalid Employee or Post-Rank Link IDs.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid Employee or Post-Rank Link IDs.",
    });
  }

  try {
    const employee = await db.employee.findUnique({
      where: { ID: parseInt(empTableId) },
    });
    if (!employee) {
      logger.error("Employee not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Employee not found.",
      });
    }

    const postRankLink = await db.postRankLink.findUnique({
      where: { ID: parseInt(postRankLinkId) },
      include: {
        Post: { select: { ID: true, postName: true } },
        Rank: { select: { designation: true } },
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

    const mostRecentLink = await db.empPostRankLink.findFirst({
      where: {
        empTableId: parseInt(empTableId),
        status: "Active",
      },
      include: {
        PostRankLink: { select: { ID: true, Post: true, Rank: true } },
      },
    });

    // if (
    //   mostRecentLink &&
    //   new Date(dateOfPromotion) < new Date(mostRecentLink.dateOfPosting)
    // ) {
    //   logger.error(
    //     "Promotion date cannot be before the employee's current posting date.",
    //   );
    //   return res.status(400).send({
    //     status: 400,
    //     success: false,
    //     message: "Promotion date cannot be before the current posting date.",
    //   });
    // }
    let isTransfer = false;

    console.log(
      "mostRecentLink id ::::::::::",
      mostRecentLink?.PostRankLink.ID,
    );
    console.log("PostRankLink id ::::::::::", postRankLinkId);
    if (mostRecentLink) {
      // Check if the promotion date is before the current posting date
      if (new Date(dateOfPromotion) < new Date(mostRecentLink.dateOfPosting)) {
        logger.error(
          "Promotion date cannot be before the current posting date.",
        );
        return res.status(400).send({
          status: 400,
          success: false,
          message: "Promotion date cannot be before the current posting date.",
        });
      }
      // Check if the employee is being promoted to the same post
      if (mostRecentLink?.PostRankLink.Post.ID === postRankLink.Post.ID) {
        // If yes, update only promotion details in the recent link
        console.log("Promoting to the same post");
        await db.empPostRankLink.update({
          where: { ID: mostRecentLink.ID },
          data: {
            status: "Inactive",
            dateOfPromotion: new Date(dateOfPromotion),
            promotedTo: postRankLink.Rank.designation,
          },
        });
        isTransfer = false;
      } else {
        // If no, update both promotion details and transfer details the recent link
        console.log("Promoting to a different post");
        await db.empPostRankLink.update({
          where: { ID: mostRecentLink.ID },
          data: {
            status: "Inactive",
            dateOfTransfer: new Date(dateOfPromotion),
            transferredTo: postRankLink.Post.postName.replace(/&amp;/g, "&"),
            dateOfPromotion: new Date(dateOfPromotion),
            promotedTo: postRankLink.Rank.designation,
          },
        });
        isTransfer = true;
      }
    }

    // Create a new empPostRankLink record with the new promotion details
    const newEmpPostRankLink = await db.empPostRankLink.create({
      data: {
        empTableId: parseInt(empTableId),
        postRankLinkId: parseInt(postRankLinkId),
        dateOfPosting: isTransfer
          ? new Date(dateOfPromotion)
          : new Date(dateOfPromotion),
        transferredFrom: mostRecentLink
          ? mostRecentLink.PostRankLink.Post.postName.replace(/&amp;/g, "&")
          : null,
        dateOfPromotion: new Date(dateOfPromotion),
        promotedFrom: mostRecentLink
          ? mostRecentLink.PostRankLink.Rank.designation
          : null,
        status: "Active",
      },
      include: {
        Employee: true,
        PostRankLink: { include: { Post: true, Rank: true } },
      },
    });

    const empPostRankData = {
      ...newEmpPostRankLink,
      postName: newEmpPostRankLink.PostRankLink.Post.postName.replace(
        /&amp;/g,
        "&",
      ),
      rankName: newEmpPostRankLink.PostRankLink.Rank.designation,
      postRankLinkID: newEmpPostRankLink.PostRankLink.ID,
    };

    logger.info(
      `Employee ${newEmpPostRankLink.Employee.empName} promoted to post-rank link ${newEmpPostRankLink.postRankLinkId} successfully.`,
    );

    return res.status(200).send({
      status: 200,
      success: true,
      message: `Employee "${newEmpPostRankLink.Employee.empName}" promoted to "${newEmpPostRankLink.PostRankLink.Rank.designation}" successfully.`,
      empPostRank: empPostRankData,
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
        message: `Employee cannot be transferred as it is linked to another entity.`,
      });
    }

    logger.error("Error transferring employee post rank link.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message:
        "An error occurred while transferring the employee post rank link.",
    });
  }
  // return res.status(200).send({
  //   status: 200,
  //   success: true,
  //   message: "Employee post rank link transferred successfully.",
  // });
};

export {
  createEmpPostRankLink,
  // getEmpPostRankLink,
  // updateEmpPostRankLink,
  getMostRecentEmpPostRankLinkByEmpId,
  dischargeEmployee,
  transferEmpPostRankLink,
  getEmployeesByPostId,
  promoteEmpPostRankLink,
  resignEmployee,
  abscondEmployee,
};
