// Crypto utilities for NoteBurner extension
// Matches the main app's crypto module implementation

/**
 * Helper: Convert ArrayBuffer to base64
 * Uses chunked approach to avoid stack overflow with large files
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const CHUNK_SIZE = 8192; // Process 8KB at a time
  let binary = '';
  
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, Math.min(i + CHUNK_SIZE, bytes.length));
    binary += String.fromCharCode.apply(null, chunk);
  }
  
  return btoa(binary);
}

/**
 * Helper: Convert base64 to ArrayBuffer
 * Uses efficient direct conversion without string concatenation
 */
function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password, salt) {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 300000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate strong random password
 */
function generatePassword(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const randomValues = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomValues)
    .map(x => chars[x % chars.length])
    .join('');
}

/**
 * Encrypt message with password
 */
async function encryptMessage(message, password) {
  try {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Encrypt message
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      messageBuffer
    );
    
    // Convert to base64 for transmission
    return {
      encryptedData: arrayBufferToBase64(encryptedBuffer),
      iv: arrayBufferToBase64(iv),
      salt: arrayBufferToBase64(salt)
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt message');
  }
}

/**
 * Create a secure message via API
 */
async function createSecureMessage(message, password, expiresIn = '24') {
  try {
    console.log('[NoteBurner Extension] Starting message encryption...');
    console.log('[NoteBurner Extension] Message length:', message.length);
    console.log('[NoteBurner Extension] Expires in:', expiresIn, 'hours');
    
    // Encrypt the message
    const encrypted = await encryptMessage(message, password);
    console.log('[NoteBurner Extension] Encryption complete');
    console.log('[NoteBurner Extension] Encrypted data length:', encrypted.encryptedData.length);
    
    // Use Worker URL directly - bypass Pages routing
    const apiUrl = 'https://noteburner-api.gravity-solutions-cf-account.workers.dev';
    const endpoint = `${apiUrl}/api/messages`;
    
    console.log('[NoteBurner Extension] API endpoint:', endpoint);
    console.log('[NoteBurner Extension] Request method: POST');
    
    // Convert hours to seconds (same as website does)
    const expirySeconds = parseInt(expiresIn) * 3600;
    
    const requestBody = {
      encryptedData: encrypted.encryptedData,
      iv: encrypted.iv,
      salt: encrypted.salt,
      expiresIn: expirySeconds
    };
    
    console.log('[NoteBurner Extension] Request body:', {
      encryptedDataLength: requestBody.encryptedData.length,
      ivLength: requestBody.iv.length,
      saltLength: requestBody.salt.length,
      expiresIn: requestBody.expiresIn,
      expiresInHours: expiresIn
    });
    
    // Create message via API
    console.log('[NoteBurner Extension] Sending request...');
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('[NoteBurner Extension] Response received');
    console.log('[NoteBurner Extension] Status:', response.status, response.statusText);
    console.log('[NoteBurner Extension] Headers:', Object.fromEntries(response.headers.entries()));
    console.log('[NoteBurner Extension] OK:', response.ok);
    
    if (!response.ok) {
      let errorMessage = 'Failed to create message';
      let errorDetails = null;
      try {
        const contentType = response.headers.get('content-type');
        console.log('[NoteBurner Extension] Error response content-type:', contentType);
        
        const errorBody = await response.text();
        console.log('[NoteBurner Extension] Error response body:', errorBody);
        
        if (contentType && contentType.includes('application/json') && errorBody) {
          errorDetails = JSON.parse(errorBody);
          errorMessage = errorDetails.error || errorMessage;
        } else {
          errorMessage = `${response.status}: ${response.statusText}`;
        }
      } catch (e) {
        console.error('[NoteBurner Extension] Failed to parse error response:', e);
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      console.error('[NoteBurner Extension] Request failed:', errorMessage);
      throw new Error(errorMessage);
    }
    
    const responseText = await response.text();
    console.log('[NoteBurner Extension] Success response body:', responseText);
    
    const data = JSON.parse(responseText);
    console.log('[NoteBurner Extension] Parsed data:', data);
    
    // API returns either 'url' directly or we construct from token/slug
    // Response format: { success: true, token, slug?, url }
    const shareUrl = data.url || `https://noteburner.work/m/${data.slug || data.token}`;
    const messageId = data.slug || data.token;
    
    console.log('[NoteBurner Extension] Message created successfully');
    console.log('[NoteBurner Extension] Message ID:', messageId);
    console.log('[NoteBurner Extension] Share URL:', shareUrl);
    
    return {
      url: shareUrl,
      id: messageId,
      expiresAt: data.expiresAt
    };
  } catch (error) {
    console.error('[NoteBurner Extension] Error creating secure message:', error);
    console.error('[NoteBurner Extension] Error stack:', error.stack);
    throw error;
  }
}
