"use client";
import { Camera, X, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import Tesseract from "tesseract.js";

interface CameraOCRButtonProps {
  onTextDetected: (text: string) => void;
}

export default function CameraOCRButton({
  onTextDetected,
}: CameraOCRButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [detectedText, setDetectedText] = useState("");
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Iniciar cámara
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Cámara trasera en móviles
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);
      alert("No se pudo acceder a la cámara. Verifica los permisos.");
    }
  };

  // Detener cámara
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  // Capturar y procesar imagen
  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setProcessing(true);
    const canvas = canvasRef.current;
    const video = videoRef.current;

    // Configurar canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      ctx.drawImage(video, 0, 0);

      // Convertir a imagen
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          // Procesar con Tesseract
          const result = await Tesseract.recognize(blob, "eng", {
            logger: (m) => console.log(m),
          });

          const text = result.data.text.trim();
          setDetectedText(text);
          setProcessing(false);
        } catch (error) {
          console.error("Error en OCR:", error);
          alert("Error al procesar la imagen");
          setProcessing(false);
        }
      });
    }
  };

  // Confirmar texto detectado
  const confirmText = () => {
    onTextDetected(detectedText);
    handleClose();
  };

  // Abrir modal
  const handleOpen = () => {
    setIsOpen(true);
    setDetectedText("");
    startCamera();
  };

  // Cerrar modal
  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setDetectedText("");
    setProcessing(false);
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <>
      {/* Botón para abrir cámara */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
      >
        <Camera className="w-5 h-5" />
        Escanear Código
      </button>

      {/* Modal de cámara */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] p-4">
          <div className="bg-neutral-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
              <h3 className="text-xl font-bold text-white">Escanear Código</h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 space-y-4">
              {/* Vista de cámara */}
              <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Overlay de procesamiento */}
                {processing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-2" />
                      <p className="text-white">Procesando imagen...</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Texto detectado */}
              {detectedText && (
                <div className="bg-neutral-800 rounded-lg p-4 border border-green-500/30">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Texto detectado:
                  </label>
                  <input
                    type="text"
                    value={detectedText}
                    onChange={(e) => setDetectedText(e.target.value)}
                    className="w-full bg-neutral-700 border border-neutral-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-sm text-gray-400 mt-2">
                    Puedes editar el texto antes de confirmar
                  </p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex gap-3">
                {!detectedText ? (
                  <button
                    type="button"
                    onClick={captureAndProcess}
                    disabled={processing}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    {processing ? "Procesando..." : "Capturar"}
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setDetectedText("")}
                      className="flex-1 bg-neutral-700 hover:bg-neutral-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                      Reintentar
                    </button>
                    <button
                      type="button"
                      onClick={confirmText}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-5 h-5" />
                      Confirmar
                    </button>
                  </>
                )}
              </div>

              {/* Instrucciones */}
              <div className="bg-neutral-800/50 rounded-lg p-3 border border-neutral-700">
                <p className="text-sm text-gray-400">
                  💡 <strong>Consejos:</strong> Asegúrate de tener buena
                  iluminación y que el código esté enfocado y legible en la
                  cámara.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
