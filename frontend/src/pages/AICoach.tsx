import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Bot, Loader2, Sparkles, HeartPulse, Info, HelpCircle, Mic, Paperclip, Trash2, Square, Globe, Target, Flame, Calendar, Star } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import heroBg from '@/assets/hero-bg.jpg';
import { PlanOutputRenderer } from '@/components/ai/PlanOutputRenderer';

const COMPOSER_MIN_HEIGHT = 48;
const COMPOSER_MAX_HEIGHT = 160;

interface Message {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  rating?: number;
}

interface UserProfile {
  full_name?: string;
  fitness_goal?: string;
  fitness_level?: string;
  dietary_restrictions?: string[];
  current_weight?: number;
  age?: number;
  gender?: string;
  streak_count?: number;
  last_checkin?: string;
}

export default function AICoach() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I am your AI Hub assistant. Ask for a meal plan, workout plan, combined plan, or any health question." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState<'friendly' | 'professional'>('friendly');
  const [style, setStyle] = useState<'concise' | 'detailed'>('concise');
  const [language, setLanguage] = useState<'en' | 'hi' | 'mr'>('en');
  const [aborter, setAborter] = useState<AbortController | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchChatHistory();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setUserProfile(response.data);
    } catch (err) {
      console.error("Failed to fetch user profile:", err);
    }
  };

  const handleRate = async (messageId: number, rating: number) => {
    try {
      await api.post(`/coach/rate/${messageId}?rating=${rating}`);
      setMessages(prev => prev.map(m => m.id === messageId ? { ...m, rating } : m));
      toast({
        title: "Rating Saved",
        description: `You rated this session ${rating} stars.`,
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save rating.",
      });
    }
  };

  const quickQuestions = [
    "Create a combined meal and workout plan",
    "Give me a high-protein vegetarian meal plan",
    "Build a beginner home workout plan",
    "How can I improve my sleep?",
    "Explain my latest health risks"
  ];

  const fetchChatHistory = async () => {
    try {
      const response = await api.get('/coach/history');
      if (response.data) {
        if (response.data.length > 0) {
          setMessages(response.data);
        } else {
          setMessages([{ role: 'assistant', content: "Hello! I am your AI Hub assistant. Ask for a meal plan, workout plan, combined plan, or any health question." }]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  };

  const clearChat = async () => {
    // For automation and better UX, we'll avoid the blocking browser confirm in this context
    // and rely on the action being explicit. 
    try {
      await api.delete('/coach/history');
      setMessages([{ role: 'assistant', content: "Hello! I am your AI Hub assistant. Ask for a meal plan, workout plan, combined plan, or any health question." }]);
      toast({
        title: "History Cleared",
        description: "Your chat history has been deleted.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not clear chat history. Please try again.",
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const composer = composerRef.current;
    if (!composer) return;

    composer.style.height = 'auto';
    const nextHeight = Math.min(
      Math.max(composer.scrollHeight, COMPOSER_MIN_HEIGHT),
      COMPOSER_MAX_HEIGHT
    );
    composer.style.height = `${nextHeight}px`;
    composer.style.overflowY = composer.scrollHeight > COMPOSER_MAX_HEIGHT ? 'auto' : 'hidden';
  }, [input]);

  const startVoiceToText = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({
        variant: "destructive",
        title: "Not Supported",
        description: "Your browser does not support voice recognition.",
      });
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.start();

    toast({
      title: "Listening...",
      description: "Ask AROMI your health question.",
    });

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onerror = () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Voice recognition failed. Please try again.",
      });
    };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        toast({
          variant: "destructive",
          title: "Invalid File",
          description: "Only PDF files are supported.",
        });
        return;
      }
      setSelectedFile(file);
      toast({
        title: "File Selected",
        description: `${file.name} ready to be analyzed.`,
      });
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend && !selectedFile) return;
    if (loading) return;

    const displayPrompt = selectedFile ? `[File: ${selectedFile.name}] ${promptToSend}` : promptToSend;

    if (!customPrompt) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: displayPrompt }]);
    setLoading(true);

    const locale = language === 'en' ? 'English' : language === 'hi' ? 'Hindi' : 'Marathi';
    const toneText = tone === 'friendly' ? 'friendly and supportive' : 'professional and clear';
    const styleText = style === 'concise' ? 'concise answers (3–6 sentences total unless lists are needed)' : 'more detailed, step-by-step answers when useful';
    const preferencePrefix = `Please respond in ${locale} with a ${toneText} tone. Use ${styleText}. When listing steps, keep bullets short. `;
    const effectivePrompt = `${preferencePrefix}\n${promptToSend}`;

    const controller = new AbortController();
    setAborter(controller);

    const formData = new FormData();
    formData.append('prompt', effectivePrompt);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await api.post('/coach/chat', formData, { 
        signal: controller.signal as any
      });
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.response }]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const error = err as any;
      if (error?.name === 'CanceledError' || error?.message?.includes('canceled')) {
        setMessages(prev => [...prev, { role: 'assistant', content: "Request canceled." }]);
      } else {
        const status = error?.response?.status;
        const detail = error?.response?.data?.detail;
        const detailText = Array.isArray(detail)
          ? detail.map((d: any) => d?.msg).filter(Boolean).join(', ')
          : typeof detail === 'string'
            ? detail
            : '';

        const message = status === 401
          ? "Your session expired. Please log in again."
          : status === 422
            ? `AI Hub could not process the request${detailText ? `: ${detailText}` : '. Please check your input and try again.'}`
            : status === 500
              ? "AI Hub server error. Please try again in a moment."
              : `I'm sorry, I couldn't connect to AI Hub${status ? ` (HTTP ${status})` : ''}. ${detailText || 'Please try again in a moment.'}`;

        console.error('AI Hub request failed:', {
          status,
          detail,
          message: error?.message,
        });
        setMessages(prev => [...prev, { role: 'assistant', content: message }]);
      }
    } finally {
      setLoading(false);
      setAborter(null);
    }
  };

  const stopGeneration = () => {
    try {
      aborter?.abort();
    } catch {}
    setLoading(false);
    setAborter(null);
  };

  const regenerateLast = () => {
    // Find last user message
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        handleSend(messages[i].content);
        break;
      }
    }
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url('/coach-bg.jpg'), url(${heroBg})` }}
      />
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />
      <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <header className="px-6 py-4 bg-card border-b border-border/40 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <HeartPulse size={22} />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground">AI Hub Coach</h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Always Online</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 mr-2">
            <Button variant={tone === 'friendly' ? 'default' : 'ghost'} size="sm" onClick={() => setTone('friendly')}>Friendly</Button>
            <Button variant={tone === 'professional' ? 'default' : 'ghost'} size="sm" onClick={() => setTone('professional')}>Professional</Button>
            <span className="mx-1 text-muted-foreground">•</span>
            <Button variant={style === 'concise' ? 'default' : 'ghost'} size="sm" onClick={() => setStyle('concise')}>Concise</Button>
            <Button variant={style === 'detailed' ? 'default' : 'ghost'} size="sm" onClick={() => setStyle('detailed')}>Detailed</Button>
            <span className="mx-1 text-muted-foreground">•</span>
            <Button variant="ghost" size="icon" title="Language">
              <Globe className="w-4 h-4" />
            </Button>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="h-8 rounded-md border border-border/50 bg-transparent text-sm"
              aria-label="Language"
            >
              <option value="en">English</option>
              <option value="hi">Hindi</option>
              <option value="mr">Marathi</option>
            </select>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="rounded-full text-muted-foreground hover:text-destructive transition-colors"
            onClick={clearChat}
            title="Clear History"
          >
            <Trash2 size={20} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary transition-colors">
            <HelpCircle size={20} />
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
      <ScrollArea className="flex-1 min-h-0 px-[10px] py-4 md:py-5" viewportRef={scrollRef}>
        <div className="mx-auto flex min-h-full w-full max-w-none flex-col">
          {userProfile && (
            <Card className="mb-6 bg-card/80 backdrop-blur-md border-primary/20 shadow-lg animate-in fade-in slide-in-from-top-4 duration-500">
              <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Target size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Current Goal</p>
                    <h2 className="text-lg font-bold text-foreground">{userProfile.fitness_goal?.replace('_', ' ') || 'General Wellness'}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-orange-500">
                      <Flame size={20} fill="currentColor" />
                      <span className="text-xl font-bold">{userProfile.streak_count || 0}</span>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Day Streak</p>
                  </div>
                  <div className="w-px h-8 bg-border/50 hidden md:block" />
                  <div className="flex flex-col items-center">
                    <div className="flex items-center gap-1 text-blue-500">
                      <Calendar size={20} />
                      <span className="text-sm font-bold">
                        {userProfile.last_checkin 
                          ? new Date(userProfile.last_checkin).toLocaleDateString() 
                          : 'Today'}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase">Last Check-in</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-2 flex flex-1 flex-col justify-end gap-4 pb-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex w-full ${m.role === 'user' ? 'justify-end pl-[33px]' : 'justify-start pr-[22px]'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex w-full items-start gap-2 ${m.role === 'user' ? 'max-w-full md:max-w-[800px] flex-row-reverse' : 'max-w-full md:max-w-[900px]'}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-primary border border-border/40'}`}>
                  {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                {m.role === 'assistant' ? (
                  <div className="w-full space-y-2">
                    <PlanOutputRenderer
                      content={m.content}
                      userProfile={
                        userProfile
                          ? {
                              age: userProfile.age,
                              gender: userProfile.gender,
                              current_weight: userProfile.current_weight,
                              fitness_level: userProfile.fitness_level,
                              fitness_goal: userProfile.fitness_goal,
                              dietary_restrictions: userProfile.dietary_restrictions,
                            }
                          : undefined
                      }
                      onRegenerate={i === messages.length - 1 ? regenerateLast : undefined}
                    />
                    {m.id && (
                      <div className="flex items-center gap-2 pt-1 pl-1">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Rate Session:</span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => handleRate(m.id!, star)}
                              className={`p-1 transition-colors ${
                                (m.rating || 0) >= star ? 'text-yellow-400' : 'text-muted-foreground/30 hover:text-yellow-200'
                              }`}
                            >
                              <Star size={14} fill={(m.rating || 0) >= star ? "currentColor" : "none"} />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl text-sm leading-relaxed shadow-md bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-tr-none">
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted prose-pre:border prose-pre:border-border/40 prose-table:border prose-table:border-border/40 prose-th:bg-muted/50 prose-th:p-2 prose-td:p-2 prose-strong:text-white prose-p:text-white">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex w-full justify-start pr-[22px]">
              <div className="flex w-full max-w-full md:max-w-[900px] gap-2">
                <div className="w-9 h-9 rounded-xl bg-card text-primary border border-border/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={18} />
                </div>
                <div className="p-4 rounded-2xl bg-card text-foreground rounded-tl-none border border-border/40 shadow-sm flex items-center gap-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs font-medium text-muted-foreground italic">AI Hub is thinking...</span>
                  <Button size="sm" variant="ghost" onClick={stopGeneration} className="h-7 px-2"><Square className="w-3.5 h-3.5 mr-1" />Stop</Button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 z-20 shrink-0 px-[33px] py-3 bg-gradient-to-t from-background/75 via-background/55 to-transparent backdrop-blur-sm">
        <div className="w-full mx-auto space-y-3">
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-3 animate-in fade-in zoom-in-95 duration-500">
              {quickQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSend(q)}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-card hover:bg-primary/5 hover:border-primary/30 border border-border/40 transition-all shadow-sm flex items-center gap-2 group"
                >
                  <Sparkles size={12} className="text-primary group-hover:scale-110 transition-transform" />
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="relative group">
            {selectedFile && (
              <div className="absolute -top-12 left-0 right-0 flex items-center gap-2 p-2 bg-card border border-border/40 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  <Paperclip size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{selectedFile.name}</p>
                  <p className="text-[10px] text-muted-foreground">{(selectedFile.size / 1024).toFixed(1)} KB • PDF</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            )}
            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              className="relative"
            >
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
              <div className="relative w-full">
                <Textarea
                  ref={composerRef}
                  placeholder="Ask AI Hub for meal/workout plans or health guidance..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={loading}
                  autoFocus
                  rows={1}
                  className="w-full pl-12 pr-24 py-3 rounded-[24px] border border-border/30 bg-card/95 text-[15px] placeholder:text-muted-foreground/60 transition-all resize-none min-h-[48px] max-h-[160px] leading-6 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-muted-foreground hover:text-primary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  aria-label="Attach file"
                >
                  <Paperclip size={16} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-11 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-muted-foreground hover:text-primary"
                  onClick={startVoiceToText}
                  disabled={loading}
                  aria-label="Start voice input"
                >
                  <Mic size={15} />
                </Button>
                <Button 
                  type="submit" 
                  disabled={loading || (!input.trim() && !selectedFile)} 
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full gradient-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                  aria-label="Send message"
                >
                  <Send size={14} />
                </Button>
              </div>
            </form>
            <div className="mt-2 text-[10px] text-muted-foreground/80 text-right pr-1">
              Press Enter to send • Shift+Enter for a new line
            </div>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <Info size={10} />
            AI Hub provides general wellness guidance. Always seek professional medical advice for specific concerns.
          </p>
        </div>
      </div>
      </div>
    </div>
    </div>
  );
}
