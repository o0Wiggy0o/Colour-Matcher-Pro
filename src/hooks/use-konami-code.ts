'use client';

import { useEffect, useState, useCallback } from 'react';

const konamiCode = [
  'ArrowUp', 'ArrowUp',
  'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight',
  'ArrowLeft', 'ArrowRight'
];

export const useKonamiCode = (callback: () => void) => {
  const [keys, setKeys] = useState<string[]>([]);

  const handler = useCallback((event: KeyboardEvent) => {
    // Ignore key presses in input fields
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    setKeys((prevKeys) => {
      const newKeys = [...prevKeys, event.key].slice(-konamiCode.length);
      if (JSON.stringify(newKeys) === JSON.stringify(konamiCode)) {
        callback();
        return []; // Reset after successful code
      }
      return newKeys;
    });
  }, [callback]);

  useEffect(() => {
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [handler]);
};
