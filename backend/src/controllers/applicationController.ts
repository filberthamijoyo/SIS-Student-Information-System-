import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';

/**
 * Get all applications for the authenticated user
 */
export async function getMyApplications(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;

    const applications = await prisma.applications.findMany({
      where: { user_id: userId },
      orderBy: {
        requested_date: 'desc',
      },
    });

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
    });
  }
}

/**
 * Submit a new application
 */
export async function submitApplication(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { type, semester, year, reason, supportingDocs } = req.body;

    if (!type || !reason) {
      throw new AppError('Type and reason are required', 400);
    }

    const application = await prisma.applications.create({
      data: {
        user_id: userId,
        type,
        semester: semester || null,
        year: year ? parseInt(year) : null,
        reason,
        supporting_docs: supportingDocs || null,
        status: 'PENDING',
      },
    });

    res.json({
      success: true,
      message: 'Application submitted successfully',
      data: application,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Submit application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit application',
      });
    }
  }
}

/**
 * Get a specific application
 */
export async function getApplication(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const application = await prisma.applications.findFirst({
      where: {
        id: parseInt(id),
        user_id: userId,
      },
      include: {
        users_applications_reviewed_byTousers: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    res.json({
      success: true,
      data: application,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch application',
      });
    }
  }
}

/**
 * Withdraw an application
 */
export async function withdrawApplication(req: AuthRequest, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const application = await prisma.applications.findFirst({
      where: {
        id: parseInt(id),
        user_id: userId,
      },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (application.status !== 'PENDING' && application.status !== 'UNDER_REVIEW') {
      throw new AppError('Cannot withdraw application in current status', 400);
    }

    const updatedApplication = await prisma.applications.update({
      where: { id: parseInt(id) },
      data: { status: 'WITHDRAWN' },
    });

    res.json({
      success: true,
      message: 'Application withdrawn successfully',
      data: updatedApplication,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Withdraw application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to withdraw application',
      });
    }
  }
}

/**
 * Get all pending applications (admin only)
 */
export async function getPendingApplications(req: AuthRequest, res: Response) {
  try {
    const applications = await prisma.applications.findMany({
      where: {
        status: {
          in: ['PENDING', 'UNDER_REVIEW'],
        },
      },
      include: {
        users_applications_user_idTousers: {
          select: {
            full_name: true,
            email: true,
            students_students_user_idTousers: {
              select: {
                student_id: true,
                majors: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        requested_date: 'asc',
      },
    });

    res.json({
      success: true,
      data: applications,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get pending applications error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch applications',
      });
    }
  }
}

/**
 * Review an application (admin only)
 */
export async function reviewApplication(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;
    const { id } = req.params;
    const { status, decision, reviewNotes } = req.body;

    if (!status || !decision) {
      throw new AppError('Status and decision are required', 400);
    }

    const application = await prisma.applications.findUnique({
      where: { id: parseInt(id) },
    });

    if (!application) {
      throw new AppError('Application not found', 404);
    }

    const updatedApplication = await prisma.applications.update({
      where: { id: parseInt(id) },
      data: {
        status,
        decision,
        review_notes: reviewNotes || null,
        reviewed_by: user.id,
        reviewed_at: new Date(),
      },
      include: {
        users_applications_user_idTousers: {
          select: {
            full_name: true,
            email: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Application reviewed successfully',
      data: updatedApplication,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Review application error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to review application',
      });
    }
  }
}
