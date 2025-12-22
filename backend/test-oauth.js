// Quick test script to check OAuth configuration
require('dotenv').config();

console.log('=== OAuth Configuration Check ===\n');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : ' MISSING');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? ' SET' : ' MISSING');
console.log('GOOGLE_REDIRECT_URL:', process.env.GOOGLE_REDIRECT_URL || ' NOT SET (will use default)');
console.log('BACKEND_URL:', process.env.BACKEND_URL || 'NOT SET (will use default)');

const redirectUrl = process.env.GOOGLE_REDIRECT_URL || `${process.env.BACKEND_URL || 'http://localhost:3001'}/api/auth/google/callback`;
console.log('\n=== Final Redirect URI ===');
console.log(' Will use:', redirectUrl);
console.log('\n  Make sure this EXACT URL is in Google Cloud Console!');


