import { API_BASE } from './apiBase';
const API_URL = API_BASE;

// Parse a JSON error body safely: if the server returned HTML (e.g. SPA
// fallback or a gateway error page) avoid "Unexpected token '<'" crashes.
async function readError(response, fallback) {
  try {
    const body = await response.json();
    return body.error || fallback;
  } catch {
    return `${fallback} (HTTP ${response.status})`;
  }
}

async function readJson(response) {
  const type = response.headers.get('content-type') || '';
  if (!type.includes('application/json')) {
    throw new Error(`Unexpected server response (HTTP ${response.status}). Please try again.`);
  }
  return response.json();
}

export async function createMessage(encryptedData, iv, salt, expiresIn = null, customSlug = null, securityOptions = {}) {
  const response = await fetch(`${API_URL}/api/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      encryptedData,
      iv,
      salt,
      expiresIn,
      customSlug,
      ...securityOptions, // maxViews, maxPasswordAttempts, requireGeoMatch, etc.
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to create message'));
  }

  return readJson(response);
}

// Public metadata (salt, expiry, protections). Never returns ciphertext.
export async function getMessageMeta(token) {
  const response = await fetch(`${API_URL}/api/messages/${token}/meta`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to retrieve message'));
  }

  return readJson(response);
}

function protectionHeaders({ totpProof, authTag } = {}) {
  const headers = {};
  if (totpProof) headers['X-TOTP-Proof'] = totpProof;
  if (authTag) headers['X-Auth-Tag'] = authTag;
  return headers;
}

// Releases ciphertext only for a correct password proof (authTag) and, if enabled, TOTP proof.
export async function getMessage(token, protection = {}) {
  const response = await fetch(`${API_URL}/api/messages/${token}`, {
    headers: protectionHeaders(protection),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to retrieve message'));
  }

  return readJson(response);
}

export async function deleteMessage(token, protection = {}) {
  const response = await fetch(`${API_URL}/api/messages/${token}`, {
    method: 'DELETE',
    headers: protectionHeaders(protection),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to delete message'));
  }

  return readJson(response);
}

export async function createGroupMessage(encryptedData, iv, salt, expiresIn = null, recipientCount = 1, maxViews = null, burnOnFirstView = false) {
  const response = await fetch(`${API_URL}/api/messages/group`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      encryptedData,
      iv,
      salt,
      expiresIn,
      recipientCount,
      maxViews,
      burnOnFirstView,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to create group message'));
  }

  return readJson(response);
}

export async function checkSlugAvailability(slug) {
  const response = await fetch(`${API_URL}/api/messages/check-slug/${encodeURIComponent(slug)}`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to check slug availability'));
  }

  return readJson(response);
}

export async function confirmMediaDownload(fileId) {
  const response = await fetch(`${API_URL}/api/media/${fileId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to confirm download'));
  }

  return readJson(response);
}

export async function uploadMedia(fileData, fileName, fileType, iv, salt, token, creatorToken) {
  const response = await fetch(`${API_URL}/api/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(creatorToken ? { 'X-Creator-Token': creatorToken } : {}),
    },
    body: JSON.stringify({
      fileData,
      fileName,
      fileType,
      iv,
      salt,
      token,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to upload media'));
  }

  return readJson(response);
}

export async function getMedia(fileId) {
  const response = await fetch(`${API_URL}/api/media/${fileId}`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to retrieve media'));
  }

  const contentType = response.headers.get('Content-Type');
  
  // Large files are streamed as binary with metadata in headers
  if (contentType !== 'application/json') {
    const iv = response.headers.get('X-File-IV');
    const salt = response.headers.get('X-File-Salt');
    const encodedFileName = response.headers.get('X-File-Name');
    const fileName = encodedFileName ? decodeURIComponent(encodedFileName) : 'encrypted-file';
    const blob = await response.blob();
    
    return {
      fileData: blob, // Return blob for streaming files
      iv,
      salt,
      fileName,
      fileType: 'application/octet-stream',
      isStream: true
    };
  }

  // Small files return JSON with base64 data
  return readJson(response);
}

export async function getMediaStream(fileId) {
  const response = await fetch(`${API_URL}/api/media/${fileId}`);

  if (!response.ok) {
    throw new Error(await readError(response, 'Failed to retrieve media'));
  }

  return response;
}
