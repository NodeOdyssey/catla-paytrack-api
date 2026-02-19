// Import npm modules
import { Request, Response } from "express";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// Import helpers
import logger from "../helpers/logger";

// Import database
import { db } from "../configs/db.config";
import { ReportName, status } from "@prisma/client";

// Function for creating a post
const createPost = async (req: Request, res: Response): Promise<Response> => {
  const {
    postName,
    contactPerson,
    phoneNum,
    gstin,
    address,
    pan,
    contractDate,
    docContract,
    docGst,
    docPan,
    docOther,
  } = req.body;

  // Check for duplicates
  const duplicateChecks = [
    { field: "postName", value: postName, name: "Post Name" },
  ];

  const checkDuplicate = async (field: string, value: any) => {
    const existingRecord = await db.post.findFirst({
      where: {
        [field]: value,
        isDeleted: false,
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

  // Fetch and store post data in post object
  const postData = {
    postName,
    contactPerson,
    phoneNum,
    gstin,
    address,
    pan,
    contractDate: contractDate ? new Date(contractDate) : null,
    // docContract,
    // docGst,
    // docPan,
    // docOther,
    status: status.Active,
  };

  // Create post
  try {
    const postCreated = await db.post.create({
      data: postData,
    });

    logger.info(`Post ${postCreated.postName.replace(/&amp;/g, "&")} created.`);
    return res.status(201).send({
      status: 201,
      success: true,
      message: `Post "${postCreated.postName.replace(/&amp;/g, "&")}" registered successfully.`,
      post: postCreated,
    });
  } catch (err: any) {
    logger.error("Error while creating post: ", err);

    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while registering post.",
    });
  }
};

// Function for fetching all posts
const getAllPosts = async (req: Request, res: Response): Promise<Response> => {
  try {
    const posts = await db.post.findMany({
      orderBy: {
        postName: "asc",
      },
      where: {
        isDeleted: false,
      },
    });

    if (posts.length === 0) {
      logger.info("No posts found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "No posts found.",
      });
    }

    logger.info("Posts retrieved successfully.");
    return res.status(200).send({
      status: 200,
      count: posts.length,
      message: `${posts.length} posts retrieved successfully.`,
      success: true,
      posts: posts.map((post) => ({
        ...post,
        postName: post.postName.replace(/&amp;/g, "&"),
      })),
    });
  } catch (err: any) {
    logger.error("Error while fetching posts: ", err.message);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching posts.",
    });
  }
};

// Function for fetching a post by ID
const getPostById = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  // Check if post ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  try {
    // Fetch the post by ID
    const post = await db.post.findUnique({
      where: { ID: parseInt(id) },
    });

    // Check if the post exists
    if (!post || post.isDeleted) {
      logger.info(`Post with ID ${id} not found.`);
      return res.status(404).send({
        status: 404,
        success: false,
        message: `Post with ID ${id} not found.`,
      });
    }

    logger.info(`Post with ID ${id} retrieved successfully.`);
    return res.status(200).send({
      status: 200,
      success: true,
      post: {
        ...post, // TODO: Check how to decode doc fields
      },
    });
  } catch (err: any) {
    logger.error("Error while fetching post: ", err.message);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "Internal server error while fetching post.",
    });
  }
};

// Function for updating a post
const updatePost = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  // Check if post ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  const {
    postName,
    contactPerson,
    phoneNum,
    gstin,
    address,
    pan,
    // docGst,
    // docPan,
    // docContract,
    // docOther,
    contractDate,
  } = req.body;

  // Fetch the existing post
  const post = await db.post.findUnique({
    where: { ID: parseInt(id) },
  });

  if (!post || post.isDeleted) {
    logger.error("Post not found.");
    return res.status(404).send({
      status: 404,
      success: false,
      message: "Post not found.",
    });
  }

  // Prepare the updated post data object
  const updatedPostData = {
    postName: postName || post.postName.replace(/&amp;/g, "&"),
    address: address || post.address,
    gstin: gstin || post.gstin,
    pan: pan,
    // docGst: docGst,
    // docPan: docPan,
    // docContract: docContract,
    // docOther: docOther,
    contractDate: contractDate ? new Date(contractDate) : post.contractDate,
    contactPerson: contactPerson,
    phoneNum: phoneNum,
  };

  // Update the post in the database
  try {
    const updatedPost = await db.post.update({
      where: { ID: parseInt(id) },
      data: { ID: parseInt(id), ...updatedPostData },
    });

    logger.info(
      `Post ${updatedPost.postName.replace(/&amp;/g, "&")} updated successfully.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Post "${updatedPost.postName.replace(/&amp;/g, "&")}" updated successfully.`,
      post: updatedPost,
    });
  } catch (error) {
    logger.error("Error updating post.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while updating the post.",
    });
  }
};

// Function for deleting a post
const deletePost = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  // Check if post ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  let post;

  try {
    // Fetch the existing post
    post = await db.post.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!post) {
      logger.error("Post not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not found.",
      });
    }

    // Delete the post from the database
    // await db.post.delete({
    //   where: { ID: parseInt(id) },
    // });
    await db.post.update({
      where: { ID: parseInt(id) },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    // Cascade: deactivate all linked EmpPostRankLinks + update Employee statuses
    const postRankLinks = await db.postRankLink.findMany({
      where: { postId: parseInt(id) },
      select: { ID: true },
    });

    const postRankLinkIds = postRankLinks.map((link) => link.ID);

    if (postRankLinkIds.length > 0) {
      // Fetch active empPostRankLinks to know impacted employees
      const activeEmpLinks = await db.empPostRankLink.findMany({
        where: {
          postRankLinkId: { in: postRankLinkIds },
          status: "Active",
        },
        select: { empTableId: true },
      });

      await db.empPostRankLink.updateMany({
        where: {
          postRankLinkId: { in: postRankLinkIds },
          status: "Active",
        },
        data: {
          status: "Inactive",
          dateOfDischarge: new Date(),
        },
      });

      const empTableIds = [...new Set(activeEmpLinks.map((l) => l.empTableId))];
      if (empTableIds.length > 0) {
        await db.employee.updateMany({
          where: { ID: { in: empTableIds } },
          data: {
            empStatus: "Inactive",
            dateOfDischarge: new Date(),
          },
        });
      }
    }

    logger.info(
      `Post "${post.postName.replace(/&amp;/g, "&")}" deleted successfully.`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Post "${post.postName.replace(/&amp;/g, "&")}" deleted successfully.`,
    });
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      logger.error(
        `Post "${post?.postName.replace(/&amp;/g, "&")}" cannot be deleted as it is linked to another entity.`,
      );
      return res.status(409).send({
        status: 409,
        success: false,
        errorCode: "P2003",
        message: `Post "${post?.postName.replace(/&amp;/g, "&")}" cannot be deleted as it is linked to another entity.`,
      });
    }

    logger.error("Error deleting post.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while deleting the post.",
    });
  }
};

const deactivatePost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  // Check if post ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  try {
    // Fetch the existing post
    const post = await db.post.findUnique({
      where: { ID: parseInt(id) },
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
        postId: parseInt(id),
      },
      select: {
        ID: true,
      },
    });

    const postRankLinkIds = postRankLinks.map((link) => link.ID);

    if (postRankLinkIds.length > 0) {
      const empPostRankLinks = await db.empPostRankLink.findMany({
        where: {
          postRankLinkId: {
            in: postRankLinkIds,
          },
        },
      });

      if (empPostRankLinks.length > 0) {
        // Remove all empPostRankLinks associated with the post
        await db.empPostRankLink.updateMany({
          where: {
            postRankLinkId: {
              in: postRankLinkIds,
            },
          },
          data: {
            status: "Inactive",
            dateOfDischarge: new Date(),
          },
        });
      }
    }
    // Update the post status in the database
    await db.post.update({
      where: { ID: parseInt(id) },
      data: { status: "Inactive" },
    });

    return res.status(200).send({
      status: 200,
      success: true,
      message: `Post "${post.postName.replace(/&amp;/g, "&")}" deactivated successfully.`,
    });
  } catch (error) {
    logger.error("Error deactivating post.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while deactivating the post.",
    });
  }
};

const reactivatePost = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { id } = req.params;

  // Check if post ID is valid
  if (!id || isNaN(parseInt(id))) {
    logger.error("Invalid post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  try {
    // Fetch the existing post
    const post = await db.post.findUnique({
      where: { ID: parseInt(id) },
    });

    if (!post || post.isDeleted) {
      logger.error("Post not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not found.",
      });
    }
    // Update the post status in the database
    await db.post.update({
      where: { ID: parseInt(id) },
      data: { status: "Active" },
    });

    return res.status(200).send({
      status: 200,
      success: true,
      message: `Post "${post.postName.replace(/&amp;/g, "&")}" reactivated successfully.`,
    });
  } catch (error) {
    logger.error("Error deactivating post.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while deactivating the post.",
    });
  }
};

const updatePostReportType = async (
  req: Request,
  res: Response,
): Promise<Response> => {
  const { postId } = req.params;
  const { reportName } = req.body;

  console.log("Post ID: ", postId);
  console.log("Report name: ", reportName);
  const providedReportType = reportName as ReportName;

  console.log("Post ID: ", postId);
  console.log("Report name: ", providedReportType);
  // Validate postId
  if (!postId || isNaN(Number(postId))) {
    logger.error("Invalid post ID.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid post ID.",
    });
  }

  // Validate reportName against enum
  const validReportNames: ReportName[] = [
    "NONE",
    "VIEW_DS_REPORT",
    "ESI_REPORT",
    "EPF_REPORT",
    "PTAX_REPORT",
    "WITHOUT_ALLOWANCE_REPORT",
    "NEW_PAYROLL_REPORT",
    "DSL_REPORT",
    "LNT_REPORT",
    "OTHERS_REPORT",
    "SALARY_REPORT",
  ];

  if (
    !providedReportType ||
    !validReportNames
      .map((type) => type.toUpperCase())
      .includes(providedReportType)
  ) {
    logger.error("Invalid report type.");
    return res.status(400).send({
      status: 400,
      success: false,
      message: "Invalid report type.",
      validReportNames,
    });
  }

  try {
    // Check if post exists
    const post = await db.post.findUnique({
      where: { ID: Number(postId) },
    });

    if (!post || post.isDeleted) {
      logger.error("Post not found.");
      return res.status(404).send({
        status: 404,
        success: false,
        message: "Post not found.",
      });
    }

    // console.log("which post : ", post);
    // console.log("Which report type: ", reportName);

    // Update reportName
    const updatedPost = await db.post.update({
      where: { ID: Number(postId) },
      data: { reportName: providedReportType },
    });

    console.log(
      "What is updated post provided report type: ",
      updatedPost.reportName,
    );

    logger.info(
      `Post "${updatedPost.postName.replace(/&amp;/g, "&")}" report type updated to "${updatedPost.reportName}".`,
    );
    return res.status(200).send({
      status: 200,
      success: true,
      message: `Post "${updatedPost.postName.replace(/&amp;/g, "&")}" report type updated to "${updatedPost.reportName}" successfully.`,
      post: updatedPost,
    });
  } catch (error) {
    logger.error("Error updating post reportName.", error);
    return res.status(500).send({
      status: 500,
      success: false,
      message: "An error occurred while updating the post reportName.",
    });
  }
};

export {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  deactivatePost,
  reactivatePost,
  updatePostReportType,
};
