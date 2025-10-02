// Константы для API
export const API_CONFIG = {
  ENDPOINT: '/api/v1/chat/completions',
  DEFAULT_MODEL: 'sgr_agent',
  MAX_TOKENS: 1500,
  TEMPERATURE: 0.4,
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache'
  }
} as const;


// Утилиты для генерации ID
export const generateMessageId = (): number => 
  Date.now() + Math.floor(Math.random() * 1000);

export const getCurrentTimestamp = (): string => 
  new Date().toLocaleTimeString();
