import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { parseMessage } from '../utils/newParser';

// Импортируем formatJSONForSpoiler из newParser
const formatJSONForSpoiler = (jsonData: any): string => {
  let result = '';
  
  // Reasoning steps
  if (jsonData.reasoning_steps) {
    result += '**Reasoning steps:**\n';
    jsonData.reasoning_steps.forEach((step: string, index: number) => {
      result += `${index + 1}. ${step}\n`;
    });
    result += '\n';
  }
  
  // Current situation
  if (jsonData.current_situation) {
    result += `**Current situation:** ${jsonData.current_situation}\n\n`;
  }
  
  // Plan status
  if (jsonData.plan_status) {
    result += `**Plan status:** ${jsonData.plan_status}\n\n`;
  }
  
  // Remaining steps
  if (jsonData.remaining_steps) {
    result += '**Remaining steps:**\n';
    jsonData.remaining_steps.forEach((step: string, index: number) => {
      result += `${index + 1}. ${step}\n`;
    });
    result += '\n';
  }
  
  // Task completed
  if (jsonData.task_completed !== undefined) {
    result += `**Task completed:** ${jsonData.task_completed}\n\n`;
  }
  
  // Enough data
  if (jsonData.enough_data !== undefined) {
    result += `**Enough data:** ${jsonData.enough_data}\n\n`;
  }
  
  // Function/Tool calls
  if (jsonData.function) {
    result += '**Function:**\n';
    if (jsonData.function.tool_name_discriminator) {
      result += `- Tool: ${jsonData.function.tool_name_discriminator}\n`;
    }
    if (jsonData.function.reasoning) {
      result += `- Reasoning: ${jsonData.function.reasoning}\n`;
    }
    // НЕ добавляем questions в спойлер - они идут в основной текст
    if (jsonData.function.unclear_terms) {
      result += `- Unclear terms: ${jsonData.function.unclear_terms.join(', ')}\n`;
    }
    if (jsonData.function.assumptions) {
      result += `- Assumptions: ${jsonData.function.assumptions.join(', ')}\n`;
    }
    
    // Специальная обработка для agentcompletiontool
    if (jsonData.function.tool_name_discriminator === 'agentcompletiontool') {
      if (jsonData.function.completed_steps) {
        result += '**Completed steps:**\n';
        jsonData.function.completed_steps.forEach((step: string, index: number) => {
          result += `${index + 1}. ${step}\n`;
        });
        result += '\n';
      }
      if (jsonData.function.status) {
        result += `- Status: ${jsonData.function.status}\n`;
      }
    }
    
    result += '\n';
  }
  
  return result.trim();
};

type ChatItem = {
  id: number;
  title: string;
  timestamp: string;
  preview: string;
  messages: Array<{
    id: number, 
    type: 'question' | 'answer', 
    content: string, 
    timestamp: string,
    questions?: string,
    // Новые поля для структурированного контента
    mainText?: string,
    spoilerText?: string,
    spoilerTitle?: string
  }>;
};

type ChatProps = {
  currentChat: ChatItem | undefined;
  onSendMessage: (message: string) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatItem[]>>;
  t: (key: string) => string;
  sidebarVisible: boolean;
  currentModel: string;
  currentLanguage: string;
};

const Chat: React.FC<ChatProps> = ({ currentChat, onSendMessage, setChatHistory, t, sidebarVisible, currentModel, currentLanguage }) => {
    const [inputMessage, setInputMessage] = useState('');
    const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
    const lastBotMessageIdRef = useRef<number | null>(null);
    const savedReportContentRef = useRef<string>('');

    // Сбрасываем agent ID при смене чата
    useEffect(() => {
        setCurrentAgentId(null);
        lastBotMessageIdRef.current = null;
        savedReportContentRef.current = '';
    }, [currentChat?.id]);

    const sendMessage = async () => {
        if (!inputMessage.trim() || !currentChat) return;
        
        const messageToSend = inputMessage;
        
        try {
            // Добавляем сообщение пользователя
            const userMessage = {
                id: Date.now(),
                type: 'question' as const,
                content: messageToSend,
                timestamp: new Date().toLocaleTimeString(currentLanguage === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })
            };
            
            // Обновляем состояние чата
            setChatHistory(prev => prev.map(chat => 
                chat.id === currentChat.id 
                    ? { ...chat, messages: [...chat.messages, userMessage] }
                    : chat
            ));
            
            setInputMessage('');
            
            // Вызываем функцию отправки сообщения ПЕРЕД getMessage
            await onSendMessage(messageToSend);
            
            const botMessageId = Date.now() + 1;
            lastBotMessageIdRef.current = botMessageId;
            await getMessage(botMessageId, messageToSend);
            
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const getMessage = async (botMessageId: number, userMessage: string) => {
        const botMessage = {
            id: botMessageId,
            type: 'answer' as const,
            content: '',
            timestamp: new Date().toLocaleTimeString(currentLanguage === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })
        };

        setChatHistory(prev => {
            const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
            if (!currentChatInState) {
                console.error('Current chat not found in state');
                return prev;
            }
            
            
            return prev.map(chat => 
                chat.id === currentChat?.id 
                    ? { ...chat, messages: [...chat.messages, botMessage] }
                    : chat
            );
        });

        const modelToUse = currentAgentId || 'sgr_agent';
        
        const request = await fetch('/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: modelToUse,
                messages: [{ role: 'user', content: userMessage }],
                stream: true,
                max_tokens: 1500,
                temperature: 0.4
            })
        });
        

        if (!request.ok) {
            console.error('❌ API Request failed:', { status: request.status, statusText: request.statusText, botMessageId });
            throw new Error(`HTTP error! status: ${request.status}`);
        }
        
        const reader = request.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') break;
                            
                            
                            try {
                                const parsed = JSON.parse(data);
                            
                                // Устанавливаем currentAgentId из ответа сервера
                                if (parsed.model && parsed.model.startsWith('sgr_agent_')) {
                                    setCurrentAgentId(parsed.model);
                                }
                                
                                // Обработка обычного контента
                                let snapshotContent = '';
                                if (parsed.snapshot?.choices?.[0]?.message?.content) {
                                    snapshotContent = parsed.snapshot.choices[0].message.content;
                                }

                                // Обрабатываем delta content если есть
                                if (parsed.choices?.[0]?.delta?.content) {
                                    const deltaContent = parsed.choices[0].delta.content;
                                    fullResponse += deltaContent;
                                }

                                // Всегда пытаемся парсить snapshot если он есть
                                if (snapshotContent) {
                                    // Парсим JSON напрямую
                                    let mainTextToShow = '';
                                    let spoilerText = '';
                                    let spoilerTitle = undefined; // Заголовок будет установлен в MessageBubble
                                    
                                    try {
                                        const jsonData = JSON.parse(snapshotContent);
                                        
                                        // Извлекаем основной текст из JSON
                                        const mainContentParts = [];
                                        
                                        // Добавляем function.title если есть
                                        if (jsonData.function?.title) {
                                            mainContentParts.push(`# ${jsonData.function.title}`);
                                        }
                                        
                                        // Добавляем function.content если есть (это сам отчет)
                                        if (jsonData.function?.content) {
                                            mainContentParts.push(jsonData.function.content);
                                        }
                                        
                                        // Добавляем function.questions если есть (в основной текст)
                                        if (jsonData.function?.questions && Array.isArray(jsonData.function.questions)) {
                                            const questionsText = jsonData.function.questions.map((q: string, index: number) => 
                                                `${index + 1}. ${q}`
                                            ).join('\n');
                                            mainContentParts.push(questionsText);
                                        }
                                        
                                        // Специальная обработка для agentcompletiontool
                                        if (jsonData.function?.tool_name_discriminator === 'agentcompletiontool') {
                                            if (!jsonData.function?.title && jsonData.current_situation) {
                                                mainContentParts.push(`# ${jsonData.current_situation}`);
                                            }
                                            if (!jsonData.function?.content && jsonData.function?.reasoning) {
                                                mainContentParts.push(jsonData.function.reasoning);
                                            }
                                        }
                                        
                                        if (mainContentParts.length > 0) {
                                            mainTextToShow = mainContentParts.join('\n\n');
                                        }
                                        
                                        // Проверяем, есть ли Executive Summary
                                        if (mainTextToShow.includes('### Executive Summary')) {
                                            savedReportContentRef.current = mainTextToShow;
                                        }
                                        
                                        // Используем сохраненный Executive Summary, если есть
                                        if (savedReportContentRef.current) {
                                            mainTextToShow = savedReportContentRef.current;
                                        }
                                        
                                        // Создаем спойлер из JSON данных
                                        spoilerText = formatJSONForSpoiler(jsonData);
                                        
                                    } catch (e) {
                                        // Если не JSON, используем старую логику
                                        const parseResult = parseMessage(snapshotContent);
                                        mainTextToShow = parseResult.mainText;
                                        spoilerText = parseResult.spoilerText || '';
                                        spoilerTitle = parseResult.spoilerTitle;
                                    }
                                    
                                    // Обновляем сообщение со структурированными данными
                                    if (mainTextToShow || spoilerText) {
                                        setChatHistory(prev => {
                                            const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
                                            if (!currentChatInState) {
                                                console.error('Chat not found when updating content');
                                                return prev;
                                            }
                                            
                                            const answerMessages = currentChatInState.messages.filter(msg => msg.type === 'answer');
                                            const targetMessage = answerMessages[answerMessages.length - 1];
                                            
                                            if (!targetMessage) {
                                                console.error('No answer message found. Available messages:', currentChatInState.messages.map(m => ({ id: m.id, type: m.type })));
                                                return prev;
                                            }
                                            
                                            
                                            return prev.map(chat => 
                                                chat.id === currentChat?.id 
                                                    ? {
                                                        ...chat, 
                                                        messages: chat.messages.map(msg => 
                                                            msg.id === targetMessage.id 
                                                                ? { 
                                                                    ...msg, 
                                                                    mainText: mainTextToShow,
                                                                    spoilerText: spoilerText,
                                                                    spoilerTitle: spoilerTitle,
                                                                    // Обновляем время при появлении контента
                                                                    timestamp: new Date().toLocaleTimeString(currentLanguage === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                                                                }
                                                                : msg
                                                        )
                                                    }
                                                    : chat
                                            );
                                        });
                                    }
                                }
                                
                                // Обработка tool_calls
                                if (parsed.choices?.[0]?.delta?.tool_calls) {
                                    const toolCall = parsed.choices[0].delta.tool_calls[0];
                                    
                                    if (toolCall?.function?.name === 'createreporttool') {
                                        // НЕ создаем отдельное сообщение для отчетов - парсер сам обработает их
                                    } else if (toolCall?.function?.name === 'agentcompletiontool') {
                                        try {
                                            JSON.parse(toolCall.function.arguments);
                                        } catch (error) {
                                            console.error('❌ Error parsing completion data:', error);
                                        }
                                    }
                                }
                                
                                // Обрабатываем финальный ответ
                                if (parsed.choices?.[0]?.message?.content) {
                                    const finalContent = parsed.choices[0].message.content;
                                    
                                    if (!fullResponse.trim()) {
                                        fullResponse = finalContent;
                                        setChatHistory(prev => {
                                            const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
                                            if (!currentChatInState) {
                                                console.error('Chat not found when setting final content');
                                                return prev;
                                            }
                                            
                                            const answerMessages = currentChatInState.messages.filter(msg => msg.type === 'answer');
                                            const targetMessage = answerMessages[answerMessages.length - 1];
                                            
                                            if (!targetMessage) {
                                                console.error('No answer message found for final content');
                                                return prev;
                                            }
                                            
                                            return prev.map(chat => 
                                                chat.id === currentChat?.id 
                                                    ? {
                                                        ...chat, 
                                                        messages: chat.messages.map(msg => 
                                                            msg.id === targetMessage.id 
                                                                ? { 
                                                                    ...msg, 
                                                                    content: fullResponse,
                                                                    // Обновляем время при появлении финального контента
                                                                    timestamp: new Date().toLocaleTimeString(currentLanguage === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })
                                                                }
                                                                : msg
                                                        )
                                                    }
                                                    : chat
                                            );
                                        });
                                    }
                                }
                            } catch (e) {
                                // Игнорируем ошибки парсинга отдельных чанков
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Error during stream processing:', error);
            } finally {
                // Финальная обработка - убеждаемся, что структурированные данные сохранены
            }
        }
        
        return fullResponse;
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    return (
        <>
            <div className={`chat-container ${!sidebarVisible ? 'expanded' : ''}`}>
                <div className="chat-header">
                    <h2 className="chat-title">{currentChat?.title || t('select_chat')}</h2>
                    {currentChat && (
                        <div className="current-model-info">
                            <span className="model-name">{currentModel}</span>
                        </div>
                    )}
                </div>
                
                <div className="chat-messages">
                    {!currentChat ? (
                        <div className="empty-chat">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="empty-icon">
                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                            </svg>
                            <p className="empty-text">{t('select_chat_or_create')}</p>
                        </div>
                    ) : currentChat?.messages.length === 0 ? (
                        <div className="empty-chat">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="empty-icon">
                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                            </svg>
                            <p className="empty-text">{t('start_new_conversation')}</p>
                            <p className="empty-subtext">{t('enter_message_below')}</p>
                        </div>
                    ) : (
                        <>
                            {currentChat?.messages.map((message) => {
                                // Используем структурированные данные, если они есть
                                if (message.type === 'answer' && (message.mainText || message.spoilerText)) {
                                    return (
                                        <MessageBubble
                                            key={message.id}
                                            message={message.mainText || message.content}
                                            timestamp={message.timestamp}
                                            type="assistant"
                                            spoilerText={message.spoilerText}
                                            spoilerTitle={message.spoilerTitle}
                                            t={t}
                                        />
                                    );
                                } else {
                                    // Обычное сообщение или ответ без структурированных данных
                                const { mainText, spoilerText, spoilerTitle } = message.type === 'answer' 
                                    ? parseMessage(message.content, message.questions)
                                    : { mainText: message.content, spoilerText: undefined, spoilerTitle: undefined };

                                return (
                                    <MessageBubble
                                        key={message.id}
                                        message={mainText}
                                        timestamp={message.timestamp}
                                        type={message.type === 'question' ? 'user' : 'assistant'}
                                        spoilerText={spoilerText}
                                        spoilerTitle={spoilerTitle}
                                            t={t}
                                    />
                                );
                                }
                            })}
                        </>
                    )}
                </div>
            </div>
            
            <div className={`chat-input-section ${!sidebarVisible ? 'expanded' : ''}`}>
                <div className="input-group modern-chat-input">
                    <input
                        type="text"
                        className={`form-control chat-input ${!currentChat ? 'disabled' : ''}`}
                        placeholder={
                            currentChat 
                                ? t('enter_message') 
                                : t('select_chat_or_create')
                        }
                        aria-label="Chat input"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={!currentChat}
                    />
                    <button
                        className={`btn btn-primary send-button ${!currentChat ? 'disabled' : ''}`}
                        type="button"
                        onClick={sendMessage}
                        disabled={!currentChat}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </>
    );
};

export default Chat;