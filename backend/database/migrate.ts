import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Database Migration Script
 * Runs schema.sql and optionally seed.sql to set up the database
 */

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'course_selection',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

/**
 * Read SQL file
 */
const readSQLFile = (filename: string): string => {
  const filePath = path.join(__dirname, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }

  return fs.readFileSync(filePath, 'utf-8');
};

/**
 * Run migration
 */
const runMigration = async () => {
  const client = await pool.connect();

  try {
    console.log('='.repeat(50));
    console.log('Starting database migration...');
    console.log('='.repeat(50));

    // Read schema file
    console.log('\n1. Reading schema.sql...');
    const schema = readSQLFile('schema.sql');

    // Execute schema
    console.log('2. Executing schema...');
    await client.query(schema);
    console.log('✓ Schema created successfully');

    // Ask if user wants to seed data
    const shouldSeed = process.argv.includes('--seed');

    if (shouldSeed) {
      console.log('\n3. Reading seed.sql...');
      const seed = readSQLFile('seed.sql');

      console.log('4. Executing seed data...');
      await client.query(seed);
      console.log('✓ Seed data inserted successfully');
    } else {
      console.log('\n⚠ Skipping seed data. Use --seed flag to include sample data.');
    }

    console.log('\n='.repeat(50));
    console.log('✓ Migration completed successfully!');
    console.log('='.repeat(50));

    // Display table information
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('\nCreated tables:');
    tables.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });

    if (shouldSeed) {
      // Display record counts
      console.log('\nRecord counts:');

      const userCount = await client.query('SELECT COUNT(*) FROM users');
      console.log(`  - Users: ${userCount.rows[0].count}`);

      const courseCount = await client.query('SELECT COUNT(*) FROM courses');
      console.log(`  - Courses: ${courseCount.rows[0].count}`);

      const slotCount = await client.query('SELECT COUNT(*) FROM time_slots');
      console.log(`  - Time Slots: ${slotCount.rows[0].count}`);

      const enrollmentCount = await client.query('SELECT COUNT(*) FROM enrollments');
      console.log(`  - Enrollments: ${enrollmentCount.rows[0].count}`);
    }
  } catch (error) {
    console.error('\n✗ Migration failed:');
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

/**
 * Rollback migration (drop all tables)
 */
const rollbackMigration = async () => {
  const client = await pool.connect();

  try {
    console.log('='.repeat(50));
    console.log('Rolling back database...');
    console.log('='.repeat(50));

    await client.query(`
      DROP TABLE IF EXISTS enrollments CASCADE;
      DROP TABLE IF EXISTS time_slots CASCADE;
      DROP TABLE IF EXISTS courses CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TYPE IF EXISTS user_role CASCADE;
      DROP TYPE IF EXISTS course_status CASCADE;
      DROP TYPE IF EXISTS enrollment_status CASCADE;
      DROP TYPE IF EXISTS semester_type CASCADE;
      DROP TYPE IF EXISTS day_of_week CASCADE;
      DROP TYPE IF EXISTS grade_type CASCADE;
    `);

    console.log('✓ Database rolled back successfully');
  } catch (error) {
    console.error('✗ Rollback failed:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

/**
 * Main execution
 */
const main = async () => {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Database Migration Tool

Usage:
  npm run migrate              Run migration (schema only)
  npm run migrate --seed       Run migration with seed data
  npm run migrate --rollback   Drop all tables and types
  npm run migrate --help       Show this help message

Options:
  --seed       Include sample seed data
  --rollback   Drop all database objects
  --help, -h   Show help message
    `);
    process.exit(0);
  }

  if (args.includes('--rollback')) {
    await rollbackMigration();
  } else {
    await runMigration();
  }
};

// Run migration
main().catch((error) => {
  console.error('✗ Unexpected error:', error);
  process.exit(1);
});
