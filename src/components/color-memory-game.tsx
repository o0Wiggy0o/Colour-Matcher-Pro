
'use client';

import { useState, useEffect } from 'react';
import type { CmykColor } from '@/lib/grid';
import { cmykToRgb } from '@/lib/colors';
import { shuffleArray } from '@/lib/utils';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface GameCard {
  id: number;
  color: CmykColor;
  isFlipped: boolean;
  isMatched: boolean;
}

interface ColorMemoryGameProps {
  onClose: () => void;
}

const GAME_COLS = 6;

// A static set of distinct colors for the game.
const GAME_COLORS: CmykColor[] = [
  { c: 0, m: 100, y: 100, k: 0 }, // Red
  { c: 100, m: 0, y: 100, k: 0 }, // Green
  { c: 100, m: 100, y: 0, k: 0 }, // Blue
  { c: 0, m: 0, y: 100, k: 0 },   // Yellow
  { c: 100, m: 0, y: 0, k: 0 },   // Cyan
  { c: 0, m: 100, y: 0, k: 0 },   // Magenta
  { c: 0, m: 50, y: 100, k: 0 },  // Orange
  { c: 75, m: 100, y: 0, k: 0 },  // Purple
  { c: 50, m: 0, y: 100, k: 0 },  // Lime Green
  { c: 0, m: 70, y: 0, k: 0 },    // Pink
  { c: 30, m: 60, y: 100, k: 20}, // Brown
  { c: 0, m: 0, y: 0, k: 80 },    // Dark Grey
];


const GameCardComponent = ({ card, onCardClick }: { card: GameCard; onCardClick: () => void; }) => {
  const { r, g, b } = cmykToRgb(card.color.c, card.color.m, card.color.y, card.color.k);
  const isFlippable = !card.isFlipped && !card.isMatched;

  return (
    <div className="aspect-square [perspective:1000px] cursor-pointer" onClick={isFlippable ? onCardClick : undefined}>
      <div
        className={`relative w-full h-full transition-transform duration-500 [transform-style:preserve-3d] ${card.isFlipped || card.isMatched ? '[transform:rotateY(180deg)]' : ''}`}
      >
        <div className="absolute w-full h-full rounded-md bg-primary/20 [backface-visibility:hidden] flex items-center justify-center">
            <span className="text-4xl font-bold text-primary opacity-50">?</span>
        </div>
        <div
          className="absolute w-full h-full rounded-md [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
        />
      </div>
    </div>
  );
};

export function ColorMemoryGame({ onClose }: ColorMemoryGameProps) {
  const [cards, setCards] = useState<GameCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const gameDeck = [...GAME_COLORS, ...GAME_COLORS];
    const shuffled = shuffleArray(gameDeck);

    setCards(shuffled.map((color, index) => ({
      id: index,
      color,
      isFlipped: false,
      isMatched: false
    })));
  }, []);

  useEffect(() => {
    if (flippedIndices.length === 2) {
      setIsChecking(true);
      setMoves(m => m + 1);
      const [firstIndex, secondIndex] = flippedIndices;
      const firstCard = cards[firstIndex];
      const secondCard = cards[secondIndex];
      
      const c1 = firstCard.color;
      const c2 = secondCard.color;

      if (c1.c === c2.c && c1.m === c2.m && c1.y === c2.y && c1.k === c2.k) {
        // Match
        setTimeout(() => {
          setCards(prev => prev.map((card, index) =>
            index === firstIndex || index === secondIndex ? { ...card, isMatched: true } : card
          ));
          setFlippedIndices([]);
          setIsChecking(false);
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map((card, index) =>
            index === firstIndex || index === secondIndex ? { ...card, isFlipped: false } : card
          ));
          setFlippedIndices([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  }, [flippedIndices, cards]);

  useEffect(() => {
    const allMatched = cards.length > 0 && cards.every(c => c.isMatched);
    if (allMatched) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [cards]);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length >= 2 || isChecking || cards[index].isMatched || cards[index].isFlipped) {
      return;
    }

    setCards(prev => prev.map((card, i) =>
      i === index ? { ...card, isFlipped: true } : card
    ));
    setFlippedIndices(prev => [...prev, index]);
  };
  
  const allMatched = cards.length > 0 && cards.every(c => c.isMatched);

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col p-4 sm:p-8">
      <header className="flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Colour Memory Game</h2>
          <div className="flex items-center gap-4">
            <p className="font-mono text-lg">Moves: {moves}</p>
            <Button variant="ghost" size="icon" onClick={onClose}><X /></Button>
          </div>
        </div>
      </header>
      
      <main className="flex-grow flex items-center justify-center min-h-0">
        {allMatched ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center">
              <h3 className="text-4xl font-bold text-primary mb-2">Congratulations!</h3>
              <p className="text-xl text-muted-foreground">You matched all the colors in {moves} moves.</p>
              <Button onClick={onClose} className="mt-8">Play Again / Exit</Button>
          </div>
        ) : (
          <Card className="w-full max-w-2xl">
              <CardContent className="p-4">
                  <div
                      className="grid gap-2 sm:gap-4 aspect-[6/4]"
                      style={{ gridTemplateColumns: `repeat(${GAME_COLS}, 1fr)` }}
                  >
                      {cards.map((card, index) => (
                      <GameCardComponent key={card.id} card={card} onCardClick={() => handleCardClick(index)} />
                      ))}
                  </div>
              </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
