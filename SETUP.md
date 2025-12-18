# NoteBurner Setup Guide

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- Cloudflare account
- Wrangler CLI installed (`npm install -g wrangler`)

## Initial Setup

### 1. Install Dependencies

```bash
cd noteburner
npm run setup
```

This will install dependencies for both backend and frontend.

### 2. Backend Setup (Cloudflare Workers)

#### Create D1 Database

```bash
cd backend
wrangler d1 create noteburner-db
```

Copy the database ID from the output and update `backend/wrangler.toml`:

```toml
[[ d1_databases ]]
binding = "DB"
database_name = "noteburner-db"
database_id = "YOUR_DATABASE_ID_HERE"
```

#### Apply Database Migrations

```bash
wrangler d1 migrations apply noteburner-db --remote
```

#### Create R2 Bucket

```bash
wrangler r2 bucket create noteburner-media
```

#### Login to Cloudflare

```bash
wrangler login
```

### 3. Frontend Setup

Create `frontend/.env`:

```bash
cp frontend/.env.example frontend/.env
```

For local development, it should contain:

```
VITE_API_URL=http://localhost:8787
```

For production, update it to your Workers URL:

```
VITE_API_URL=https://noteburner-api.YOUR_SUBDOMAIN.workers.dev
```

## Development

### Start Backend (Terminal 1)

```bash
npm run dev:backend
```

Backend will run at `http://localhost:8787`

### Start Frontend (Terminal 2)

```bash
npm run dev:frontend
```

Frontend will run at `http://localhost:5173`

## Deployment

### Deploy Backend

```bash
npm run deploy:backend
```

Note the Workers URL from the output.

### Deploy Frontend

Update `frontend/.env` with your production API URL, then:

```bash
npm run deploy:frontend
```

Or manually deploy to Cloudflare Pages:

1. Build the frontend:
   ```bash
   cd frontend && npm run build
   ```

2. Create a new Pages project in Cloudflare dashboard

3. Upload the `frontend/dist` directory

4. Set environment variable:
   - `VITE_API_URL`: Your Workers API URL

## Environment Variables

### Backend (wrangler.toml)

- `MAX_MESSAGE_SIZE`: Maximum message size in bytes (default: 10MB)
- `MAX_FILE_SIZE`: Maximum file size in bytes (default: 2GB, uses chunked uploads for files >100MB)
- `RATE_LIMIT_REQUESTS`: Max requests per window (default: 10)
- `RATE_LIMIT_WINDOW`: Rate limit window in seconds (default: 60)

### Frontend (.env)

- `VITE_API_URL`: Backend API URL

## Scheduled Jobs (Optional)

To automatically clean up expired messages, add a cron trigger to your Worker:

In `backend/wrangler.toml`:

```toml
[triggers]
crons = ["0 * * * *"]  # Run every hour
```

Then add scheduled handler in `backend/src/index.js`:

```javascript
export default {
  async scheduled(event, env, ctx) {
    // Call cleanup endpoint
    await fetch('https://your-worker.workers.dev/api/cleanup');
  },
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  }
}
```

## Testing

### Test Message Creation

1. Go to http://localhost:5173/create
2. Enter a message and password
3. Create the message
4. Copy the shareable link

### Test Message Decryption

1. Open the shareable link
2. Enter the password
3. Verify message is displayed
4. Try accessing the link again (should fail - message deleted)

## Troubleshooting

### Database Connection Errors

Make sure your D1 database ID is correct in `wrangler.toml` and migrations are applied.

### CORS Errors

Check that your frontend URL is allowed in the CORS configuration in `backend/src/index.js`.

### File Upload Fails

Verify R2 bucket is created and bound correctly in `wrangler.toml`.

## Security Considerations

1. **Password Storage**: Passwords are never sent to the server. All encryption/decryption happens client-side.

2. **HTTPS Only**: Always use HTTPS in production. Cloudflare Workers and Pages provide this automatically.

3. **Rate Limiting**: Implement additional rate limiting for production using Cloudflare's built-in features.

4. **Content Security Policy**: Add CSP headers for additional security.

5. **File Validation**: Validate file types and sizes on both client and server.

## Production Checklist

- [ ] D1 database created and migrations applied
- [ ] R2 bucket created
- [ ] Backend deployed to Workers
- [ ] Frontend deployed to Pages
- [ ] Environment variables configured
- [ ] HTTPS enabled
- [ ] Custom domain configured (optional)
- [ ] Rate limiting configured
- [ ] Scheduled cleanup job enabled
- [ ] Error monitoring setup (Sentry, etc.)

## Support

For issues or questions, please check the documentation or create an issue.
