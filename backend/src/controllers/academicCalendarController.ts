import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

/**
 * Get academic events with optional filtering
 */
export async function getEvents(req: Request, res: Response) {
  try {
    const { term, year } = req.query;

    const filters: Prisma.Sql[] = [];

    if (term) {
      filters.push(Prisma.sql`term = ${term}`);
    }

    if (year) {
      filters.push(Prisma.sql`year = ${parseInt(year as string, 10)}`);
    }

    const whereClause =
      filters.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(filters, ' AND ')}`
        : Prisma.sql``;

    const events = await prisma.$queryRaw<
      Array<Record<string, unknown>>
    >(Prisma.sql`
      SELECT *
      FROM academic_events
      ${whereClause}
      ORDER BY start_date ASC
    `);

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch academic events',
    });
  }
}

/**
 * Check if add/drop period is currently open
 */
export async function getAddDropStatus(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await prisma.$queryRaw<
      Array<Record<string, unknown>>
    >(Prisma.sql`
      SELECT *
      FROM academic_events
      WHERE event_type = 'ADD_DROP'
        AND CURRENT_DATE BETWEEN start_date AND end_date
      ORDER BY start_date DESC
      LIMIT 1
    `);

    if (rows.length > 0) {
      res.status(200).json({
        success: true,
        data: {
          isOpen: true,
          period: rows[0],
        },
      });
    } else {
      res.status(200).json({
        success: true,
        data: {
          isOpen: false,
          period: null,
        },
      });
    }
  } catch (error: any) {
    console.error('Get add/drop status error:', error);
    
    // If table doesn't exist, return closed status
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      res.status(200).json({
        success: true,
        data: {
          isOpen: false,
          period: null,
        },
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to check add/drop status',
    });
  }
}

/**
 * Get upcoming events
 */
export async function getUpcomingEvents(req: Request, res: Response): Promise<void> {
  try {
    const limit = Number.parseInt(req.query.limit as string, 10) || 5;

    const events = await prisma.$queryRaw<
      Array<Record<string, unknown>>
    >(Prisma.sql`
      SELECT *
      FROM academic_events
      WHERE start_date >= CURRENT_DATE
      ORDER BY start_date ASC
      LIMIT ${limit}
    `);

    res.status(200).json({
      success: true,
      data: events,
    });
  } catch (error: any) {
    console.error('Get upcoming events error:', error);
    
    // If table doesn't exist, return empty array
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      res.status(200).json({
        success: true,
        data: [],
      });
      return;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch upcoming events',
    });
  }
}

/**
 * Get holidays
 */
export async function getHolidays(req: Request, res: Response) {
  try {
    const { term, year } = req.query;

    const filters: Prisma.Sql[] = [Prisma.sql`event_type = 'HOLIDAY'`];

    if (term) {
      filters.push(Prisma.sql`term = ${term}`);
    }

    if (year) {
      filters.push(Prisma.sql`year = ${parseInt(year as string, 10)}`);
    }

    const holidays = await prisma.$queryRaw<
      Array<Record<string, unknown>>
    >(Prisma.sql`
      SELECT *
      FROM academic_events
      WHERE ${Prisma.join(filters, ' AND ')}
      ORDER BY start_date ASC
    `);

    res.status(200).json({
      success: true,
      data: holidays,
    });
  } catch (error) {
    console.error('Get holidays error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch holidays',
    });
  }
}
