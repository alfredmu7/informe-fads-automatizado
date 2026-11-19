import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const photoUrlRef = useRef(null);
  const [imgData, setImgData] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
  }, []);

  const startCamera = async () => {
    setCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setCameraActive(false);
      }
    } catch (err) {
      console.error("Error al acceder a la cámara:", err);
      alert("No se pudo acceder a la cámara.");
      setCameraActive(false);
    }
  };

  const takePhoto = () => {
    if (!videoRef.current?.videoWidth || !videoRef.current?.videoHeight || !canvasRef.current) {
      alert('La cámara todavía no está lista. Intente de nuevo.');
      return;
    }

    const width = videoRef.current.videoWidth;
    const height = videoRef.current.videoHeight;
    canvasRef.current.width = width;
    canvasRef.current.height = height;
    const ctx = canvasRef.current.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, width, height);
    
    canvasRef.current.toBlob((blob) => {
      if (!blob) {
        alert('No se pudo capturar la imagen. Intente de nuevo.');
        return;
      }

      const file = new File([blob], `device_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const photoUrl = URL.createObjectURL(blob);
      if (photoUrlRef.current) URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = photoUrl;
      setImgData(photoUrl);
      onCapture(file);
      stopCameraStream();
    }, 'image/jpeg');
  };

  const stopCameraStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  const replacePhoto = () => {
    if (photoUrlRef.current) {
      URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current = null;
    }
    setImgData(null);
    startCamera();
  };

  return (
    <div className="camera-container">
      {!imgData && !cameraActive && (
        <button type="button" onClick={startCamera} className="btn-camera-trigger">
          <Camera size={18} color="#2563eb" />
          <span>Tomar foto del dispositivo</span>
        </button>
      )}

      {cameraActive && (
        <div className="camera-active-box">
          <div className="video-wrapper">
            <video ref={videoRef} autoPlay playsInline className="video-stream" />
          </div>
          <button type="button" onClick={takePhoto} className="btn-capture">
            Capturar Imagen
          </button>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {imgData && (
        <div className="photo-success-card">
          <div className="photo-info-group">
            <img src={imgData} alt="Captura" className="photo-thumbnail" />
            <div className="photo-text-group">
              <span className="photo-title">
                <CheckCircle2 size={15} color="#059669" /> Foto adjunta
              </span>
              <span className="photo-subtitle">Lista para enviar</span>
            </div>
          </div>
          <button
            type="button"
            onClick={replacePhoto}
            className="btn-retake-photo"
          >
            <RefreshCw size={13} /> Cambiar
          </button>
        </div>
      )}
    </div>
  );
}