import type { ChatItem, Message } from './types';
import { parseJSONToReadableText } from './messageParser';

/**
 * Сбрасывает состояние обработки потока для нового сообщения
 */
export const resetStreamState = () => {
  // Функция для сброса состояния (если понадобится в будущем)
};

/**
 * Автоматически дополняет неполный JSON, закрывая скобки и кавычки
 */
const completeIncompleteJSON = (incompleteJSON: string): string => {
  let completed = incompleteJSON.trim();
  const counts = countOpenStructures(completed);
  
  // Закрываем открытые структуры
  if (counts.inString) completed += '"';
  completed += ']'.repeat(counts.openBrackets);
  completed += '}'.repeat(counts.openBraces);
  
  return completed;
};

/**
 * Подсчитывает открытые структуры в JSON
 */
const countOpenStructures = (json: string): { openBraces: number; openBrackets: number; inString: boolean } => {
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;
  
  for (const char of json) {
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === '{') openBraces++;
      else if (char === '}') openBraces--;
      else if (char === '[') openBrackets++;
      else if (char === ']') openBrackets--;
    }
  }
  
  return { openBraces, openBrackets, inString };
};

/**
 * Пытается распарсить накопленный JSON контент
 */
export const tryParseAccumulatedJSON = (content: string, isStreamComplete: boolean = false): { success: boolean; result?: string; questions?: string } => {
  // Проверяем, что контент выглядит как JSON
  if (!content.trim().startsWith('{') || !content.trim().includes('reasoning_steps')) {
    return { success: false };
  }
  
  try {
    const jsonData = JSON.parse(content);
    const readableText = parseJSONToReadableText(jsonData, isStreamComplete);
    
    // Проверяем, есть ли questions в JSON
    let questions: string | undefined;
    if (jsonData.questions && Array.isArray(jsonData.questions)) {
      questions = jsonData.questions.join('\n');
    }
    
    return { 
      success: true, 
      result: readableText,
      questions 
    };
  } catch (e) {
    // Пытаемся автодополнить JSON
    try {
      const completedJSON = completeIncompleteJSON(content);
      const jsonData = JSON.parse(completedJSON);
      const readableText = parseJSONToReadableText(jsonData, isStreamComplete);
      
      let questions: string | undefined;
      if (jsonData.questions && Array.isArray(jsonData.questions)) {
        questions = jsonData.questions.join('\n');
      }
      
      return { 
        success: true, 
        result: readableText,
        questions 
      };
    } catch (e2) {
      return { success: false };
    }
  }
};

/**
 * Обновляет чат, добавляя новое сообщение
 */
export const updateChatWithMessage = (
  chatHistory: ChatItem[], 
  currentChatId: number, 
  message: Message
): ChatItem[] => {
  const updated = chatHistory.map(chat => 
    chat.id === currentChatId 
      ? { ...chat, messages: [...chat.messages, message] }
      : chat
  );
  
  return updated;
};

/**
 * Обновляет содержимое существующего сообщения
 */
export const updateMessageContent = (
  chatHistory: ChatItem[], 
  currentChatId: number, 
  messageId: number, 
  content: string
): ChatItem[] => {
  const updated = chatHistory.map(chat => 
    chat.id === currentChatId 
      ? {
          ...chat, 
          messages: chat.messages.map(msg => 
            msg.id === messageId 
              ? { ...msg, content }
              : msg
          )
        }
      : chat
  );
  
  return updated;
};

/**
 * Отправляет запрос к API
 */
export const sendAPIRequest = async (
  message: string,
  currentAgentId: string | null,
  abortController?: AbortController
): Promise<Response> => {
  const requestBody = {
    model: currentAgentId || 'sgr_agent',
    messages: [{ role: 'user', content: message }],
    stream: true,
    max_tokens: 1500,
    temperature: 0.4
  };
  
  const response = await fetch('/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal: abortController?.signal
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  return response;
};

/**
 * Обрабатывает поток данных от API
 */
export const processStreamResponse = async (
  response: Response,
  onChunk: (data: any) => void,
  onComplete: () => void
): Promise<void> => {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  
  if (!reader) {
    throw new Error('No response body reader available');
  }
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onComplete();
            return;
          }
          
          try {
            const parsed = JSON.parse(data);
            onChunk(parsed);
          } catch (e) {
            // Игнорируем ошибки парсинга отдельных чанков
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
};
