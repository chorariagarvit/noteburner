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

  // Step 1: Initialize multipart upload with timeout
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
  }, 30000); // 30s timeout for init

  if (!initResponse.ok) {
    const error = await initResponse.json();
    throw new Error(error.error || 'Failed to initialize upload');
  }

  const { fileId, uploadId, chunkSize } = await initResponse.json();

  // Step 2: Upload chunks with retry logic and smooth progress
  const totalChunks = Math.ceil(encryptedData.length / chunkSize);
  const parts = [];
  let currentProgress = 0;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, encryptedData.length);
    const chunkData = encryptedData.slice(start, end);
    
    let lastError = null;
    let uploaded = false;

    // Retry logic for each chunk
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Smooth progress - increment gradually during upload attempt
        const targetProgress = Math.floor(((i + 0.5) / totalChunks) * 100);
        if (onProgress && targetProgress > currentProgress) {
          // Animate progress in small steps
          const progressInterval = setInterval(() => {
            if (currentProgress < targetProgress) {
              currentProgress++;
              onProgress(currentProgress);
            }
          }, 50); // Update every 50ms for smooth animation
          
          setTimeout(() => clearInterval(progressInterval), 1000); // Clear after 1s
        }

        const chunkResponse = await fetchWithTimeout(`${API_URL}/api/media/chunk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileId,
            uploadId,
            chunkIndex: i,
            chunkData
          })
        });

        if (!chunkResponse.ok) {
          const error = await chunkResponse.json();
          throw new Error(error.error || 'Chunk upload failed');
        }

        const { partNumber, etag } = await chunkResponse.json();
        parts.push({ partNumber, etag });
        uploaded = true;

        // Update progress after successful upload
        currentProgress = Math.floor(((i + 1) / totalChunks) * 100);
        if (onProgress) {
          onProgress(currentProgress);
        }

        break; // Success, exit retry loop
      } catch (error) {
        lastError = error;
        console.warn(`Chunk ${i + 1}/${totalChunks} upload attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt < MAX_RETRIES - 1) {
          // Wait before retry with exponential backoff
          await sleep(RETRY_DELAY * (attempt + 1));
        }
      }
    }

    if (!uploaded) {
      throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks} after ${MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
    }
  }

  // Step 3: Complete upload with timeout
  const completeResponse = await fetchWithTimeout(`${API_URL}/api/media/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileId,
      uploadId,
      parts,
      fileName: file.name,
      token,
      fileSize: encryptedData.length
    })
  }, 30000); // 30s timeout for completion

  if (!completeResponse.ok) {
    const error = await completeResponse.json();
    throw new Error(error.error || 'Failed to complete upload');
  }

  // Set progress to 100%
  if (onProgress) {
    onProgress(100);
  }

  return completeResponse.json();
}

/**
 * Determine if file should use chunked upload
 * @param {number} fileSize - File size in bytes
 * @returns {boolean}
 */
export function shouldUseChunkedUpload(fileSize) {
  return fileSize > 100 * 1024 * 1024; // Use chunked upload for files >100MB
}
