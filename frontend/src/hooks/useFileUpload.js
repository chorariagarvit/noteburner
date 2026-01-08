import { useState } from 'react';

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024; // 2GB

/**
 * Custom hook for handling file uploads
 * @returns {Object} - Files state and handlers
 */
export function useFileUpload() {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  const handleFileUpload = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(f => f.size <= MAX_FILE_SIZE);
    
    if (validFiles.length !== selectedFiles.length) {
      setError('Some files exceeded 2GB limit and were skipped');
    } else {
      setError('');
    }
    
    setFiles([...files, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setError('');
  };

  const getTotalSize = () => {
    return files.reduce((sum, f) => sum + f.size, 0);
  };

  return {
    files,
    fileError: error,
    handleFileUpload,
    removeFile,
    clearFiles,
    setFiles,
    getTotalSize
  };
}
