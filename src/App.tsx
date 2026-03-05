import { BrowserRouter, Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Camera, Play, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import cardsData from "./cards.json";
import { Html5Qrcode } from "html5-qrcode";

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
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Initializing...");
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualId, setManualId] = useState("");
  const [detectedId, setDetectedId] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const cameraId = "reader";

  useEffect(() => {
    const startScanner = async () => {
      try {
        setStatus("Accessing camera...");
        const html5QrCode = new Html5Qrcode(cameraId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 25, // Daha hızlı tarama için FPS artırıldı
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // Ekranın %70'ini kaplayan dinamik tarama alanı
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const size = Math.floor(minEdge * 0.7);
            return { width: size, height: size };
          },
          aspectRatio: 1.0,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        };

        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            const data = decodedText.trim();
            const currentHost = window.location.hostname;
            console.log("Scanned Data:", data);
            
            let targetUrl = "";

            // 1. Durum: Veri bir URL mi?
            try {
              // Protokol yoksa ekle (URL objesi için)
              const urlStr = data.includes("://") ? data : `https://${data}`;
              const url = new URL(urlStr);

              // Bizim sitemiz mi? (Domain kontrolü)
              const isOurDomain = url.hostname.includes(currentHost) || 
                                 url.hostname.includes("vercel.app") ||
                                 url.hostname.includes("localhost") ||
                                 url.hostname.includes("run.app"); // AI Studio desteği

              if (isOurDomain) {
                targetUrl = url.pathname + url.search;
              } else {
                // Eğer bizim domain değilse ama içinde "c/" veya "play/" geçiyorsa yine de kabul et (Esneklik)
                if (url.pathname.includes("/c/") || url.pathname.includes("/play/")) {
                  targetUrl = url.pathname + url.search;
                } else {
                  setStatus("External QR ignored");
                  return;
                }
              }
            } catch (e) {
              // 2. Durum: URL değilse, sadece sayı mı? (Kart ID'si)
              if (/^\d+$/.test(data)) {
                targetUrl = `/play/${data}`;
              } else {
                // Metin içinde sayı varsa onu almayı dene (Son çare)
                const match = data.match(/\d+/);
                if (match) {
                  targetUrl = `/play/${match[0]}`;
                } else {
                  setStatus("Not a valid game QR");
                  return;
                }
              }
            }

            if (targetUrl) {
              setDetectedId(data.match(/\d+/)?.[0] || "QR");
              setStatus("Valid QR Found!");
              
              // Kamerayı durdur ve yönlendir
              html5QrCode.stop().finally(() => {
                window.location.href = targetUrl;
              });
            }
          },
          () => {}
        );
        setStatus("Scanning...");
      } catch (err) {
        console.error("Scanner error:", err);
        setError("Camera access denied. Please use HTTPS.");
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Cleanup error", err));
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col relative overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
        <button 
          onClick={() => navigate("/")}
          className="p-3 bg-zinc-900/50 backdrop-blur-xl rounded-full border border-white/10 active:scale-90 transition-transform"
        >
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="px-4 py-1.5 bg-zinc-900/50 backdrop-blur-xl rounded-full border border-white/10">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{status}</p>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Scanner Window */}
        <div className="relative w-full max-w-sm aspect-square rounded-[2.5rem] overflow-hidden bg-zinc-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/5">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center space-y-6">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
              <p className="text-sm text-zinc-500">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-white text-black rounded-2xl font-bold"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              <div id={cameraId} className="w-full h-full" />
              
              {/* Detected Overlay */}
              <AnimatePresence>
                {detectedId && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-30 bg-emerald-500 flex flex-col items-center justify-center p-6 text-center"
                  >
                    <motion.div
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      className="space-y-6"
                    >
                      <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                        <Play className="h-12 w-12 text-emerald-500 fill-emerald-500 ml-1" />
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-4xl font-black italic uppercase tracking-tighter text-white">CARD {detectedId}</h2>
                        <p className="text-emerald-100 font-bold uppercase tracking-widest text-xs">Redirecting to video...</p>
                      </div>
                      <button 
                        onClick={() => window.location.href = `/play/${detectedId}`}
                        className="px-8 py-4 bg-black text-white rounded-full font-black uppercase text-sm tracking-widest"
                      >
                        Click if not redirected
                      </button>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* UI Overlay (Visual only) */}
              {!detectedId && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="relative w-64 h-64">
                    <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 border-white rounded-tl-3xl" />
                    <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 border-white rounded-tr-3xl" />
                    <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 border-white rounded-bl-3xl" />
                    <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 border-white rounded-br-3xl" />
                    
                    <motion.div 
                      animate={{ top: ["5%", "95%", "5%"] }}
                      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_15px_rgba(255,255,255,1)]"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className="mt-12 text-center space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black italic tracking-tighter uppercase">Scan QR Code</h2>
            <p className="text-zinc-500 text-sm">Hold your card steady in front of the camera</p>
          </div>
          
          <button 
            onClick={() => setShowManualEntry(true)}
            className="inline-flex items-center px-6 py-3 bg-zinc-900 rounded-full border border-white/5 text-zinc-400 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors"
          >
            <Play className="h-3 w-3 mr-2 fill-zinc-400" />
            Manual Entry Fallback
          </button>
        </div>
      </div>

      {/* Manual Entry Modal */}
      <AnimatePresence>
        {showManualEntry && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-[3rem] p-10 space-y-8 shadow-2xl"
            >
              <div className="space-y-2 text-center">
                <h3 className="text-2xl font-black italic uppercase tracking-tighter">Manual Entry</h3>
                <p className="text-sm text-zinc-500">Enter the ID number from your card</p>
              </div>
              
              <input 
                type="text" 
                inputMode="numeric"
                value={manualId}
                onChange={(e) => setManualId(e.target.value.replace(/\D/g, ""))}
                placeholder="00"
                className="w-full bg-black border border-white/10 rounded-3xl py-6 px-6 text-center text-4xl font-black focus:outline-none focus:border-white/30 transition-colors placeholder:text-zinc-800"
                autoFocus
              />
              
              <div className="flex flex-col space-y-4">
                <button 
                  onClick={() => {
                    if (manualId) {
                      window.location.href = `/play/${manualId}`;
                    }
                  }}
                  disabled={!manualId}
                  className="w-full py-5 bg-white text-black rounded-3xl font-black text-lg uppercase tracking-tight disabled:opacity-20 active:scale-95 transition-transform"
                >
                  CONFIRM ID
                </button>
                <button 
                  onClick={() => {
                    setShowManualEntry(false);
                    setManualId("");
                  }}
                  className="w-full py-4 text-zinc-500 font-bold uppercase text-xs tracking-widest"
                >
                  Back to Scanner
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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
