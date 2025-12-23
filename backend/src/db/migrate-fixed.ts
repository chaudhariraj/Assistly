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
      // Skip only if completely empty or just whitespace/comments
      if (trimmed.length > 0) {
        // Remove standalone comment lines but keep the SQL
        const cleaned = trimmed.split('\n')
          .filter(line => line.trim().length > 0 && !line.trim().startsWith('--'))
          .join('\n')
          .trim();
        if (cleaned.length > 0) {
          statements.push(cleaned);
        }
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
  if (trimmed.length > 0) {
    const cleaned = trimmed.split('\n')
      .filter(line => line.trim().length > 0 && !line.trim().startsWith('--'))
      .join('\n')
      .trim();
    if (cleaned.length > 0) {
      statements.push(cleaned);
    }
  }

  return statements.filter(s => s.trim().length > 0);
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
    console.log(`📄 Schema file loaded: ${schema.length} characters from ${schemaPath}`);
    
    // Debug: Check if CREATE TABLE statements are in the file
    const hasCreateTable = schema.includes('CREATE TABLE');
    const hasCreateIndex = schema.includes('CREATE INDEX');
    console.log(`   Contains CREATE TABLE: ${hasCreateTable}, CREATE INDEX: ${hasCreateIndex}`);
    
    // Count semicolons (should match number of statements roughly)
    const semicolonCount = (schema.match(/;/g) || []).length;
    console.log(`   Semicolons found: ${semicolonCount}`);
    
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
    
    // Log all statements for debugging
    statements.forEach((stmt, idx) => {
      const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`   [${idx + 1}] ${preview}...`);
    });
    
    // Execute each statement
    const errors: string[] = [];
    const criticalErrors: string[] = [];
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;
      
      const statementType = statement.substring(0, 30).toUpperCase();
      const isTableCreate = statementType.includes('CREATE TABLE');
      
      try {
        const result = await pool.query(statement);
        if (isTableCreate) {
          const tableName = statement.match(/CREATE TABLE.*?(\w+)/i)?.[1] || 'unknown';
          console.log(`✅ Created table: ${tableName}`);
        }
      } catch (error: any) {
        const errorMsg = error.message || String(error);
        const errorCode = error.code || '';
        
        // Ignore "already exists" errors
        if (errorMsg.includes('already exists') || 
            errorMsg.includes('duplicate') ||
            errorMsg.includes('already defined') ||
            errorCode === '42P07' || // duplicate_table
            errorCode === '42710') { // duplicate_object
          // Silently ignore - these are expected
        } else {
          // Log actual errors
          const errorInfo = `Statement ${i + 1} [${statementType.substring(0, 20)}]: ${errorMsg.substring(0, 150)}`;
          console.error(`❌ ${errorInfo}`);
          
          if (isTableCreate) {
            criticalErrors.push(errorInfo);
          } else {
            errors.push(errorInfo);
          }
        }
      }
    }
    
    if (criticalErrors.length > 0) {
      console.error(`❌ ${criticalErrors.length} critical errors (table creation failed):`);
      criticalErrors.forEach(err => console.error(`   - ${err}`));
      throw new Error('Critical migration errors: table creation failed');
    }
    
    if (errors.length > 0) {
      console.warn(`⚠️  ${errors.length} non-critical errors (indexes/triggers may have failed)`);
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

