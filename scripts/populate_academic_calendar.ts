import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

interface CalendarEvent {
  event_type: string;
  term: string;
  year: number;
  start_date: string;
  end_date: string | null;
  name: string;
  description: string | null;
}

async function populateAcademicCalendar() {
  try {
    // Read both JSON files
    const jsonPath2024 = path.join(process.cwd(), 'academic_calendar_events_2024.json');
    const jsonPath2025 = path.join(process.cwd(), 'academic_calendar_events.json');
    
    const events2024 = JSON.parse(fs.readFileSync(jsonPath2024, 'utf-8')) as CalendarEvent[];
    const events2025 = JSON.parse(fs.readFileSync(jsonPath2025, 'utf-8')) as CalendarEvent[];
    
    const allEvents = [...events2024, ...events2025];
    console.log(`Found ${events2024.length} events for 2024-2025 and ${events2025.length} events for 2025-2026`);
    console.log(`Total: ${allEvents.length} events to import`);

    // Fix date issues and deduplicate
    const fixedEvents: CalendarEvent[] = [];
    const seen = new Set<string>();

    for (const event of allEvents) {
      // Skip events with invalid names (parsing errors)
      if (!event.name || event.name.length < 5 || /^\d+$/.test(event.name)) {
        continue;
      }

      let startDate = new Date(event.start_date);
      let endDate = event.end_date ? new Date(event.end_date) : null;

      // Fix year for events in 2026 (for 2025-2026 calendar)
      if (startDate.getMonth() < 5 && event.year === 2025 && startDate.getFullYear() === 2025 && event.year >= 2025) {
        startDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
        if (endDate) {
          endDate = new Date(endDate.getFullYear() + 1, endDate.getMonth(), endDate.getDate());
        }
        event.year = 2026;
      }

      // Fix specific events for 2025-2026
      if (event.name === 'Add/Drop for T1' && event.year === 2025) {
        event.start_date = '2025-08-31';
        event.end_date = '2025-09-12';
        startDate = new Date('2025-08-31');
        endDate = new Date('2025-09-12');
      }
      if (event.name === 'Chinese New Year Holiday (Tentative)' && event.year === 2026) {
        event.start_date = '2026-02-09';
        event.end_date = '2026-03-01';
        event.term = 'T2';
        startDate = new Date('2026-02-09');
        endDate = new Date('2026-03-01');
      }

      // Fix term assignments
      if (event.name.includes('Class Make-up')) {
        if (event.name.includes('Monday') || event.name.includes('Tuesday')) {
          event.term = 'T1';
        } else if (event.name.includes('Friday')) {
          event.term = 'T2';
        }
      }
      if (event.name.includes('National Day') || event.name.includes('Mid-Autumn')) {
        event.event_type = 'HOLIDAY';
        event.term = 'T1';
      }
      if (event.name.includes('Chinese New Year')) {
        event.event_type = 'HOLIDAY';
        if (event.name.includes('Holiday')) {
          event.term = 'T2';
        } else {
          event.term = 'T2';
        }
      }
      if (event.name.includes('Qingming') || event.name.includes('Labor Day') || event.name.includes('Dragon Boat')) {
        event.event_type = 'HOLIDAY';
        if (event.name.includes('Qingming') || event.name.includes('Labor Day')) {
          event.term = 'T2';
        } else if (event.name.includes('Dragon Boat')) {
          event.term = 'SUMMER';
        }
      }
      if (event.name.includes('First Teaching Day') || event.name.includes('Last Teaching Day')) {
        event.event_type = 'TERM_START_END';
      }

      // Create unique key
      const key = `${event.start_date}-${event.name}-${event.year}`;
      if (!seen.has(key)) {
        seen.add(key);
        fixedEvents.push({
          ...event,
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate ? endDate.toISOString().split('T')[0] : null,
        });
      }
    }

    console.log(`After deduplication: ${fixedEvents.length} unique events`);

    // Clear existing events for 2024-2026
    console.log('Clearing existing events for 2024-2026...');
    await prisma.$executeRaw`
      DELETE FROM academic_events 
      WHERE year IN (2024, 2025, 2026)
    `;

    // Insert events
    console.log('Inserting events...');
    let inserted = 0;
    let errors = 0;

    for (const event of fixedEvents) {
      try {
        if (event.end_date) {
          await prisma.$executeRaw`
            INSERT INTO academic_events (event_type, term, year, start_date, end_date, name, description, created_at)
            VALUES (
              ${event.event_type}::VARCHAR(50),
              ${event.term}::VARCHAR(20),
              ${event.year}::INTEGER,
              ${event.start_date}::DATE,
              ${event.end_date}::DATE,
              ${event.name}::VARCHAR,
              ${event.description || null}::VARCHAR,
              NOW()
            )
          `;
        } else {
          await prisma.$executeRaw`
            INSERT INTO academic_events (event_type, term, year, start_date, end_date, name, description, created_at)
            VALUES (
              ${event.event_type}::VARCHAR(50),
              ${event.term}::VARCHAR(20),
              ${event.year}::INTEGER,
              ${event.start_date}::DATE,
              NULL,
              ${event.name}::VARCHAR,
              ${event.description || null}::VARCHAR,
              NOW()
            )
          `;
        }
        inserted++;
        if (inserted % 5 === 0) {
          console.log(`  Inserted ${inserted}/${fixedEvents.length} events...`);
        }
      } catch (error: any) {
        console.error(`Error inserting event "${event.name}":`, error.message);
        errors++;
      }
    }

    console.log(`\n✅ Successfully inserted ${inserted} events`);
    if (errors > 0) {
      console.log(`⚠️  ${errors} errors occurred`);
    }

    // Verify insertion
    const count2024 = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM academic_events WHERE year = 2024 OR (year = 2025 AND start_date < '2025-08-01')
    `;
    const count2025 = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM academic_events WHERE (year = 2025 AND start_date >= '2025-08-01') OR year = 2026
    `;
    const totalCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM academic_events WHERE year IN (2024, 2025, 2026)
    `;
    console.log(`\n📊 Total events in database:`);
    console.log(`  2024-2025: ${count2024[0].count}`);
    console.log(`  2025-2026: ${count2025[0].count}`);
    console.log(`  Total: ${totalCount[0].count}`);

  } catch (error) {
    console.error('Error populating academic calendar:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

populateAcademicCalendar()
  .then(() => {
    console.log('\n✨ Academic calendar population completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

