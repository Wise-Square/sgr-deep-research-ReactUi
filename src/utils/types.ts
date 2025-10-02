import React from 'react';

// Типы для чата
export type Message = {
  id: number;
  type: 'question' | 'answer';
  content: string;
  timestamp: string;
};

export type ChatItem = {
  id: number;
  title: string;
  timestamp: string;
  preview: string;
  messages: Message[];
};

export type ChatProps = {
  currentChat: ChatItem | undefined;
  onSendMessage: (message: string) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatItem[]>>;
  t: (key: string) => string;
  sidebarVisible: boolean;
};

// Типы для API ответов
export type APIResponse = {
  model?: string;
  choices?: Array<{
    delta?: {
      content?: string;
      tool_calls?: Array<{
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
  }>;
  chunk?: {
    choices?: Array<{
      delta?: {
        content?: string;
        tool_calls?: Array<{
          function?: {
            name?: string;
            arguments?: string;
          };
        }>;
      };
    }>;
  };
  snapshot?: {
    choices?: Array<{
      message?: {
        content?: string;
        parsed?: {
          reasoning_steps?: string[];
        };
      };
    }>;
  };
};

export type ParsedJSONData = {
  current_situation?: string;
  plan_status?: string;
  reasoning_steps?: string[];
  remaining_steps?: string[];
  enough_data?: boolean;
  task_completed?: boolean;
  function?: {
    questions?: string[];
    tool_name_discriminator?: string;
    content?: string;
    reasoning?: string;
    query?: string;
    title?: string;
    next_steps?: string[];
    unclear_terms?: string[];
    assumptions?: string[];
  };
  reasoning?: string;
  title?: string;
  content?: string;
  confidence?: string;
  // Новые поля для agentcompletiontool
  tool_name_discriminator?: string;
  completed_steps?: string[];
  status?: string;
};
