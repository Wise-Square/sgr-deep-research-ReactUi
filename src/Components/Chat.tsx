import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { parseMessage } from '../utils/newParser';

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
    questions?: string
  }>;
};

type ChatProps = {
  currentChat: ChatItem | undefined;
  onSendMessage: (message: string) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatItem[]>>;
  t: (key: string) => string;
  sidebarVisible: boolean;
  currentModel: string;
};

const Chat: React.FC<ChatProps> = ({ currentChat, onSendMessage, setChatHistory, t, sidebarVisible, currentModel }) => {
    const [inputMessage, setInputMessage] = useState('');
    const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
    const lastBotMessageIdRef = useRef<number | null>(null);
    const savedReportContentRef = useRef<string>('');

    // Сбрасываем agent ID при смене чата
    useEffect(() => {
        setCurrentAgentId(null);
        lastBotMessageIdRef.current = null;
        savedReportContentRef.current = '';
        console.log('🔄 Chat changed, reset agent state');
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
                timestamp: new Date().toLocaleTimeString()
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
            console.log('🆔 Created bot message ID:', botMessageId);
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
            timestamp: new Date().toLocaleTimeString()
        };

        setChatHistory(prev => {
            const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
            if (!currentChatInState) {
                console.error('Current chat not found in state');
                return prev;
            }
            
            console.log(`🤖 Adding bot message to chat with ${currentChatInState.messages.length} existing messages`);
            
            return prev.map(chat => 
                chat.id === currentChat?.id 
                    ? { ...chat, messages: [...chat.messages, botMessage] }
                    : chat
            );
        });

        const modelToUse = currentAgentId || 'sgr_agent';
        console.log('🚀 Sending request with model:', modelToUse, 'botMessageId:', botMessageId);
        
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
        
        console.log('📡 API Response received:', {
            status: request.status,
            statusText: request.statusText,
            hasBody: !!request.body,
            botMessageId
        });

        if (!request.ok) {
            console.error('❌ API Request failed:', { status: request.status, statusText: request.statusText, botMessageId });
            throw new Error(`HTTP error! status: ${request.status}`);
        }
        
        const reader = request.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        let lastSnapshotContent = '';

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
                            
                            console.log('🔍 Raw SSE data received:', data);
                            
                            try {
                                const parsed = JSON.parse(data);
                            
                                // Устанавливаем currentAgentId из ответа сервера
                                if (parsed.model && parsed.model.startsWith('sgr_agent_')) {
                                    console.log('🆔 Agent ID received:', parsed.model);
                                    setCurrentAgentId(parsed.model);
                                }
                                
                                // Обработка обычного контента
                                let snapshotContent = '';
                                if (parsed.snapshot?.choices?.[0]?.message?.content) {
                                    snapshotContent = parsed.snapshot.choices[0].message.content;
                                    lastSnapshotContent = snapshotContent;
                                }

                                // Обрабатываем delta content если есть
                                if (parsed.choices?.[0]?.delta?.content) {
                                    const deltaContent = parsed.choices[0].delta.content;
                                    fullResponse += deltaContent;
                                }

                                // Всегда пытаемся парсить snapshot если он есть
                                if (snapshotContent) {
                                    const parseResult = parseMessage(snapshotContent);
                                    let contentToShow = '';
                                    
                                    // Проверяем, есть ли Executive Summary в основном тексте
                                    if (parseResult.mainText.includes('### Executive Summary')) {
                                        savedReportContentRef.current = parseResult.mainText;
                                    }
                                    
                                    // Если есть сохраненный контент с Executive Summary, используем его
                                    if (savedReportContentRef.current && !parseResult.mainText.includes('### Executive Summary')) {
                                        contentToShow = savedReportContentRef.current;
                                    } else {
                                        contentToShow = parseResult.mainText;
                                    }
                                    
                                    if (parseResult.spoilerText) {
                                        contentToShow = `~~{${parseResult.spoilerTitle || 'Мысли'}}~~\n${parseResult.spoilerText}\n\n${contentToShow}`;
                                    }
                                    
                                    if (contentToShow && contentToShow.length > 0) {
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
                                            
                                            console.log('📝 Updating last answer message', targetMessage.id, 'with', contentToShow.length, 'chars');
                                            console.log('🔄 Content change details:', {
                                                messageId: targetMessage.id,
                                                oldContentLength: targetMessage.content.length,
                                                newContentLength: contentToShow.length,
                                                oldContentPreview: targetMessage.content.substring(0, 100),
                                                newContentPreview: contentToShow.substring(0, 100),
                                                botMessageId: botMessageId
                                            });
                                            
                                            return prev.map(chat => 
                                                chat.id === currentChat?.id 
                                                    ? {
                                                        ...chat, 
                                                        messages: chat.messages.map(msg => 
                                                            msg.id === targetMessage.id 
                                                                ? { ...msg, content: contentToShow }
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
                                    console.log('🔧 Tool call received:', toolCall?.function?.name);
                                    
                                    if (toolCall?.function?.name === 'createreporttool') {
                                        // НЕ создаем отдельное сообщение для отчетов - парсер сам обработает их
                                        console.log('📋 Report tool call received, will be handled by parser');
                                    } else if (toolCall?.function?.name === 'agentcompletiontool') {
                                        try {
                                            const args = JSON.parse(toolCall.function.arguments);
                                            const completionReasoning = args.reasoning || '';
                                            console.log('✅ Task completion received (streaming):', completionReasoning);
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
                                        console.log(`🏁 Using final content: ${fullResponse.length} chars`);
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
                                                                ? { ...msg, content: fullResponse }
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
                // Финальная обработка JSON после завершения стрима
                let finalContentForParsing = fullResponse;
                
                // Для createreporttool всегда используем lastSnapshotContent (JSON), а не fullResponse (результаты поиска)
                if (lastSnapshotContent && lastSnapshotContent.startsWith('{')) {
                    finalContentForParsing = lastSnapshotContent;
                } else if (lastSnapshotContent && lastSnapshotContent.length > fullResponse.length) {
                    finalContentForParsing = lastSnapshotContent;
                }
                
                // Парсер сам извлекает questions из JSON
                const finalParseResult = parseMessage(finalContentForParsing);
                
                // Проверяем, есть ли Executive Summary в финальном результате
                if (finalParseResult.mainText.includes('### Executive Summary')) {
                    savedReportContentRef.current = finalParseResult.mainText;
                }
                
                // Если есть сохраненный контент с Executive Summary, используем его
                let finalMainText = finalParseResult.mainText;
                if (savedReportContentRef.current && !finalParseResult.mainText.includes('### Executive Summary')) {
                    finalMainText = savedReportContentRef.current;
                }
                
                if (finalParseResult.spoilerText) {
                    const finalFormattedContent = `~~{${finalParseResult.spoilerTitle || 'Мысли'}}~~\n${finalParseResult.spoilerText}\n\n${finalMainText}`;
                    
                    setChatHistory(prev => {
                        const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
                        if (!currentChatInState) return prev;
                        
                        const answerMessages = currentChatInState.messages.filter(msg => msg.type === 'answer');
                        const targetMessage = answerMessages[answerMessages.length - 1];
                        
                        if (!targetMessage) return prev;
                        
                        return prev.map(chat => 
                            chat.id === currentChat?.id 
                                ? {
                                    ...chat, 
                                    messages: chat.messages.map(msg => 
                                        msg.id === targetMessage.id 
                                            ? { ...msg, content: finalFormattedContent }
                                            : msg
                                    )
                                }
                                : chat
                        );
                    });
                } else {
                    setChatHistory(prev => {
                        const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
                        if (!currentChatInState) return prev;
                        
                        const answerMessages = currentChatInState.messages.filter(msg => msg.type === 'answer');
                        const targetMessage = answerMessages[answerMessages.length - 1];
                        
                        if (!targetMessage) return prev;
                        
                        return prev.map(chat => 
                            chat.id === currentChat?.id 
                                ? {
                                    ...chat, 
                                    messages: chat.messages.map(msg => 
                                        msg.id === targetMessage.id 
                                            ? { ...msg, content: finalMainText }
                                            : msg
                                    )
                                }
                                : chat
                        );
                    });
                }
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
                                    />
                                );
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