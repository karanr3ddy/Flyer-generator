import { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Download, Loader2, Sparkles, AlertCircle, Save, Trash2, X, Image as ImageIcon, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from "jspdf";

interface SavedFlyer {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: number;
}

export default function FlyerGenerator() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedFlyers, setSavedFlyers] = useState<SavedFlyer[]>([]);
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('savedFlyers');
    if (saved) {
      try {
        setSavedFlyers(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse saved flyers", e);
      }
    }
  }, []);

  const saveFlyer = () => {
    if (!imageUrl || !prompt) return;
    
    const newFlyer: SavedFlyer = {
      id: crypto.randomUUID(),
      prompt,
      imageUrl,
      createdAt: Date.now(),
    };

    const updated = [newFlyer, ...savedFlyers];
    setSavedFlyers(updated);
    localStorage.setItem('savedFlyers', JSON.stringify(updated));
    alert("Flyer saved to gallery!");
  };

  const deleteFlyer = (id: string) => {
    const updated = savedFlyers.filter(f => f.id !== id);
    setSavedFlyers(updated);
    localStorage.setItem('savedFlyers', JSON.stringify(updated));
  };

  const loadFlyer = (flyer: SavedFlyer) => {
    setPrompt(flyer.prompt);
    setImageUrl(flyer.imageUrl);
    setShowGallery(false);
  };

  const generateFlyer = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Enhance the prompt to ensure a flyer-like output
      const enhancedPrompt = `A professional, high-quality flyer design for: ${prompt}. The image should be vertical, suitable for printing, with clear visual hierarchy and eye-catching graphics.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              text: enhancedPrompt,
            },
          ],
        },
        config: {
            imageConfig: {
                aspectRatio: "3:4", // Vertical flyer format
            }
        }
      });

      let foundImage = false;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const newImageUrl = `data:image/png;base64,${base64EncodeString}`;
            setImageUrl(newImageUrl);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("No image generated. Please try a different prompt.");
      }

    } catch (err: any) {
      console.error("Error generating flyer:", err);
      setError(err.message || "Failed to generate flyer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPNG = (url: string) => {
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = `flyer-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = (url: string) => {
    if (!url) return;
    try {
        const pdf = new jsPDF({
            orientation: "portrait",
            unit: "px",
            format: [595, 842] // A4 size in px (approx)
        });

        const imgProps = pdf.getImageProperties(url);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

        pdf.addImage(url, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`flyer-${Date.now()}.pdf`);
    } catch (e) {
        console.error("Error generating PDF:", e);
        alert("Failed to generate PDF. Please try downloading as PNG instead.");
    }
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-[#00FF00] selection:text-black">
      {/* Header */}
      <header className="border-b-4 border-black p-6 flex justify-between items-center bg-white sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#00FF00] border-2 border-black"></div>
          <h1 className="text-4xl font-display uppercase tracking-tighter leading-none">
            FlyerGen<span className="text-[#00FF00]">.AI</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <button 
                onClick={() => setShowGallery(true)}
                className="font-mono text-xs uppercase hover:bg-black hover:text-white px-3 py-1 border border-black transition-colors flex items-center gap-2"
            >
                <ImageIcon className="w-4 h-4" />
                Gallery ({savedFlyers.length})
            </button>
            <div className="font-mono text-xs hidden sm:block">
            V1.0 // SYSTEM_READY
            </div>
        </div>
      </header>

      <main className="grid lg:grid-cols-2 min-h-[calc(100vh-88px)]">
        {/* Left Panel: Controls */}
        <div className="border-r-0 lg:border-r-4 border-black p-8 flex flex-col justify-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-gray-100 rounded-full blur-3xl -z-10"></div>
            
            <div className="max-w-xl mx-auto w-full space-y-8">
                <div>
                    <h2 className="text-6xl font-display uppercase leading-[0.8] mb-6">
                        Design <br/>
                        <span className="text-transparent stroke-text">Instantly</span>
                    </h2>
                    <p className="font-mono text-sm text-gray-600 border-l-2 border-[#00FF00] pl-4">
                        ENTER YOUR PROMPT BELOW. OUR AI WILL GENERATE A PROFESSIONAL FLYER DESIGN IN SECONDS.
                    </p>
                </div>

                <div className="space-y-4">
                    <label className="block font-bold uppercase text-sm tracking-wider">Prompt Input</label>
                    <textarea 
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="DESCRIBE YOUR FLYER (E.G., 'LOST DOG', 'GARAGE SALE SATURDAY', 'TECH CONFERENCE 2025')"
                        className="w-full h-48 p-6 bg-gray-50 border-2 border-black focus:border-[#00FF00] focus:ring-0 focus:outline-none font-mono text-lg resize-none transition-colors placeholder:text-gray-400"
                    />
                </div>

                <button 
                    onClick={generateFlyer}
                    disabled={loading || !prompt.trim()}
                    className="group relative w-full h-16 bg-black text-white font-display text-2xl uppercase tracking-wider overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#00FF00] hover:text-black transition-colors border-2 border-black"
                >
                    <span className="relative z-10 flex items-center justify-center gap-3">
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin w-6 h-6" />
                                Generating...
                            </>
                        ) : (
                            <>
                                Generate Flyer
                                <Sparkles className="w-6 h-6" />
                            </>
                        )}
                    </span>
                </button>

                {error && (
                    <div className="p-4 bg-red-50 border-2 border-red-500 flex items-start gap-3 text-red-600 font-mono text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                        <p>{error}</p>
                    </div>
                )}
            </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="bg-[#f0f0f0] p-8 flex items-center justify-center relative border-t-4 lg:border-t-0 border-black overflow-y-auto">
            {/* Grid pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
            </div>

            <div className="relative w-full max-w-md flex flex-col items-center">
                <div className="relative w-full aspect-[3/4] mb-8">
                    {imageUrl ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative group h-full w-full"
                        >
                            <img 
                                src={imageUrl} 
                                alt="Generated Flyer" 
                                className="w-full h-full object-cover border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] bg-white"
                            />
                        </motion.div>
                    ) : (
                        <div className="w-full h-full border-4 border-black border-dashed flex flex-col items-center justify-center text-gray-400 bg-white/50">
                            <div className="w-20 h-20 border-2 border-gray-300 rounded-full flex items-center justify-center mb-4">
                                <Sparkles className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="font-mono text-sm uppercase tracking-widest">Preview Area</p>
                            <p className="text-xs text-gray-400 mt-2">Waiting for input...</p>
                        </div>
                    )}
                </div>

                {imageUrl && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-wrap justify-center gap-4 w-full"
                    >
                            <button 
                            onClick={() => handleDownloadPNG(imageUrl)}
                            className="bg-[#00FF00] text-black border-2 border-black px-6 py-3 font-bold uppercase flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            <Download className="w-5 h-5" />
                            PNG
                        </button>
                            <button 
                            onClick={() => handleDownloadPDF(imageUrl)}
                            className="bg-[#00FF00] text-black border-2 border-black px-6 py-3 font-bold uppercase flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            <FileText className="w-5 h-5" />
                            PDF
                        </button>
                            <button 
                            onClick={saveFlyer}
                            className="bg-white text-black border-2 border-black px-6 py-3 font-bold uppercase flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-1 hover:shadow-none transition-all"
                        >
                            <Save className="w-5 h-5" />
                            Save
                        </button>
                    </motion.div>
                )}
            </div>
        </div>
      </main>

      {/* Gallery Modal */}
      <AnimatePresence>
        {showGallery && (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            >
                <div className="bg-white w-full max-w-6xl h-[90vh] border-4 border-black flex flex-col shadow-[12px_12px_0px_0px_rgba(0,255,0,1)]">
                    <div className="p-6 border-b-4 border-black flex justify-between items-center bg-white">
                        <h2 className="text-3xl font-display uppercase">Saved Flyers</h2>
                        <button onClick={() => setShowGallery(false)} className="p-2 hover:bg-gray-100 rounded-full">
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-8 bg-[#f0f0f0]">
                        {savedFlyers.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                                <p className="font-mono text-lg uppercase">No saved flyers yet</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                                {savedFlyers.map((flyer) => (
                                    <div key={flyer.id} className="group bg-white border-2 border-black p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,255,0,1)] transition-all">
                                        <div className="aspect-[3/4] overflow-hidden border border-black mb-3 relative">
                                            <img src={flyer.imageUrl} alt={flyer.prompt} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button 
                                                    onClick={() => loadFlyer(flyer)}
                                                    className="bg-white p-2 border-2 border-black hover:bg-[#00FF00]"
                                                    title="Load Prompt"
                                                >
                                                    <Sparkles className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownloadPNG(flyer.imageUrl)}
                                                    className="bg-white p-2 border-2 border-black hover:bg-[#00FF00]"
                                                    title="Download PNG"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleDownloadPDF(flyer.imageUrl)}
                                                    className="bg-white p-2 border-2 border-black hover:bg-[#00FF00]"
                                                    title="Download PDF"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => deleteFlyer(flyer.id)}
                                                    className="bg-white p-2 border-2 border-black hover:bg-red-500 hover:text-white"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="font-mono text-xs truncate px-1 text-gray-600">{flyer.prompt}</p>
                                        <p className="font-mono text-[10px] text-gray-400 px-1 mt-1">
                                            {new Date(flyer.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        )}
      </AnimatePresence>
      
      <style>{`
        .stroke-text {
            -webkit-text-stroke: 2px black;
        }
      `}</style>
    </div>
  );
}
