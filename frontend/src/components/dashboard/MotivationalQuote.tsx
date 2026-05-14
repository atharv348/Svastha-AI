import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Quote } from "lucide-react";

const quotes = [
  { text: "The greatest wealth is health.", author: "Virgil" },
  { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
  { text: "Health is not valued till sickness comes.", author: "Thomas Fuller" },
  { text: "A healthy outside starts from the inside.", author: "Robert Urich" },
  { text: "Your body hears everything your mind says.", author: "Naomi Judd" },
];

export function MotivationalQuote() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % quotes.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const quote = quotes[index];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
      className="glass-card relative overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/10 via-card to-primary/5"
    >
      <div className="relative z-10 p-6">
        <Quote className="h-8 w-8 text-primary/55 mb-3" />
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-base font-medium italic leading-relaxed text-foreground">"{quote.text}"</p>
            <p className="text-sm text-muted-foreground mt-3">— {quote.author}</p>
          </motion.div>
        </AnimatePresence>
        <div className="flex gap-1.5 mt-4">
          {quotes.map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full transition-all ${i === index ? "bg-primary w-4" : "bg-primary/30"}`} />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
