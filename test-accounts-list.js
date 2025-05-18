// Test script to diagnose accounts list issue
const Avanza = require('./lib/index.js');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create debug function that always logs
process.env.NODE_ENV = 'development';

const avanza = new Avanza();

// Helper function to mask sensitive data for logging
function maskSensitiveData(obj) {
  if (!obj) return obj;
  
  // If it's a simple string, just mask it
  if (typeof obj === 'string') {
    if (obj.length > 8) {
      return obj.substring(0, 4) + '****' + obj.substring(obj.length - 4);
    }
    return '****';
  }
  
  // For arrays, map each element
  if (Array.isArray(obj)) {
    return obj.map(item => maskSensitiveData(item));
  }
  
  // For objects, process each property
  if (typeof obj === 'object') {
    const masked = {};
    for (const key in obj) {
      // Mask sensitive keys
      if (['password', 'token', 'secret', 'securityToken', 'totpSecret', 'sessionId', 'cookie'].some(
          k => key.toLowerCase().includes(k)) && typeof obj[key] === 'string') {
        masked[key] = obj[key].substring(0, 4) + '****';
      } else {
        masked[key] = maskSensitiveData(obj[key]);
      }
    }
    return masked;
  }
  
  // Return other data types as is
  return obj;
}

async function testAccountsList() {
  try {
    console.log('Attempting to authenticate...');
    // Use credentials from .env file
    const authResult = await avanza.authenticate({
      username: process.env.AVANZA_USERNAME,
      password: process.env.AVANZA_PASSWORD,
      totpSecret: process.env.AVANZA_TOTP_SECRET,
    });
    
    console.log('Authentication successful with token:', authResult.securityToken.substring(0,4) + '****');
    
    // No need to wait, our cookie implementation should handle this correctly
    console.log('Attempting to get accounts list with cookies...');
    try {
      const accounts = await avanza.getAccountsList();
      console.log('Accounts list received successfully:', maskSensitiveData(accounts));
    } catch (accountsError) {
      console.error('Error getting accounts list:', accountsError);
      
      // If we get a 401, try to re-authenticate and try again
      if (accountsError.statusCode === 401) {
        console.log('Received 401, trying to re-authenticate...');
        
        // No need to wait, our implementation should handle proper re-authentication
        
        // Re-authenticate
        const newAuthResult = await avanza.authenticate({
          username: process.env.AVANZA_USERNAME,
          password: process.env.AVANZA_PASSWORD,
          totpSecret: process.env.AVANZA_TOTP_SECRET,
        });
        
        console.log('Re-authentication successful, trying accounts list again...');
        const accounts = await avanza.getAccountsList();
        console.log('Accounts list received successfully after re-auth:', maskSensitiveData(accounts));
      }
    }
    
    // For comparison, try the overview endpoint which might be more stable
    console.log('Attempting to get overview...');
    try {
      const overview = await avanza.getOverview();
      console.log('Overview received successfully:', maskSensitiveData(overview));
    } catch (overviewError) {
      console.error('Error getting overview:', overviewError);
    }
    
  } catch (authError) {
    console.error('Authentication failed:', authError);
  } finally {
    avanza.disconnect();
  }
}

testAccountsList();