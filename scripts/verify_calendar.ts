import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyCalendar() {
  try {
    const events = await prisma.$queryRaw<Array<{
      id: number;
      event_type: string;
      term: string;
      year: number;
      start_date: Date;
      end_date: Date | null;
      name: string;
    }>>`
      SELECT id, event_type, term, year, start_date, end_date, name
      FROM academic_events
      WHERE year IN (2024, 2025, 2026)
      ORDER BY year ASC, start_date ASC
    `;

    console.log(`\n📅 Found ${events.length} events in the database:\n`);
    
    const byType: Record<string, number> = {};
    const byTerm: Record<string, number> = {};
    
    events.forEach(event => {
      byType[event.event_type] = (byType[event.event_type] || 0) + 1;
      byTerm[event.term] = (byTerm[event.term] || 0) + 1;
      
      const dateRange = event.end_date 
        ? `${event.start_date.toISOString().split('T')[0]} to ${event.end_date.toISOString().split('T')[0]}`
        : event.start_date.toISOString().split('T')[0];
      
      console.log(`  ${event.name}`);
      console.log(`    Type: ${event.event_type} | Term: ${event.term} | Year: ${event.year} | Date: ${dateRange}\n`);
    });
    
    console.log('\n📊 Summary by Type:');
    Object.entries(byType).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log('\n📊 Summary by Term:');
    Object.entries(byTerm).forEach(([term, count]) => {
      console.log(`  ${term}: ${count}`);
    });
    
  } catch (error) {
    console.error('Error verifying calendar:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyCalendar();

