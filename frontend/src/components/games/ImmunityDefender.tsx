import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImmunityDefenderProps {
  onClose: () => void;
  onFinish: (score: number) => void;
}

export default function ImmunityDefender({ onClose, onFinish }: ImmunityDefenderProps) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [gameActive, setGameActive] = useState(false);
  const [germs, setGerms] = useState<{ id: number; type: 'germ' | 'vitamin'; up: boolean }[]>(
    Array.from({ length: 9 }, (_, i) => ({ id: i + 1, type: 'germ', up: false }))
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const popUpTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastHoleRef = useRef<number | null>(null);

  const randomTime = (min: number, max: number) => {
    return Math.round(Math.random() * (max - min) + min);
  };

  const randomHole = useCallback((holesCount: number) => {
    const idx = Math.floor(Math.random() * holesCount);
    if (idx === lastHoleRef.current) return randomHole(holesCount);
    lastHoleRef.current = idx;
    return idx;
  }, []);

  const popUp = useCallback(() => {
    if (timeLeft <= 0) return;

    const time = randomTime(500, 1000);
    const holeIdx = randomHole(9);
    const isVitamin = Math.random() < 0.2;

    setGerms(prev => prev.map((g, i) => 
      i === holeIdx 
        ? { ...g, up: true, type: isVitamin ? 'vitamin' : 'germ' } 
        : g
    ));

    popUpTimeoutRef.current = setTimeout(() => {
      setGerms(prev => prev.map((g, i) => i === holeIdx ? { ...g, up: false } : g));
      if (gameActive) popUp();
    }, time);
  }, [gameActive, randomHole, timeLeft]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(30);
    setGameActive(true);
    setGerms(prev => prev.map(g => ({ ...g, up: false })));
  };

  useEffect(() => {
    if (gameActive && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setGameActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      popUp();
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (popUpTimeoutRef.current) clearTimeout(popUpTimeoutRef.current);
    };
  }, [gameActive]);

  useEffect(() => {
    if (timeLeft === 0 && !gameActive && score > 0) {
      // Game ended
      onFinish(score);
    }
  }, [timeLeft, gameActive, score, onFinish]);

  const handleWhack = (id: number) => {
    const germ = germs.find(g => g.id === id);
    if (!germ || !germ.up) return;

    setGerms(prev => prev.map(g => g.id === id ? { ...g, up: false } : g));

    if (germ.type === 'vitamin') {
      setScore(prev => Math.max(0, prev - 5));
    } else {
      setScore(prev => prev + 10);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center bg-green-50/50 p-4 rounded-3xl border border-green-200 shadow-inner max-w-sm mx-auto">
      <div className="w-full flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">Immunity Defender 🛡️</h2>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
          <X size={20} />
        </Button>
      </div>

      <p className="text-xs text-gray-500 mb-4">Tap red germs! Avoid blue vitamins!</p>

      <div className="flex justify-between items-center w-full mb-6 bg-white p-3 rounded-xl shadow-sm border border-green-100">
        <div className="text-lg font-bold text-indigo-600">Score: {score}</div>
        <div className="text-lg font-bold text-orange-500">Time: {timeLeft}s</div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6 w-full">
        {germs.map((germ) => (
          <div 
            key={germ.id} 
            className="relative aspect-square bg-gray-200 rounded-2xl shadow-inner overflow-hidden cursor-pointer"
            onClick={() => handleWhack(germ.id)}
          >
            <div 
              className={`absolute left-1/2 -translate-x-1/2 w-[80%] h-[80%] rounded-full flex items-center justify-center text-2xl transition-all duration-200 shadow-md ${
                germ.up ? 'bottom-[10%]' : '-bottom-full'
              } ${
                germ.type === 'vitamin' ? 'bg-blue-500' : 'bg-red-500'
              }`}
            >
              {germ.type === 'vitamin' ? '💊' : '👾'}
            </div>
          </div>
        ))}
      </div>

      <Button 
        onClick={startGame} 
        disabled={gameActive}
        className={`w-full py-6 text-lg font-bold rounded-2xl shadow-lg transition-all ${
          gameActive 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-green-500 hover:bg-green-600 shadow-green-200'
        }`}
      >
        {timeLeft === 0 ? 'Play Again' : gameActive ? 'Defending...' : 'Start Defense!'}
      </Button>
    </div>
  );
}
