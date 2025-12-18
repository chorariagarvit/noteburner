# Large File Upload (up to 2GB) - Implementation Guide

## Overview

NoteBurner now supports file uploads up to **2GB** using chunked multipart uploads. This bypasses Cloudflare Workers' 100MB request body limit.

## How It Works

### Architecture

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │
       │ 1. Initialize upload
       ↓
┌─────────────────┐
│ Workers API     │
│ /api/media/init │ ← Returns uploadId & fileId
└──────┬──────────┘
       │
       │ 2. Upload chunks (50MB each)
       ↓
┌──────────────────┐
│ Workers API      │
│ /api/media/chunk │ → Uploads to R2 multipart
└──────┬───────────┘
       │
       │ 3. Complete upload
       ↓
┌────────────────────┐
│ Workers API        │
│ /api/media/complete│ → Finalizes R2 multipart
└────────────────────┘
```

### Decision Logic

- **Files ≤ 100MB**: Use direct upload (legacy `/api/media` endpoint)
- **Files > 100MB**: Use chunked upload (multipart API)

## Backend API

### 1. Initialize Upload
**POST** `/api/media/init`

Request:
```json
{
  "fileName": "video.mp4",
  "fileType": "video/mp4",
  "fileSize": 524288000,
  "iv": "base64_iv",
  "salt": "base64_salt",
  "token": "message_token"
}
```

Response:
```json
{
  "success": true,
  "fileId": "unique_file_id",
  "uploadId": "r2_multipart_upload_id",
  "chunkSize": 52428800
}
```

### 2. Upload Chunk
**POST** `/api/media/chunk`

Request:
```json
{
  "fileId": "unique_file_id",
  "uploadId": "r2_multipart_upload_id",
  "chunkIndex": 0,
  "chunkData": "base64_chunk_data"
}
```

Response:
```json
{
  "success": true,
  "partNumber": 1,
  "etag": "chunk_etag"
}
```

### 3. Complete Upload
**POST** `/api/media/complete`

Request:
```json
{
  "fileId": "unique_file_id",
  "uploadId": "r2_multipart_upload_id",
  "parts": [
    { "partNumber": 1, "etag": "etag1" },
    { "partNumber": 2, "etag": "etag2" }
  ],
  "fileName": "video.mp4",
  "token": "message_token",
  "fileSize": 524288000
}
```

Response:
```json
{
  "success": true,
  "fileId": "unique_file_id",
  "fileName": "video.mp4"
}
```

## Frontend Implementation

### Usage

```javascript
import { uploadLargeFile, shouldUseChunkedUpload } from '../utils/chunkedUpload';
import { encryptFile } from '../utils/crypto';

// Encrypt file first
const encryptedFile = await encryptFile(file, password);

// Determine upload method
if (shouldUseChunkedUpload(encryptedFile.encryptedData.length)) {
  // Use chunked upload for large files
  await uploadLargeFile(
    file,
    encryptedFile.encryptedData,
    encryptedFile.iv,
    encryptedFile.salt,
    messageToken,
    (progress) => {
      console.log(`Upload progress: ${progress}%`);
    }
  );
} else {
  // Use direct upload for smaller files
  await uploadMedia(
    encryptedFile.encryptedData,
    file.name,
    file.type,
    encryptedFile.iv,
    encryptedFile.salt,
    messageToken
  );
}
```

### Progress Tracking

The `onProgress` callback receives a percentage (0-100):

```javascript
const [uploadProgress, setUploadProgress] = useState({});

await uploadLargeFile(file, data, iv, salt, token, (progress) => {
  setUploadProgress(prev => ({ ...prev, [fileIndex]: progress }));
});

// Display progress bar
<div className="progress-bar">
  <div style={{ width: `${uploadProgress[fileIndex] || 0}%` }} />
</div>
```

## Configuration

### Backend (wrangler.toml)

```toml
[vars]
MAX_FILE_SIZE = "2147483648"  # 2GB
```

### Frontend (chunkedUpload.js)

```javascript
const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB chunks
const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB max
```

## Performance Considerations

### Chunk Size Selection

- **50MB chunks** = Optimal balance
  - Fewer API calls than 10MB chunks
  - Better error recovery than 100MB chunks
  - Works within Workers 128MB memory limit

### Memory Usage

- **Encryption**: Entire file loaded into memory
- **Upload**: Only one 50MB chunk in memory at a time
- **Total**: ~File size + 50MB during upload

### Bandwidth

- 2GB file = ~41 chunks × 50MB
- Upload time depends on user's connection speed
- No bandwidth charges between Workers and R2 (both Cloudflare)

## Error Handling

### Automatic Retry

Not implemented yet. Consider adding:

```javascript
async function uploadChunkWithRetry(chunkData, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await uploadChunk(chunkData);
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}
```

### Cleanup on Failure

If upload fails mid-way, the incomplete multipart upload remains in R2. Add cleanup:

```javascript
app.post('/api/media/abort', async (c) => {
  const { fileId, uploadId } = await c.req.json();
  const multipartUpload = c.env.MEDIA_BUCKET.resumeMultipartUpload(fileId, uploadId);
  await multipartUpload.abort();
  return c.json({ success: true });
});
```

## Testing

### Test Large File Upload

```bash
# Create 200MB test file
dd if=/dev/zero of=test-200mb.bin bs=1M count=200

# Create 1GB test file
dd if=/dev/zero of=test-1gb.bin bs=1M count=1024

# Upload through NoteBurner UI and monitor:
# - Browser DevTools Network tab
# - Upload progress indicator
# - Console for chunk logs
```

### Verify R2 Storage

```bash
wrangler r2 object list noteburner-media --limit 10
```

## Limitations

### Current

- ✅ Max file size: 2GB
- ✅ Chunk size: 50MB
- ✅ Max concurrent chunks: 1 (sequential upload)
- ✅ Encryption: Client-side AES-256-GCM
- ⚠️ No pause/resume support
- ⚠️ No automatic retry on chunk failure
- ⚠️ No parallel chunk uploads

### Cloudflare R2 Limits

- Max object size: **5TB** (we're limited to 2GB for UX reasons)
- Max multipart parts: **10,000**
- Min part size: **5MB** (except last part)
- Max part size: **5GB**

## Future Enhancements

1. **Parallel chunk uploads** - Upload 3-5 chunks simultaneously
2. **Pause/resume** - Store upload state in IndexedDB
3. **Background uploads** - Use Service Workers
4. **Compression** - Optional gzip before encryption
5. **Incremental encryption** - Encrypt chunks on-the-fly instead of entire file

## Deployment Checklist

- [x] Backend: Add multipart upload endpoints
- [x] Backend: Update `MAX_FILE_SIZE` to 2GB
- [x] Frontend: Implement chunked upload utility
- [x] Frontend: Add progress indicators
- [x] Frontend: Update file size validation
- [x] Documentation: Update SETUP.md
- [ ] Deploy backend to Workers
- [ ] Deploy frontend to Pages
- [ ] Test with 500MB file
- [ ] Test with 1.5GB file
- [ ] Monitor R2 storage costs
