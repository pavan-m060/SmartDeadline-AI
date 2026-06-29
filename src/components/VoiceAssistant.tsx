import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, Square, Volume2, VolumeX, Send, X, AlertCircle, Bot, Trash2 } from "lucide-react";
import { Assignment, StudySession } from "../types";
import { aiVoiceAssistant } from "../services/api";

interface VoiceAssistantProps {
  assignments: Assignment[];
  studySessions: StudySession[];
  masterStudyPlan: any;
  stats: any;
  onAction?: (action: any) => void;
}

interface VoiceMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

export default function VoiceAssistant({ assignments, studySessions, masterStudyPlan, stats, onAction }: VoiceAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;

        recognitionRef.current.onresult = (event: any) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript(currentTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {

          setIsListening(false);
          if (event.error === 'not-allowed') {
            setError("Microphone access denied. Please enable permissions.");
          } else {
            setError(`Speech recognition error: ${event.error}`);
          }
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setError("Speech recognition is not supported in this browser.");
      }
      
      if ("speechSynthesis" in window) {
        synthesisRef.current = window.speechSynthesis;
      }
    }
    
    return () => {
      if (recognitionRef.current && isListening) {
        recognitionRef.current.stop();
      }
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, transcript]);

  const toggleListening = () => {
    setError(null);
    if (!recognitionRef.current) {
      setError("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {

        setIsListening(false);
      }
    }
  };

  const speakText = (text: string) => {
    if (voiceEnabled && synthesisRef.current) {
      // Cancel any ongoing speech
      synthesisRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      // Optional: Try to find a good voice
      const voices = synthesisRef.current.getVoices();
      const defaultVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Samantha") || v.default);
      if (defaultVoice) {
        utterance.voice = defaultVoice;
      }
      utterance.rate = 1.05; // Slightly faster for natural feel
      synthesisRef.current.speak(utterance);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!transcript.trim() || isLoading) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userText = transcript.trim();
    setTranscript("");
    
    const userMsg: VoiceMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role: "user",
      content: userText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await aiVoiceAssistant(userText, assignments, studySessions, masterStudyPlan, stats);
      
      const aiMsg: VoiceMessage = {
        id: `ai-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        role: "model",
        content: res.reply,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMsg]);
      speakText(res.reply);
      
      if (res.action && res.action.type && res.action.type !== "NONE" && onAction) {
        onAction(res.action);
      }
      
    } catch (err: any) {

      setError(err.message || "Failed to process voice command");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setTranscript("");
    setError(null);
    if (synthesisRef.current) synthesisRef.current.cancel();
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 font-sans" id="floating-voice-assistant">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-16 right-0 w-[380px] h-[500px] max-w-[calc(100vw-3rem)] rounded-xl bg-slate-950 border border-slate-800 shadow-sm border-slate-800 flex flex-col overflow-hidden backdrop-"
          >
            {}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800/50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isListening ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-600/10 text-slate-300'}`}>
                  {isListening ? <Mic className="w-4.5 h-4.5 " /> : <Bot className="w-4.5 h-4.5" />}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    Voice Assistant
                  </h4>
                  <p className="text-xs text-slate-500 font-mono tracking-wider uppercase">
                    {isListening ? "Listening..." : "Ready"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setVoiceEnabled(!voiceEnabled);
                    if (voiceEnabled && synthesisRef.current) synthesisRef.current.cancel();
                  }}
                  title={voiceEnabled ? "Mute Voice Responses" : "Unmute Voice Responses"}
                  className={`p-2 rounded-lg transition ${voiceEnabled ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-800'}`}
                >
                  {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
                <button
                  onClick={clearChat}
                  title="Clear Chat"
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {}
            {error && (
              <div className="bg-rose-500/10 border-b border-rose-500/20 p-2 flex items-start gap-2 shrink-0">
                <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                <p className="text-xs text-rose-300">{error}</p>
              </div>
            )}

            {}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.length === 0 && !transcript && !isLoading && (
                <div className="h-full flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800/50 flex items-center justify-center mb-4">
                    <Mic className="w-8 h-8 text-slate-500" />
                  </div>
                  <p className="text-sm text-slate-400 mb-2">Tap the microphone to speak.</p>
                  <p className="text-xs text-slate-500 max-w-[250px]">
                    "What should I study today?"<br/>
                    "Show my pending tasks"<br/>
                    "Generate motivation"
                  </p>
                </div>
              )}
              
              {messages.map((m) => {
                const isAI = m.role === "model";
                return (
                  <div key={m.id} className={`flex gap-3 ${isAI ? "justify-start" : "justify-end"}`}>
                    {isAI && (
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800/50 shrink-0 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-slate-300" />
                      </div>
                    )}
                    <div className="max-w-[85%] flex flex-col gap-1">
                      <div className={`p-3 rounded-xl text-[13px] leading-relaxed ${
                        isAI 
                          ? "bg-slate-900 border border-slate-800/50 text-slate-200 rounded-tl-none" 
                          : "bg-indigo-600 text-slate-100 rounded-tr-none"
                      }`}>
                        {m.content}
                      </div>
                      <span className={`text-[11px] text-slate-500 px-1 font-mono ${!isAI && "text-right"}`}>
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-800/50 shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-slate-300" />
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800/50 rounded-xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple  [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple  [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-purple " />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {}
            <div className="p-3 bg-slate-900 border-t border-slate-800 shrink-0">
              <form onSubmit={handleSubmit} className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-3 rounded-full flex items-center justify-center transition-all shrink-0 ${
                    isListening 
                      ? 'bg-rose-500 text-slate-100  shadow-sm border-slate-800' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100'
                  }`}
                >
                  {isListening ? <Square className="w-5 h-5" fill="currentColor" /> : <Mic className="w-5 h-5" />}
                </button>
                
                <div className="flex-1 relative">
                  <input
                    type="text"
                    value={transcript}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setTranscript(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Type or speak..."}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-[13px] text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-sans"
                  />
                  {isListening && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                      <div className="w-1 h-3 bg-brand-purple rounded-full animate-[bounce_1s_infinite_0ms]" />
                      <div className="w-1 h-4 bg-brand-purple rounded-full animate-[bounce_1s_infinite_100ms]" />
                      <div className="w-1 h-2 bg-brand-purple rounded-full animate-[bounce_1s_infinite_200ms]" />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!transcript.trim() || isLoading}
                  className="p-2.5 rounded-xl bg-brand-purple hover:bg-brand-purple-dark shadow-sm disabled:opacity-50 disabled:hover:bg-indigo-600 text-slate-100 transition-all active:scale-95 shrink-0"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <div className="relative">
        {}
        {!isOpen && (
          <div className="absolute inset-0 bg-brand-purple rounded-full animate-ping opacity-20" />
        )}
        <motion.button
          onClick={() => setIsOpen(!isOpen)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm border-slate-800 border transition-colors duration-300 relative group ${
            isOpen 
              ? "bg-slate-900 border-slate-800 text-slate-100" 
              : "bg-slate-900 border border-slate-800/50 from-indigo-600 to-purple-600 border-indigo-400/50 text-slate-100"
          }`}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close-icon"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div
                key="mic-icon"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center"
              >
                <Mic className="w-6 h-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}
