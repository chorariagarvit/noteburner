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
    // Encrypt the message
    const encrypted = await encryptMessage(message, password);
    
    // Get API URL (prefer localhost for development)
    const apiUrl = 'https://noteburner.work/api';
    
    // Create message via API
    const response = await fetch(`${apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        encryptedData: encrypted.encryptedData,
        iv: encrypted.iv,
        salt: encrypted.salt,
        expiresIn: parseInt(expiresIn)
      })
    });
    
    if (!response.ok) {
      let errorMessage = 'Failed to create message';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch (e) {
        // Response is not JSON, use status text
        errorMessage = `${response.status}: ${response.statusText}`;
      }
      throw new Error(errorMessage);
    }
    
    const data = await response.json();
    
    // Construct share URL
    const shareUrl = `https://noteburner.work/${data.id}`;
    
    return {
      url: shareUrl,
      id: data.id,
      expiresAt: data.expiresAt
    };
  } catch (error) {
    console.error('Error creating secure message:', error);
    throw error;
  }
}
