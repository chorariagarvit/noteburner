const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

export async function createMessage(encryptedData, iv, salt, expiresIn = null) {
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

  return response.json();
}
