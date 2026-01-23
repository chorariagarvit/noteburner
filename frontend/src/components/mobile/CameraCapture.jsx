import React, { useRef, useState } from 'react';
import { Camera, Video, X, Check, RotateCw } from 'lucide-react';

/**
 * CameraCapture Component - Native camera integration for mobile
 * 
 * Features:
 * - Photo and video capture
 * - Front/rear camera switching
 * - Live preview
 * - Instant encryption option
 * - File compression
 */
const CameraCapture = ({ onCapture, onClose, mode = 'photo' }) => {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isRecording, setIsRecording] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' or 'environment'
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: mode === 'video'
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
      console.error('Camera error:', err);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  // Take photo
  const takePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0);
    
    canvas.toBlob((blob) => {
      setPreview(URL.createObjectURL(blob));
      if (onCapture) {
        onCapture(blob, 'photo');
      }
    }, 'image/jpeg', 0.9);
  };

  // Start video recording
  const startRecording = () => {
    if (!streamRef.current) return;
    
    const chunks = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setPreview(URL.createObjectURL(blob));
      if (onCapture) {
        onCapture(blob, 'video');
      }
    };
    
    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  // Stop video recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Switch camera
  const switchCamera = async () => {
    stopCamera();
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    await startCamera();
  };

  // Confirm capture
  const confirmCapture = () => {
    stopCamera();
    onClose();
  };

  // Retake
  const retake = () => {
    setPreview(null);
    startCamera();
  };

  // Initialize camera on mount
  React.useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {error ? (
        <div className="flex flex-col items-center justify-center h-full px-6 text-center">
          <Camera className="w-16 h-16 text-red-500 mb-4" />
          <p className="text-white text-lg mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold"
          >
            Close
          </button>
        </div>
      ) : preview ? (
        // Preview mode
        <div className="relative w-full h-full flex flex-col">
          {mode === 'photo' ? (
            <img src={preview} alt="Preview" className="w-full h-full object-contain" />
          ) : (
            <video src={preview} controls className="w-full h-full object-contain" />
          )}
          
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
            <button
              onClick={retake}
              className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center"
              aria-label="Retake"
            >
              <RotateCw className="w-6 h-6 text-white" />
            </button>
            
            <button
              onClick={confirmCapture}
              className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center"
              aria-label="Confirm"
            >
              <Check className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      ) : (
        // Camera mode
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Top controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={switchCamera}
              className="w-12 h-12 bg-black/40 backdrop-blur rounded-full flex items-center justify-center"
              aria-label="Switch camera"
            >
              <RotateCw className="w-5 h-5 text-white" />
            </button>
            
            <button
              onClick={onClose}
              className="w-12 h-12 bg-black/40 backdrop-blur rounded-full flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          
          {/* Bottom controls */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-4">
            {mode === 'photo' ? (
              <button
                onClick={takePhoto}
                className="w-20 h-20 bg-white rounded-full border-4 border-slate-300 shadow-lg active:scale-95 transition-transform"
                aria-label="Take photo"
              >
                <div className="w-full h-full rounded-full bg-white" />
              </button>
            ) : (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 ${isRecording ? 'bg-red-600' : 'bg-white'} rounded-full border-4 border-slate-300 shadow-lg active:scale-95 transition-all flex items-center justify-center`}
                aria-label={isRecording ? 'Stop recording' : 'Start recording'}
              >
                {isRecording && (
                  <div className="w-8 h-8 bg-white rounded-sm" />
                )}
              </button>
            )}
          </div>
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-2 rounded-full">
              <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
              <span className="text-white text-sm font-semibold">REC</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * useCamera Hook - Camera access utilities
 */
export const useCamera = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [devices, setDevices] = useState([]);

  const checkPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'camera' });
      setHasPermission(result.state === 'granted');
      
      result.addEventListener('change', () => {
        setHasPermission(result.state === 'granted');
      });
    } catch (error) {
      console.error('Permission check failed:', error);
    }
  };

  const getDevices = async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList.filter(device => device.kind === 'videoinput');
      setDevices(cameras);
      return cameras;
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      return [];
    }
  };

  const requestPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setHasPermission(true);
      return true;
    } catch (error) {
      setHasPermission(false);
      return false;
    }
  };

  React.useEffect(() => {
    checkPermission();
    getDevices();
  }, []);

  return {
    hasPermission,
    devices,
    requestPermission,
    refreshDevices: getDevices
  };
};

export default CameraCapture;
