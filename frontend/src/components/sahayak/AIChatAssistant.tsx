import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { MessageCircle, X, Send, Bot, User, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import axios from "axios";
import api from "@/services/api";

type Msg = { role: "user" | "assistant"; content: string };

interface AIChatAssistantProps {
  initialContext?: string;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
];

const AIChatAssistant = ({ initialContext }: AIChatAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("en");
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const lastAutoPromptRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (initialContext) {
      setIsOpen(true);
    }
  }, [initialContext]);

  useEffect(() => {
    if (!initialContext || !isOpen || isLoading) return;
    if (lastAutoPromptRef.current === initialContext) return;

    lastAutoPromptRef.current = initialContext;
    sendMessage(initialContext);
  }, [initialContext, isOpen, isLoading]);

  const sendMessage = async (text: string) => {
    const userMsg: Msg = { role: "user", content: text };
    const allMessages = [...messages, userMsg];
    setMessages(allMessages);
    setInput("");
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("question", `[${language}] ${text}`);
      let data;

      try {
        const response = await api.post("/sahayak/search", formData);
        data = response.data;
      } catch (err) {
        // Auto-create profile once if backend says it does not exist.
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          await api.get("/sahayak/profile");
          const retryResponse = await api.post("/sahayak/search", formData);
          data = retryResponse.data;
        } else {
          throw err;
        }
      }

      const schemeHints = Array.isArray(data?.schemes)
        ? data.schemes
            .slice(0, 3)
            .map((s: { name?: string }) => s.name)
            .filter(Boolean)
            .join(", ")
        : "";

      const assistantContent = `${data?.answer || "Sorry, I could not process your request."}${schemeHints ? `\n\nTop matches: ${schemeHints}` : ""}`;

      setMessages((prev) => [...prev, { role: "assistant", content: assistantContent }]);
    } catch (e) {
      console.error("Chat error:", e);
      let errorMessage = "I am having trouble connecting. Please try again in a moment.";

      if (axios.isAxiosError(e)) {
        if (!e.response) {
          errorMessage = "Cannot reach server. Please make sure backend is running on port 8002.";
        } else if (e.response.status === 401) {
          errorMessage = "Session expired. Please login again and retry.";
        } else {
          const detail = (e.response.data as { detail?: string })?.detail;
          if (detail) {
            errorMessage = `Request failed: ${detail}`;
          }
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: errorMessage },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full gradient-accent shadow-lg flex items-center justify-center hover:scale-110 transition-transform animate-pulse-glow"
          >
            <MessageCircle className="w-7 h-7 text-accent-foreground" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            drag
            dragListener={false}
            dragControls={dragControls}
            dragMomentum={false}
            dragElastic={0.08}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] h-[550px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden cursor-grab active:cursor-grabbing"
          >
            <div
              className="gradient-hero p-4 flex items-center justify-between shrink-0"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-primary-foreground font-display font-semibold text-sm">SahayakAI Assistant</h3>
                  <p className="text-primary-foreground/60 text-xs">Ask about schemes, eligibility and applications</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex items-center gap-1 px-4 py-2 border-b border-border bg-muted/30">
              <Globe className="w-3.5 h-3.5 text-muted-foreground" />
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setLanguage(l.code)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    language === l.code
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-0 py-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-primary/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">
                    {language === "hi" ? "नमस्ते! मैं SahayakAI हूँ। आपकी कैसे मदद कर सकता हूँ?" :
                     language === "mr" ? "नमस्कार! मी SahayakAI आहे. मी तुम्हाला कशी मदत करू?" :
                     "Hi! I am SahayakAI. Ask me about any disability scheme, eligibility, or application process."}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted text-foreground rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-7 h-7 rounded-full bg-sahayak-orange/10 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-sahayak-orange" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="sticky bottom-0 z-10 px-0 py-2.5 border-t border-border/70 flex gap-2 shrink-0 bg-card/95 backdrop-blur-sm">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  language === "hi" ? "अपना सवाल पूछें..." :
                  language === "mr" ? "तुमचा प्रश्न विचारा..." :
                  "Ask about schemes..."
                }
                disabled={isLoading}
                className="flex-1 rounded-2xl"
              />
              <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="rounded-2xl bg-primary text-primary-foreground shrink-0">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatAssistant;
