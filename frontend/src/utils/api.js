const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

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
    const error = await response.json();
    throw new Error(error.error || 'Failed to create message');
  }

  return response.json();
}

export async function getMessage(token) {
  const response = await fetch(`${API_URL}/api/messages/${token}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to retrieve message');
  }

  return response.json();
}

export async function deleteMessage(token) {
  const response = await fetch(`${API_URL}/api/messages/${token}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete message');
  }

  return response.json();
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
    const error = await response.json();
    throw new Error(error.error || 'Failed to create group message');
  }

  return response.json();
}

export async function checkSlugAvailability(slug) {
  const response = await fetch(`${API_URL}/api/messages/check-slug/${encodeURIComponent(slug)}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to check slug availability');
  }

  return response.json();
}

export async function confirmMediaDownload(fileId) {
  const response = await fetch(`${API_URL}/api/media/${fileId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to confirm download');
  }

  return response.json();
}

export async function uploadMedia(fileData, fileName, fileType, iv, salt, token) {
  const response = await fetch(`${API_URL}/api/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload media');
  }

  return response.json();
}

export async function getMedia(fileId) {
  const response = await fetch(`${API_URL}/api/media/${fileId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to retrieve media');
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
  return response.json();
}

export async function getMediaStream(fileId) {
  const response = await fetch(`${API_URL}/api/media/${fileId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to retrieve media');
  }

  return response;
}
