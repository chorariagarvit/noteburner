const API_URL = import.meta.env.VITE_API_URL || 'https://noteburner-api.gravitysolutions.in';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB max
const MAX_RETRIES = 3; // Retry failed chunks up to 3 times
const RETRY_DELAY = 1000; // Wait 1s before retry
const UPLOAD_TIMEOUT = 120000; // 2 minute timeout per chunk

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options, timeout = UPLOAD_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timeout - please check your connection');
    }
    throw error;
  }
}

/**
 * Initialize multipart upload
 */
async function initializeUpload(file, encryptedData, iv, salt, token) {
  const initResponse = await fetchWithTimeout(`${API_URL}/api/media/init`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: file.type,
      fileSize: encryptedData.length,
      iv,
      salt,
      token
    })
  }, 30000);

  if (!initResponse.ok) {
    const error = await initResponse.json();
    throw new Error(error.error || 'Failed to initialize upload');
  }

  return initResponse.json();
}

/**
 * Upload a single chunk with retry logic
 */
async function uploadChunk(fileId, uploadId, chunkIndex, chunkData, totalChunks, onProgress, currentProgress) {
  let lastError = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Smooth progress animation
      const targetProgress = Math.floor(((chunkIndex + 0.5) / totalChunks) * 100);
      if (onProgress && targetProgress > currentProgress.value) {
        const progressInterval = setInterval(() => {
          if (currentProgress.value < targetProgress) {
            currentProgress.value++;
            onProgress(currentProgress.value);
          }
        }, 50);
        
        setTimeout(() => clearInterval(progressInterval), 1000);
      }

      const chunkResponse = await fetchWithTimeout(`${API_URL}/api/media/chunk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          uploadId,
          chunkIndex,
          chunkData
        })
      });

      if (!chunkResponse.ok) {
        const error = await chunkResponse.json();
        throw new Error(error.error || 'Chunk upload failed');
      }

      const { partNumber, etag } = await chunkResponse.json();
      
      // Update progress after successful upload
      currentProgress.value = Math.floor(((chunkIndex + 1) / totalChunks) * 100);
      if (onProgress) {
        onProgress(currentProgress.value);
      }

      return { partNumber, etag };
    } catch (error) {
      lastError = error;
      console.warn(`Chunk ${chunkIndex + 1}/${totalChunks} upload attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < MAX_RETRIES - 1) {
        await sleep(RETRY_DELAY * (attempt + 1));
      }
    }
  }

  throw new Error(`Failed to upload chunk ${chunkIndex + 1}/${totalChunks} after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
}

/**
 * Complete multipart upload
 */
async function completeUpload(fileId, uploadId, parts, fileName, token, fileSize) {
  const completeResponse = await fetchWithTimeout(`${API_URL}/api/media/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      uploadId,
      parts,
      fileName,
      token,
      fileSize
    })
  }, 30000);

  if (!completeResponse.ok) {
    const error = await completeResponse.json();
    throw new Error(error.error || 'Failed to complete upload');
  }

  return completeResponse.json();
}

/**
 * Upload a large file using chunked multipart upload with retry logic
 * @param {File} file - The file to upload
 * @param {string} encryptedData - Base64 encoded encrypted file data
 * @param {string} iv - Initialization vector
 * @param {string} salt - Salt for encryption
 * @param {string} token - Message token
 * @param {Function} onProgress - Progress callback (percentage)
 * @returns {Promise<{success: boolean, fileId: string}>}
 */
export async function uploadLargeFile(file, encryptedData, iv, salt, token, onProgress) {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum of ${MAX_FILE_SIZE / (1024 * 1024 * 1024)}GB`);
  }

  // Step 1: Initialize multipart upload
  const { fileId, uploadId, chunkSize } = await initializeUpload(file, encryptedData, iv, salt, token);

  // Step 2: Upload chunks with retry logic
  const totalChunks = Math.ceil(encryptedData.length / chunkSize);
  const parts = [];
  const currentProgress = { value: 0 }; // Use object to pass by reference

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, encryptedData.length);
    const chunkData = encryptedData.slice(start, end);
    
    const part = await uploadChunk(fileId, uploadId, i, chunkData, totalChunks, onProgress, currentProgress);
    parts.push(part);
  }

  // Step 3: Complete upload
  const result = await completeUpload(fileId, uploadId, parts, file.name, token, encryptedData.length);

  // Set progress to 100%
  if (onProgress) {
    onProgress(100);
  }

  return result;
}

/**
 * Determine if file should use chunked upload
 * @param {number} fileSize - File size in bytes
 * @returns {boolean}
 */
export function shouldUseChunkedUpload(fileSize) {
  return fileSize > 100 * 1024 * 1024; // Use chunked upload for files >100MB
}
