import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, X, Send, Bot, Brain, ArrowDown, Trash2 } from "lucide-react";
import { Assignment, StudySession } from "../types";
import { aiChat } from "../services/api";

interface FloatingAssistantProps {
  assignments: Assignment[];
  studySessions: StudySession[];
  onSelectAssignmentForTimer?: (id: string) => void;
  setCurrentTab?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
}

// Custom Markdown-to-JSX parser for safe, styled rendering
function renderMarkdown(text: string) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: "ul" | "ol" | null = null;
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];

  const flushList = (key: string | number) => {
    if (currentList.length > 0) {
      if (listType === "ul") {
        elements.push(
          <ul key={`ul-${key}`} className="list-disc pl-4 my-1.5 space-y-1 text-slate-300 text-xs font-sans">
            {currentList}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${key}`} className="list-decimal pl-4 my-1.5 space-y-1 text-slate-300 text-xs font-sans">
            {currentList}
          </ol>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  const flushTable = (key: string | number) => {
    if (inTable) {
      elements.push(
        <div key={`table-wrapper-${key}`} className="overflow-x-auto my-2.5 rounded-lg border border-slate-800/80">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-slate-900/80 text-slate-400 font-mono font-bold uppercase tracking-wider text-[9px] border-b border-slate-800">
              <tr>
                {tableHeaders.map((h, i) => (
                  <th key={i} className="px-2.5 py-1.5 text-slate-300 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 bg-slate-950/10">
              {tableRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-900/30 transition">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 text-slate-300">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      inTable = false;
      tableHeaders = [];
      tableRows = [];
    }
  };

  const parseInline = (txt: string) => {
    const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
    const tokens = txt.split(regex);
    
    return tokens.map((token, i) => {
      if (token.startsWith("**") && token.endsWith("**")) {
        return <strong key={i} className="font-bold text-white">{token.slice(2, -2)}</strong>;
      }
      if (token.startsWith("`") && token.endsWith("`")) {
        return <code key={i} className="font-mono text-[10px] bg-slate-900 text-indigo-400 px-1 py-0.5 rounded border border-slate-800">{token.slice(1, -1)}</code>;
      }
      if (token.startsWith("*") && token.endsWith("*")) {
        return <em key={i} className="italic text-slate-300">{token.slice(1, -1)}</em>;
      }
      return token;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Check table
    if (line.startsWith("|")) {
      flushList(i);
      const cells = line.split("|").map(cell => cell.trim()).filter((_cell, idx, arr) => idx > 0 && idx < arr.length - 1);
      const isDelimiter = cells.every(c => c.startsWith(":") || c.startsWith("-") || c.endsWith(":"));
      
      if (isDelimiter) {
        continue;
      }
      
      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else {
      flushTable(i);
    }

    // Check headings
    if (line.startsWith("###")) {
      flushList(i);
      elements.push(
        <h4 key={i} className="text-xs font-bold text-white mt-3 mb-1.5 font-display flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-indigo-400" />
          {parseInline(line.substring(3).trim())}
        </h4>
      );
    } else if (line.startsWith("##")) {
      flushList(i);
      elements.push(
        <h3 key={i} className="text-sm font-bold text-white mt-3.5 mb-1.5 font-display flex items-center gap-1.5 shrink-0 border-b border-slate-900 pb-0.5">
          <Brain className="w-3.5 h-3.5 text-indigo-400" />
          {parseInline(line.substring(2).trim())}
        </h3>
      );
    } else if (line.startsWith("#")) {
      flushList(i);
      elements.push(
        <h2 key={i} className="text-base font-black text-white mt-4 mb-2 font-display border-b border-slate-800 pb-0.5">
          {parseInline(line.substring(1).trim())}
        </h2>
      );
    }
    // Check lists
    else if (line.startsWith("-") || line.startsWith("*")) {
      if (listType !== "ul") {
        flushList(i);
        listType = "ul";
      }
      currentList.push(
        <li key={`li-${i}`} className="ml-1 leading-relaxed">
          {parseInline(line.substring(1).trim())}
        </li>
      );
    } else if (/^\d+\./.test(line)) {
      if (listType !== "ol") {
        flushList(i);
        listType = "ol";
      }
      const match = line.match(/^(\d+)\.(.*)/);
      const textPart = match ? match[2].trim() : line;
      currentList.push(
        <li key={`li-${i}`} className="ml-1 leading-relaxed">
          {parseInline(textPart)}
        </li>
      );
    }
    // Empty lines
    else if (line === "") {
      flushList(i);
    }
    // Regular paragraph
    else {
      flushList(i);
      elements.push(
        <p key={i} className="text-xs text-slate-300 leading-relaxed my-1.5 font-sans">
          {parseInline(line)}
        </p>
      );
    }
  }

  flushList("end");
  flushTable("end");

  return <div className="space-y-0.5">{elements}</div>;
}

export default function FloatingAssistant({ 
  assignments, 
  studySessions,
 
 
}: FloatingAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("smartdeadline_chat_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }));
        }
      } catch (err) {

      }
    }
    return [{
      id: "greeting",
      role: "model",
      content: "Hello! I am your **AI Academic Coach** 🧠.\n\n" +
               "I synchronized with your assignments, milestones, and logged study sessions. " +
               "I can help you build study schedules, sort out what's urgent, explain assignments, or help you bypass procrastination blocks.\n\n" +
               "**How can I assist you today?** You can select one of the quick actions below or type any question!",
      timestamp: new Date()
    }];
  });
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Sync messages with local storage
  useEffect(() => {
    localStorage.setItem("smartdeadline_chat_messages", JSON.stringify(messages));
  }, [messages]);

  const handleClearChat = () => {
    const greetingMsg: ChatMessage = {
      id: `greeting-${Date.now()}`,
      role: "model",
      content: "Hello! I am your **AI Academic Coach** 🧠.\n\n" +
               "I synchronized with your assignments, milestones, and logged study sessions. " +
               "I can help you build study schedules, sort out what's urgent, explain assignments, or help you bypass procrastination blocks.\n\n" +
               "**How can I assist you today?** You can select one of the quick actions below or type any question!",
      timestamp: new Date()
    };
    setMessages([greetingMsg]);
  };

  // Handle scroll events to show/hide "Scroll to bottom" helper button
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 120;
    setShowScrollBtn(!isNearBottom);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Map message history cleanly for Gemini payload
      const historyPayload = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await aiChat(textToSend, historyPayload, assignments, studySessions);

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "model",
        content: response.text,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {

      const errMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "model",
        content: "⚠️ **Connection Error:** I encountered an issue synchronizing with the AI engine. " +
                 "However, I can still provide robust offline advice based on your current agenda:\n\n" +
                 "Please try resubmitting your query, or let me know if you would like me to list your urgent tasks!",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickActionClick = (query: string) => {
    handleSendMessage(query);
  };

  const quickActions = [
    { label: "What should I study today? 📚", query: "What should I study today?" },
    { label: "Explain this assignment 📝", query: "Explain this assignment." },
    { label: "Generate tomorrow's study plan 🌅", query: "Generate tomorrow's study plan." },
    { label: "Help me prepare for exams 🚨", query: "Help me prepare for exams." },
    { label: "Which assignment is most important? 🎯", query: "Which assignment is most important?" }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" id="floating-study-assistant">
      <AnimatePresence>
        {}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute bottom-20 right-0 w-[420px] h-[580px] max-w-[calc(100vw-3rem)] rounded-2xl bg-slate-950 border border-slate-800/90 shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl"
          >
            {}
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                  <Brain className="w-4.5 h-4.5 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-display flex items-center gap-1.5">
                    AI Academic Coach
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Ready to assist" />
                  </h4>
                  <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Active Context Sync</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearChat}
                  title="Clear conversation"
                  className="p-1.5 text-slate-500 hover:text-rose-450 hover:bg-slate-800/40 rounded-lg transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {}
            <div 
              ref={scrollContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin relative bg-slate-950/45"
            >
              {messages.map((m) => {
                const isAI = m.role === "model";
                return (
                  <div key={m.id} className={`flex gap-3 ${isAI ? "justify-start" : "justify-end"}`}>
                    {isAI && (
                      <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-850 shrink-0 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-indigo-400" />
                      </div>
                    )}
                    <div className="max-w-[82%] flex flex-col gap-1">
                      <div className={`p-3 rounded-2xl text-xs ${
                        isAI 
                          ? "bg-slate-900/60 border border-slate-850/80 text-slate-300 rounded-tl-none" 
                          : "bg-indigo-600 text-white rounded-tr-none shadow-md"
                      }`}>
                        {renderMarkdown(m.content)}
                      </div>
                      <span className={`text-[9px] text-slate-500 px-1 font-mono ${!isAI && "text-right"}`}>
                        {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}

              {}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-850 shrink-0 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="p-3 bg-slate-900/40 border border-slate-850/50 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-bounce" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {}
            {showScrollBtn && (
              <button 
                onClick={scrollToBottom}
                className="absolute bottom-[110px] right-4 p-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded-full shadow-lg transition"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            )}

            {}
            <div className="px-4 py-2 border-t border-slate-900/80 bg-slate-950 flex gap-2 overflow-x-auto scrollbar-none shrink-0 select-none">
              {quickActions.map((qa, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickActionClick(qa.query)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900/40 hover:bg-slate-900 text-[10px] font-medium text-slate-300 hover:text-indigo-400 transition whitespace-nowrap active:scale-95 shrink-0"
                >
                  {qa.label}
                </button>
              ))}
            </div>

            {}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage(inputValue);
              }}
              className="p-3 bg-slate-900 border-t border-slate-800/80 flex gap-2 shrink-0 items-center"
            >
              <input
                type="text"
                value={inputValue}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
                placeholder="Ask study coach anything..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition font-sans"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 disabled:hover:bg-indigo-600 text-white shadow transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl border transition-all duration-350 relative group ${
          isOpen 
            ? "bg-slate-900 border-slate-800 text-white" 
            : "bg-indigo-600 border-indigo-500 hover:bg-indigo-500 text-white"
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
              key="sparkle-icon"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {}
        {!isOpen && (
          <span className="absolute -top-1.5 -right-1.5 bg-indigo-500 border-2 border-slate-950 text-[9px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow">
            AI
          </span>
        )}
      </motion.button>
    </div>
  );
}
