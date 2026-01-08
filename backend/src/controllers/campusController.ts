import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import prisma from '../config/prisma';
import { AppError } from '../utils/errors';

/**
 * Get all active announcements for the authenticated user
 */
export async function getAnnouncements(req: AuthRequest, res: Response) {
  try {
    const user = req.user!;

    const now = new Date();

    const announcements = await prisma.announcements.findMany({
      where: {
        is_active: true,
        publish_date: { lte: now },
        OR: [
          { expiry_date: null },
          { expiry_date: { gte: now } },
        ],
      },
      include: {
        users: {
          select: {
            full_name: true,
            role: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { publish_date: 'desc' },
      ],
    });

    // Filter based on target audience
    const filteredAnnouncements = announcements.filter(announcement => {
      const targetAudience = announcement.target_audience as string[];
      return targetAudience.includes('ALL') || targetAudience.includes(user.role);
    });

    res.json({
      success: true,
      data: filteredAnnouncements.map(a => ({
        id: a.id,
        title: a.title,
        content: a.content,
        type: a.type,
        priority: a.priority,
        publishDate: a.publish_date,
        expiryDate: a.expiry_date,
        author: a.users?.full_name || 'Unknown',
        attachments: a.attachments,
      })),
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements',
    });
  }
}

/**
 * Get a specific announcement
 */
export async function getAnnouncement(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const announcement = await prisma.announcements.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: {
          select: {
            full_name: true,
            role: true,
          },
        },
      },
    });

    if (!announcement) {
      throw new AppError('Announcement not found', 404);
    }

    res.json({
      success: true,
      data: announcement,
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Get announcement error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch announcement',
      });
    }
  }
}

/**
 * Get all public events
 */
export async function getEvents(req: AuthRequest, res: Response) {
  try {
    const { category, startDate, endDate } = req.query;

    const where: any = {
      is_public: true,
    };

    if (category) {
      where.category = category;
    }

    if (startDate) {
      where.start_time = {
        gte: new Date(startDate as string),
      };
    }

    if (endDate) {
      where.end_time = {
        lte: new Date(endDate as string),
      };
    }

    const events = await prisma.events.findMany({
      where,
      orderBy: {
        start_time: 'asc',
      },
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events',
    });
  }
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(_req: AuthRequest, res: Response) {
  try {
    const now = new Date();
    const thirtyDaysLater = new Date();
    thirtyDaysLater.setDate(now.getDate() + 30);

    const events = await prisma.events.findMany({
      where: {
        is_public: true,
        start_time: {
          gte: now,
          lte: thirtyDaysLater,
        },
      },
      orderBy: {
        start_time: 'asc',
      },
      take: 10,
    });

    res.json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming events',
    });
  }
}

/**
 * Register for an event (placeholder)
 */
export async function registerForEvent(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;

    const event = await prisma.events.findUnique({
      where: { id: parseInt(id) },
    });

    if (!event) {
      throw new AppError('Event not found', 404);
    }

    if (event.capacity && event.registered >= event.capacity) {
      throw new AppError('Event is full', 400);
    }

    // In a full implementation, we'd create an EventRegistration model
    // For now, just increment the registered count
    await prisma.events.update({
      where: { id: parseInt(id) },
      data: {
        registered: {
          increment: 1,
        },
      },
    });

    res.json({
      success: true,
      message: 'Successfully registered for event',
    });
  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    } else {
      console.error('Register for event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to register for event',
      });
    }
  }
}
