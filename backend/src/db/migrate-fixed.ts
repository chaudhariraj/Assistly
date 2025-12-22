import { pool } from './connection';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Parse SQL statements, handling dollar-quoted strings ($$) properly
 */
function parseSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    // Check for dollar-quoted strings ($$ ... $$)
    if (char === '$' && nextChar === '$') {
      if (!inDollarQuote) {
        // Start of dollar quote
        inDollarQuote = true;
        // Extract the tag (could be $$ or $tag$)
        let tagEnd = i + 2;
        while (tagEnd < sql.length && sql[tagEnd] !== '$') {
          tagEnd++;
        }
        dollarTag = sql.substring(i, tagEnd + 1);
        current += dollarTag;
        i = tagEnd + 1;
        continue;
      } else {
        // Check if this is the closing tag
        const potentialTag = sql.substring(i, i + dollarTag.length);
        if (potentialTag === dollarTag) {
          // End of dollar quote
          inDollarQuote = false;
          current += dollarTag;
          i += dollarTag.length;
          continue;
        }
      }
    }

    // If we're in a dollar quote, just add the character
    if (inDollarQuote) {
      current += char;
      i++;
      continue;
    }

    // Check for semicolon (statement separator)
    if (char === ';') {
      const trimmed = current.trim();
      if (trimmed && !trimmed.startsWith('--')) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += char;
    i++;
  }

  // Add final statement if any
  const trimmed = current.trim();
  if (trimmed && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }

  return statements.filter(s => s.length > 0);
}

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('🔄 Running database migrations...');
    
    // Try multiple paths for schema file
    let schemaPath: string;
    try {
      schemaPath = join(__dirname, 'schema.sql');
      readFileSync(schemaPath, 'utf-8');
    } catch {
      schemaPath = join(__dirname, '..', 'db', 'schema.sql');
    }
    
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Check if tables already exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'oauth_tokens', 'chat_logs', 'usage_metrics');
    `);
    
    if (tablesCheck.rows.length === 4) {
      console.log('✅ Database tables already exist, skipping migration');
      return;
    }
    
    console.log(`📊 Found ${tablesCheck.rows.length}/4 tables. Creating missing tables...`);
    
    // Parse SQL statements properly
    const statements = parseSQLStatements(schema);
    console.log(`📝 Parsed ${statements.length} SQL statements`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      try {
        await pool.query(statement);
      } catch (error: any) {
        // Ignore "already exists" errors
        if (!error.message.includes('already exists') && 
            !error.message.includes('duplicate') &&
            !error.message.includes('already defined')) {
          console.warn(`⚠️  Statement ${i + 1} warning: ${error.message.substring(0, 150)}`);
        }
      }
    }
    
    // Verify tables were created
    const finalCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'oauth_tokens', 'chat_logs', 'usage_metrics');
    `);
    
    if (finalCheck.rows.length === 4) {
      console.log(`✅ Database migrations completed successfully`);
      console.log(`   Tables: ${finalCheck.rows.map(r => r.table_name).join(', ')}`);
    } else {
      console.error(`❌ Migration incomplete: Expected 4 tables, found ${finalCheck.rows.length}`);
      if (finalCheck.rows.length > 0) {
        console.error(`   Tables found: ${finalCheck.rows.map(r => r.table_name).join(', ')}`);
      }
      throw new Error('Migration failed - not all tables were created');
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

