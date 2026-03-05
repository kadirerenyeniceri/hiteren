import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Camera, Play, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import jsQR from "jsqr";
import { motion, AnimatePresence } from "motion/react";
import cardsData from "./cards.json";

// --- Components ---

function Home() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl italic">CARD GAME</h1>
          <p className="text-zinc-400 text-sm uppercase tracking-widest">Companion App</p>
        </div>
        
        <button
          onClick={() => navigate("/scan")}
          className="group relative inline-flex items-center justify-center px-12 py-6 font-bold text-white transition-all duration-200 bg-zinc-900 border-2 border-white rounded-full hover:bg-white hover:text-black focus:outline-none"
        >
          <Play className="mr-2 h-6 w-6 fill-current" />
          <span className="text-xl">START PLAYING</span>
        </button>
      </motion.div>
    </div>
  );
}

function Scan() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") {
          setError("Camera access requires an HTTPS connection. Please ensure you are using a secure URL.");
        } else {
          setError("Could not access camera. Please ensure you have granted permission in your browser settings.");
        }
      }
    };

    const scan = () => {
      if (!isScanning) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          canvas.height = video.videoHeight;
          canvas.width = video.videoWidth;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code) {
            console.log("Scanned:", code.data);
            
            // Try to find an ID in the scanned string
            // 1. Check if it's a simple number
            if (/^\d+$/.test(code.data.trim())) {
              setIsScanning(false);
              navigate(`/play/${code.data.trim()}`);
              return;
            }

            // 2. Check if it's a URL and extract ID from path
            try {
              const url = new URL(code.data);
              // Matches /c/123 or /play/123 or /card/123
              const match = url.pathname.match(/\/(?:c|play|card)\/([^/]+)/);
              if (match) {
                setIsScanning(false);
                navigate(`/play/${match[1]}`);
                return;
              }
              
              // 3. Fallback: if it's a URL but doesn't match our pattern, 
              // check if the ID is in the query string or just at the end
              const segments = url.pathname.split("/").filter(Boolean);
              const lastSegment = segments[segments.length - 1];
              if (lastSegment && /^\d+$/.test(lastSegment)) {
                setIsScanning(false);
                navigate(`/play/${lastSegment}`);
                return;
              }
            } catch (e) {
              // Not a valid URL, maybe it contains the ID somewhere else?
              const match = code.data.match(/\d+/);
              if (match) {
                setIsScanning(false);
                navigate(`/play/${match[0]}`);
                return;
              }
            }

            // If we're here, we couldn't find a valid ID
            console.warn("Could not find a valid ID in:", code.data);
          }
        }
      }
      animationFrameId = requestAnimationFrame(scan);
    };

    startCamera().then(() => {
      animationFrameId = requestAnimationFrame(scan);
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [navigate, isScanning]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      <div className="absolute top-6 left-6 z-10">
        <button 
          onClick={() => navigate("/")}
          className="p-3 bg-zinc-900/80 backdrop-blur-md rounded-full border border-white/10"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="relative w-full max-w-sm aspect-square border-2 border-white/20 rounded-3xl overflow-hidden bg-zinc-900">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <p className="text-sm text-zinc-400">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-white text-black rounded-full text-sm font-bold"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="absolute inset-0 w-full h-full object-cover"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              {/* Scanner Overlay */}
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 border-[40px] border-black/40" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                  <motion.div 
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                  />
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-12 text-center space-y-2">
          <p className="text-xl font-medium">Scan Card QR Code</p>
          <p className="text-sm text-zinc-500">Position the QR code within the frame</p>
        </div>
      </div>
    </div>
  );
}

function PlayPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [youtubeId, setYoutubeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const loadCard = () => {
      setLoading(true);
      const yid = (cardsData as Record<string, string>)[id || ""];
      if (yid) {
        setYoutubeId(yid);
        setError(null);
      } else {
        setError("Card not found in database");
      }
      setLoading(false);
    };
    loadCard();
  }, [id]);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center space-y-4"
            >
              <RefreshCw className="h-8 w-8 animate-spin text-zinc-500" />
              <p className="text-sm text-zinc-500 uppercase tracking-widest">Loading Content...</p>
            </motion.div>
          ) : error ? (
            <motion.div 
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center space-y-6 p-6"
            >
              <div className="bg-red-500/10 p-6 rounded-3xl border border-red-500/20">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold mb-2">Oops!</h2>
                <p className="text-zinc-400 text-sm">{error}</p>
              </div>
              <button 
                onClick={() => navigate("/scan")}
                className="px-8 py-3 bg-white text-black rounded-full font-bold"
              >
                Try Another Card
              </button>
            </motion.div>
          ) : !hasInteracted ? (
            <motion.div 
              key="interact"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center space-y-8 p-8"
            >
              <div className="w-32 h-32 bg-white/10 rounded-full flex items-center justify-center mx-auto border-2 border-white/20">
                <Play className="h-12 w-12 fill-white" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold italic uppercase tracking-tighter">Card Detected!</h2>
                <p className="text-zinc-400 text-sm">Tap the button below to start with sound</p>
              </div>
              <button 
                onClick={() => setHasInteracted(true)}
                className="w-full max-w-xs py-6 bg-white text-black rounded-full font-black text-xl uppercase tracking-tight shadow-[0_0_30px_rgba(255,255,255,0.3)]"
              >
                PLAY NOW
              </button>
            </motion.div>
          ) : (
            <motion.div 
              key="player"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full h-full flex flex-col"
            >
              <div className="flex-1 relative bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&playsinline=1`}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              
              <div className="p-8 bg-zinc-950 border-t border-white/5">
                <button
                  onClick={() => navigate("/scan")}
                  className="w-full py-5 bg-white text-black rounded-2xl font-black text-lg uppercase tracking-tight flex items-center justify-center group active:scale-95 transition-transform"
                >
                  <Camera className="mr-3 h-6 w-6" />
                  Scan Next Card
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/play/:id" element={<PlayPage />} />
        {/* Redirect /c/:id to /play/:id handled by server, but good to have a fallback here */}
        <Route path="/c/:id" element={<PlayPage />} />
      </Routes>
    </BrowserRouter>
  );
}
