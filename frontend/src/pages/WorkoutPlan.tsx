import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dumbbell, Send, User, Bot, Loader2, Sparkles, Trophy, Info, Mic, Paperclip, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import api from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function WorkoutPlan() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm your AI Fitness Coach. Tell me your fitness level, goals, or available equipment, and I'll design a personalized workout routine for you in a structured table format." }
  ]);
  const [input, setInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const suggestedGoals = [
    "Beginner Home Workout (No Equipment)",
    "Intermediate 5-Day Gym Split",
    "Fat Loss & Cardio Routine",
    "Muscle Building for Advanced",
    "30-Minute Morning Yoga & Mobility"
  ];

  useEffect(() => {
    fetchChatHistory();
  }, []);

  const fetchChatHistory = async () => {
    try {
      const response = await api.get('/workout/history/chat');
      if (response.data && response.data.length > 0) {
        setMessages(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  };

  const clearChat = async () => {
    if (!confirm("Are you sure you want to clear your workout plan chat history?")) return;
    
    try {
      await api.delete('/workout/history/chat');
      setMessages([{ role: 'assistant', content: "Hello! I'm your AI Fitness Coach. Tell me your fitness level, goals, or available equipment, and I'll design a personalized workout routine for you in a structured table format." }]);
      toast({
        title: "History Cleared",
        description: "Your workout plan chat history has been deleted.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Action Failed",
        description: "Could not clear history. Please try again.",
      });
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
      description: "Speak your workout goal now.",
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

    const formData = new FormData();
    formData.append('prompt', promptToSend);
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await api.post('/workout/generate', formData);
      setMessages(prev => [...prev, { role: 'assistant', content: response.data.plan_content }]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast({
        title: "Workout Plan Ready",
        description: "Your personalized fitness routine is ready below.",
      });
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error while generating your workout plan. Please try again." }]);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not create your workout plan. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-muted/50 overflow-hidden">
      <header className="px-6 py-4 bg-card border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20">
            <Dumbbell size={22} />
          </div>
          <div>
            <h1 className="text-lg font-heading font-bold text-foreground">AI Fitness Coach</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Gemini Style Interface</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            <Info size={20} />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0 px-0 py-4 md:py-5" viewportRef={scrollRef}>
        <div className="w-full mx-auto space-y-6">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`flex gap-4 max-w-[90%] ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card text-primary border border-border/40'}`}>
                  {m.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  m.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-none shadow-md' 
                  : 'bg-card text-foreground rounded-tl-none border border-border/40 shadow-sm'
                }`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-table:border prose-table:border-border/40 prose-th:bg-muted/50 prose-th:p-2 prose-td:p-2 prose-td:border prose-td:border-border/40">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {m.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex gap-4 max-w-[80%]">
                <div className="w-9 h-9 rounded-xl bg-card text-primary border border-border/40 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Bot size={18} />
                </div>
                <div className="p-4 rounded-2xl bg-card text-foreground rounded-tl-none border border-border/40 shadow-sm flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-xs font-medium text-muted-foreground italic">Designing your fitness routine...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="sticky bottom-0 z-20 shrink-0 px-0 py-3 bg-gradient-to-t from-background/75 via-background/55 to-transparent backdrop-blur-sm">
        <div className="w-full mx-auto space-y-3">
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-center mb-3 animate-in fade-in zoom-in-95 duration-500">
              {suggestedGoals.map((goal) => (
                <button
                  key={goal}
                  onClick={() => handleSend(goal)}
                  className="px-4 py-2 text-xs font-semibold rounded-full bg-card hover:bg-primary/5 hover:border-primary/30 border border-border/40 transition-all shadow-sm flex items-center gap-2 group"
                >
                  <Trophy size={12} className="text-primary group-hover:scale-110 transition-transform" />
                  {goal}
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
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl text-muted-foreground hover:text-primary transition-colors h-12 w-12 border border-border/40"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
              >
                <Paperclip size={20} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-xl text-muted-foreground hover:text-primary transition-colors h-12 w-12 border border-border/40"
                onClick={startVoiceToText}
                disabled={loading}
              >
                <Mic size={20} />
              </Button>
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Ask for a workout plan (e.g., '30 min home workout for beginners')..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                  className="w-full pr-14 pl-6 py-6 rounded-2xl border-border/40 focus:ring-primary/20 shadow-xl bg-card text-base placeholder:text-muted-foreground/60 transition-all focus:border-primary/40 outline-none border-2"
                />
                <Button 
                  type="submit" 
                  disabled={loading || (!input.trim() && !selectedFile)} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-xl gradient-primary shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send size={20} />
                </Button>
              </div>
            </form>
          </div>
          
          <p className="text-[10px] text-center text-muted-foreground flex items-center justify-center gap-1">
            <Info size={10} />
            Consult a fitness professional before starting any new exercise routine.
          </p>
        </div>
      </div>
    </div>
  );
}
