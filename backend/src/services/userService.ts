import { pool } from '../db/connection';

export interface User {
  id: number;
  google_id: string;
  email: string;
  name: string | null;
  picture: string | null;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
}

export interface CreateUserData {
  google_id: string;
  email: string;
  name?: string;
  picture?: string;
}

/**
 * Find or create a user in the database
 */
export async function findOrCreateUser(data: CreateUserData): Promise<User> {
  let client;
  try {
    // Try to get connection with timeout
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]) as any;
  } catch (error) {
    console.error('Failed to get database connection:', error);
    throw new Error('Database connection failed');
  }
  
  try {
    // First, try to find existing user by email or google_id
    let result = await client.query(
      `SELECT * FROM users WHERE email = $1 OR google_id = $2 LIMIT 1`,
      [data.email, data.google_id]
    );

    if (result.rows.length > 0) {
      // User exists, update last_login
      const user = result.rows[0];
      await client.query(
        `UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP,
         name = COALESCE($1, name), picture = COALESCE($2, picture)
         WHERE id = $3`,
        [data.name || null, data.picture || null, user.id]
      );
      return { ...user, last_login: new Date() };
    }

    // User doesn't exist, create new user
    result = await client.query(
      `INSERT INTO users (google_id, email, name, picture, last_login)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING *`,
      [data.google_id, data.email, data.name || null, data.picture || null]
    );

    return result.rows[0];
  } catch (error: any) {
    console.error('Error in findOrCreateUser:', error);
    // Check if it's a connection error or table doesn't exist
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      console.error('Database connection or table issue:', error.message);
      throw new Error('Database not available');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in findUserByEmail:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM users WHERE id = $1 LIMIT 1`,
      [id]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error in findUserById:', error);
    return null;
  } finally {
    client.release();
  }
}

/**
 * Save or update OAuth tokens for a user
 */
export async function saveUserTokens(
  userId: number,
  tokens: {
    access_token: string;
    refresh_token?: string;
    expiry_date?: number;
    token_type?: string;
    scope?: string;
  }
): Promise<void> {
  let client;
  try {
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]) as any;
  } catch (error) {
    console.error('Failed to get database connection for saveUserTokens:', error);
    throw new Error('Database connection failed');
  }
  
  try {
    // Check if tokens already exist
    const existing = await client.query(
      `SELECT id FROM oauth_tokens WHERE user_id = $1`,
      [userId]
    );

    if (existing.rows.length > 0) {
      // Update existing tokens
      await client.query(
        `UPDATE oauth_tokens 
         SET access_token = $1, refresh_token = $2, expiry_date = $3,
             token_type = $4, scope = $5, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $6`,
        [
          tokens.access_token,
          tokens.refresh_token || null,
          tokens.expiry_date || null,
          tokens.token_type || 'Bearer',
          tokens.scope || null,
          userId
        ]
      );
    } else {
      // Insert new tokens
      await client.query(
        `INSERT INTO oauth_tokens (user_id, access_token, refresh_token, expiry_date, token_type, scope)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          tokens.access_token,
          tokens.refresh_token || null,
          tokens.expiry_date || null,
          tokens.token_type || 'Bearer',
          tokens.scope || null
        ]
      );
    }
  } catch (error: any) {
    console.error('Error in saveUserTokens:', error);
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
      console.error('Database connection or table issue:', error.message);
      throw new Error('Database not available');
    }
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

