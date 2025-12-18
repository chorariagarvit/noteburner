const API_URL = import.meta.env.VITE_API_URL || 'https://noteburner-api.gravitysolutions.in';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB max

/**
 * Upload a large file using chunked multipart upload
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
  const initResponse = await fetch(`${API_URL}/api/media/init`, {
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
  });

  if (!initResponse.ok) {
    const error = await initResponse.json();
    throw new Error(error.error || 'Failed to initialize upload');
  }

  const { fileId, uploadId, chunkSize } = await initResponse.json();

  // Step 2: Upload chunks
  const totalChunks = Math.ceil(encryptedData.length / chunkSize);
  const parts = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, encryptedData.length);
    const chunkData = encryptedData.slice(start, end);

    const chunkResponse = await fetch(`${API_URL}/api/media/chunk`, {
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
      throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}`);
    }

    const { partNumber, etag } = await chunkResponse.json();
    parts.push({ partNumber, etag });

    // Report progress
    if (onProgress) {
      const progress = Math.round(((i + 1) / totalChunks) * 100);
      onProgress(progress);
    }
  }

  // Step 3: Complete upload
  const completeResponse = await fetch(`${API_URL}/api/media/complete`, {
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
  });

  if (!completeResponse.ok) {
    throw new Error('Failed to complete upload');
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
