import { useState, useEffect } from 'react';

const LOADING_MESSAGES = [
  "Mixing encryption ingredients... 🔐",
  "Adding secret sauce... 🌶️",
  "Scrambling your message... 🥚",
  "Applying military-grade security... 🛡️",
  "Making it impossible to crack... 🔨",
  "Wrapping in layers of encryption... 🎁",
  "Securing the digital vault... 🔒",
  "Turning your message into gibberish... 🔮",
  "Activating self-destruct timer... ⏱️",
  "Preparing one-time magic link... ✨"
];

export function useLoadingMessages(isLoading, interval = 2000) {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!isLoading) {
      setMessageIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, interval);

    return () => clearInterval(timer);
  }, [isLoading, interval]);

  return LOADING_MESSAGES[messageIndex];
}
