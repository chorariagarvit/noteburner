// Crypto utilities for NoteBurner extension
// Adapted from the main app's crypto module

/**
 * Generate a random password
 */
function generatePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length];
  }
  
  return password;
}

/**
 * Encrypt a message using AES-GCM
 */
async function encryptMessage(message, password) {
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // Derive key from password
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 300000,
      hash: 'SHA-256'
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Generate IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt message
  const encryptedData = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encoder.encode(message)
  );
  
  // Convert to base64
  const encryptedArray = new Uint8Array(encryptedData);
  const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
  const ivBase64 = btoa(String.fromCharCode(...iv));
  const saltBase64 = btoa(String.fromCharCode(...salt));
  
  return {
    encryptedData: encryptedBase64,
    iv: ivBase64,
    salt: saltBase64
  };
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
      const error = await response.json();
      throw new Error(error.error || 'Failed to create message');
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
