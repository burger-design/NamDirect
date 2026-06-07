import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, X, MessageSquare, HelpCircle, Store, UserCheck, RotateCcw, Compass, ArrowRight, CornerDownLeft } from 'lucide-react';
import { cn } from '../lib/utils';

// Simple text formatter for custom styling of bold markdown tags (**text**)
function FormatMessageText({ text }: { text: string }) {
  if (!text) return null;
  
  // Split text by lines
  const lines = text.split('\n');
  
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        // If line is a list item
        const isListItem = line.trim().startsWith('- ') || line.trim().startsWith('* ');
        const cleanLine = isListItem ? line.trim().substring(2) : line;
        
        // Match bold markers **text**
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const formattedParts = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-extrabold text-nam-green bg-nam-gold/10 px-1 rounded">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isListItem) {
          return (
            <div key={idx} className="flex gap-2 pl-2">
              <span className="text-nam-gold font-black select-none">•</span>
              <span className="flex-1">{formattedParts}</span>
            </div>
          );
        }

        return <p key={idx}>{formattedParts}</p>;
      })}
    </div>
  );
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: "Hello! Welcome to NamDirect (Tate, Meme, hello!). 🌾✨\n\nI am your professional **AI Support Assistant**. I'm here to comfortably guide you through our local Namibian SME and farmer onboarding process.\n\nWhether you're looking to sign up as a **Vendor**, list fresh **SME produce**, or navigate your customer orders, choose a quick action below or ask me any question!",
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  // Show a pulsing preview notification badge on mount after short delay to grab attention
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isOpen && messages.length === 1) {
        setHasNewMessage(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setHasNewMessage(false);

    try {
      // Map current messages format into standard roles for Gemini
      const conversationHistory = messages.map(m => ({
        role: m.role,
        text: m.text
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: conversationHistory
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Response error');
      }

      const data = await response.json();
      
      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        text: data.text || "I was able to catch your message, but had trouble drafting a response. How else may I assist you with NamDirect?",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      
      const errMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        text: `Apologies, Tate/Meme. I encountered status issue: ${err.message || 'Can not connect'}. Please ensure your GEMINI_API_KEY is configured in Settings > Secrets or try again shortly!`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = (topic: string, promptText: string) => {
    handleSend(promptText);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome-reset',
        role: 'assistant',
        text: "Let's restart! Welcome to NamDirect! What can I guide you with? I can help you with:\n\n- How to sign up as an SME/Farmer\n- Adding new produce to your seller library\n- Shipping and GPS Delivery information\n- Order placements and status definitions",
        timestamp: new Date()
      }
    ]);
  };

  const quickActions = [
    {
      label: "Register as Farmer/SME 🌾",
      prompt: "Can you guide me step-by-step on how to register as a Farmer or SME Vendor on NamDirect?",
      icon: Store,
      color: "bg-nam-green/10 text-nam-green hover:bg-nam-green/20"
    },
    {
      label: "Onboarding as Customer 🛒",
      prompt: "I am a new buyer. How do I sign up, select produce, and track deliveries on the platform?",
      icon: UserCheck,
      color: "bg-nam-gold/10 text-nam-green hover:bg-nam-gold/20"
    },
    {
      label: "How does Delivery work? 📍",
      prompt: "What is the delivery process, GPS logistics, and shipping areas covered by NamDirect?",
      icon: Compass,
      color: "bg-nam-blue/10 text-nam-blue hover:bg-nam-blue/20"
    }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[100] font-sans flex flex-col items-end">
      {/* Floating Action Button */}
      <div className="relative">
        <AnimatePresence>
          {hasNewMessage && !isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute bottom-16 right-0 bg-white border border-gray-100 shadow-2xl p-3 px-4 rounded-2xl w-64 text-sm text-gray-700 font-medium mb-2 pointer-events-none"
            >
              <div className="flex gap-2 items-center text-nam-green font-bold text-xs uppercase tracking-widest mb-1">
                <Sparkles size={14} className="text-nam-gold animate-bounce" />
                <span>AI Support Active</span>
              </div>
              Onboarding or Sign-up question? Tip here for instant support!
              <div className="absolute bottom-0 right-8 w-3 h-3 bg-white border-r border-b border-gray-100 rotate-45 translate-y-1.5" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={() => {
            setIsOpen(!isOpen);
            setHasNewMessage(false);
          }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          className={cn(
            "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-2xl cursor-pointer relative z-50 focus:outline-none transition-all duration-300",
            isOpen 
              ? "bg-nam-red hover:bg-nam-red/90 rotate-90" 
              : "bg-gradient-to-r from-nam-green to-emerald-800 hover:shadow-nam-green/20"
          )}
        >
          {isOpen ? <X size={24} /> : (
            <>
              <Sparkles size={24} className="text-nam-gold animate-pulse" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-ping" />
            </>
          )}
        </motion.button>
      </div>

      {/* Main Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white border border-gray-100 rounded-[2.5rem] shadow-2xl w-full max-w-[420px] h-[600px] flex flex-col overflow-hidden mt-4 z-40 relative mr-0"
          >
            {/* Header */}
            <div className="bg-gradient-to-br from-nam-green to-emerald-900 p-6 text-white shrink-0 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-nam-gold shadow-inner">
                  <Sparkles size={20} className="fill-current animate-pulse hover:rotate-12 transition-transform" />
                </div>
                <div>
                  <h3 className="font-black tracking-tight text-white flex items-center gap-1.5 leading-tight">
                    NamDirect Assistant
                  </h3>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-[#9DDC98] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Onboarding Guidance
                  </span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetChat}
                  title="Restart conversation"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                >
                  <RotateCcw size={16} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-[#FCFBF8] space-y-4">
              {messages.map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx === 0 ? 0 : 0.05 }}
                  className={cn(
                    "flex flex-col max-w-[85%] gap-1",
                    msg.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  {/* Speaker label */}
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                    {msg.role === 'user' ? 'You' : 'NamDirect Agent'}
                  </span>
                  
                  {/* Bubble body */}
                  <div className={cn(
                    "p-4 rounded-3xl text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-nam-green text-white rounded-br-none" 
                      : "bg-white border border-gray-100 text-gray-800 rounded-bl-none"
                  )}>
                    {msg.role === 'user' ? (
                      <p className="whitespace-pre-wrap leading-relaxed font-semibold">{msg.text}</p>
                    ) : (
                      <FormatMessageText text={msg.text} />
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <span className="text-[9px] text-gray-400 font-medium font-mono px-1">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </motion.div>
              ))}

              {/* Loader */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col mr-auto max-w-[80%] gap-1"
                >
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">NamDirect Agent</span>
                  <div className="bg-white border border-gray-100 p-4 rounded-3xl rounded-bl-none shadow-sm flex items-center gap-1.5">
                    <span className="text-gray-400 font-bold text-xs flex items-center gap-1">
                      Typing
                      <span className="flex gap-0.5">
                        <span className="w-1.5 h-1.5 bg-nam-green rounded-full animate-[bounce_1s_infinite_100ms]" />
                        <span className="w-1.5 h-1.5 bg-nam-green rounded-full animate-[bounce_1s_infinite_200ms]" />
                        <span className="w-1.5 h-1.5 bg-nam-green rounded-full animate-[bounce_1s_infinite_300ms]" />
                      </span>
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Anchor for Auto-scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick action buttons - Sticky above input but inside card */}
            {messages.length === 1 && !isLoading && (
              <div className="p-4 bg-white border-t border-gray-50 flex flex-col gap-2 shrink-0">
                <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 block">
                  Quick Signup Actions:
                </span>
                <div className="flex flex-col gap-1.5">
                  {quickActions.map((action, actionIdx) => {
                    const ActionIcon = action.icon;
                    return (
                      <button
                        key={actionIdx}
                        onClick={() => handleQuickAction(action.label, action.prompt)}
                        className={cn(
                          "w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-between border border-transparent hover:border-gray-100",
                          action.color
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <ActionIcon size={14} className="shrink-0" />
                          {action.label}
                        </span>
                        <ArrowRight size={12} className="opacity-60" />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chat Input Bar */}
            <div className="p-4 bg-white border-t border-gray-100 shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend(inputText);
                }}
                className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1 focus-within:ring-2 focus-within:ring-nam-green/20 focus-within:border-nam-green transition-all"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={isLoading}
                  placeholder="Need signup support? Ask here..."
                  className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-gray-800 disabled:opacity-50"
                />
                
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="w-10 h-10 bg-nam-green text-white rounded-xl flex items-center justify-center hover:bg-nam-green/90 transition-colors disabled:opacity-30 disabled:hover:bg-nam-green shrink-0 outline-none"
                >
                  <Send size={16} />
                </button>
              </form>
              <div className="flex items-center justify-between mt-2 px-1 text-[9px] text-gray-400">
                <span className="font-mono">Powered by NamDirect Intelligence</span>
                <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                  <CornerDownLeft size={8} /> Press Enter
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
