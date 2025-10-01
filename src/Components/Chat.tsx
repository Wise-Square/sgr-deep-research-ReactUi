import React, { useState, useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';


type ChatItem = {
  id: number;
  title: string;
  timestamp: string;
  preview: string;
  messages: Array<{
    id: number, 
    type: 'question' | 'answer', 
    content: string, 
    timestamp: string
  }>;
};

type ChatProps = {
  currentChat: ChatItem | undefined;
  onSendMessage: (message: string) => void;
  setChatHistory: React.Dispatch<React.SetStateAction<ChatItem[]>>;
  t: (key: string) => string;
  sidebarVisible: boolean;
};


const Chat: React.FC<ChatProps> = ({ currentChat, onSendMessage, setChatHistory, t, sidebarVisible }) => {
    const [inputMessage, setInputMessage] = useState('');
    const [currentAgentId, setCurrentAgentId] = useState<string | null>(null);
    const lastBotMessageIdRef = useRef<number | null>(null);

    // Сбрасываем agent ID при смене чата
    useEffect(() => {
        setCurrentAgentId(null);
        lastBotMessageIdRef.current = null;
        console.log('🔄 Chat changed, reset agent state');
    }, [currentChat?.id]);
    

    const sendMessage = async () => {
        if (!inputMessage.trim() || !currentChat) return;
        
        const messageToSend = inputMessage; // Сохраняем сообщение до очистки
        
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
            
            setInputMessage(''); // Очищаем поле ввода
            
            
            // Вызываем функцию отправки сообщения ПЕРЕД getMessage
            await onSendMessage(messageToSend);
            
            const botMessageId = Date.now() + 1; // Создаем ID для ответа бота
            lastBotMessageIdRef.current = botMessageId; // Сохраняем ID в ref
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
        }

        setChatHistory(prev => {
            // Находим актуальный чат в состоянии
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
        console.log('🚀 Sending request with model:', modelToUse);
        
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
            throw new Error(`HTTP error! status: ${request.status}`);
        }
       console.log('🚀 Request sent:', request);
        const reader = request.body?.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';

        if (reader) {
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
                                console.log('🆔 Agent ID received:', parsed.model);
                                setCurrentAgentId(parsed.model);
                            }
                            
                            // Обработка обычного контента
                            if (parsed.choices?.[0]?.delta?.content) {
                                const deltaContent = parsed.choices[0].delta.content;
                                
                                // Фильтруем системные данные - показываем только читаемый текст
                                if (!deltaContent.includes('{') && 
                                    !deltaContent.includes('tool_name_discriminator') &&
                                    !deltaContent.includes('"tool_name_discriminator"') &&
                                    deltaContent.trim().length > 0) {
                                    
                                    fullResponse += deltaContent;
                                    console.log(`📝 Updated content: ${fullResponse.length} chars`);
                                    
                                    // Обновляем сообщение с накопленным содержимым
                                    setChatHistory(prev => {
                                        const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
                                        if (!currentChatInState) {
                                            console.error('Chat not found when updating content');
                                            return prev;
                                        }
                                        
                                        // Ищем последнее сообщение типа 'answer' (более надежно чем по ID)
                                        const answerMessages = currentChatInState.messages.filter(msg => msg.type === 'answer');
                                        const targetMessage = answerMessages[answerMessages.length - 1];
                                        
                                        if (!targetMessage) {
                                            console.error('No answer message found. Available messages:', currentChatInState.messages.map(m => ({ id: m.id, type: m.type })));
                                            return prev;
                                        }
                                        
                                        console.log('📝 Updating last answer message', targetMessage.id, 'with', fullResponse.length, 'chars');
                                        
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
                            
                            // НОВОЕ: Обработка tool_calls
                            if (parsed.choices?.[0]?.delta?.tool_calls) {
                                const toolCall = parsed.choices[0].delta.tool_calls[0];
                                console.log('🔧 Tool call received:', toolCall?.function?.name);
                                
                                if (toolCall?.function?.name === 'createreporttool') {
                                    // Создаем отдельное сообщение для отчета
                                    try {
                                        const args = JSON.parse(toolCall.function.arguments);
                                        const reportContent = args.content || '';
                                        
                                        if (reportContent && reportContent.trim()) {
                                            console.log('📋 Creating separate report message:', reportContent.length, 'chars');
                                            console.log('📋 Report content preview:', reportContent.substring(0, 200) + '...');
                                            
                                            const reportMessage = {
                                                id: Date.now() + 3,
                                                type: 'answer' as const,
                                                content: reportContent,
                                                timestamp: new Date().toLocaleTimeString()
                                            };
                                            
                                            setChatHistory(prev => {
                                                const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
                                                if (!currentChatInState) {
                                                    console.error('Chat not found when creating report message');
                                                    return prev;
                                                }
                                                
                                                console.log('📋 Adding report message to chat with', currentChatInState.messages.length, 'existing messages');
                                                
                                                return prev.map(chat => 
                                                    chat.id === currentChat?.id 
                                                        ? { ...chat, messages: [...chat.messages, reportMessage] }
                                                        : chat
                                                );
                                            });
                                        }
                                    } catch (error) {
                                        console.error('❌ Error parsing report content:', error);
                                    }
                                } else if (toolCall?.function?.name === 'agentcompletiontool') {
                                    // Логируем завершение задачи
                                    try {
                                        const args = JSON.parse(toolCall.function.arguments);
                                        const completionReasoning = args.reasoning || '';
                                        console.log('✅ Task completion received (streaming):', completionReasoning);
                                        console.log('✅ NOT overwriting report content - keeping separate messages');
                                    } catch (error) {
                                        console.error('❌ Error parsing completion data:', error);
                                    }
                                } else {
                                    // Для других tool calls просто логируем
                                    console.log('🔧 Other tool call:', toolCall?.function?.name, '- content will be added to current message');
                                }
                            }
                            
                            // Обрабатываем финальный ответ (когда finish_reason = "stop")
                            if (parsed.choices?.[0]?.message?.content) {
                                const finalContent = parsed.choices[0].message.content;
                                
                                // Если у нас еще нет содержимого, используем финальный ответ
                                if (!fullResponse.trim()) {
                                    fullResponse = finalContent;
                                    console.log(`🏁 Using final content: ${fullResponse.length} chars`);
                                    setChatHistory(prev => {
                                        const currentChatInState = prev.find(chat => chat.id === currentChat?.id);
                                        if (!currentChatInState) {
                                            console.error('Chat not found when setting final content');
                                            return prev;
                                        }
                                        
                                        // Ищем последнее сообщение типа 'answer' (более надежно чем по ID)
                                        const answerMessages = currentChatInState.messages.filter(msg => msg.type === 'answer');
                                        const targetMessage = answerMessages[answerMessages.length - 1];
                                        
                                        if (!targetMessage) {
                                            console.error('No answer message found for final content. Available messages:', currentChatInState.messages.map(m => ({ id: m.id, type: m.type })));
                                            return prev;
                                        }
                                        
                                        console.log('🏁 Setting final content for last answer message', targetMessage.id, 'with', fullResponse.length, 'chars');
                                        
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
                            
                            // НОВОЕ: Обработка финального контента из tool_calls (в delta)
                            if (parsed.choices?.[0]?.delta?.tool_calls) {
                                const toolCalls = parsed.choices[0].delta.tool_calls;
                                
                                for (const toolCall of toolCalls) {
                                    if (toolCall.function?.name === 'agentcompletiontool') {
                                        // Только логируем завершение, не перезаписываем контент
                                        try {
                                            const args = JSON.parse(toolCall.function.arguments);
                                            const completionReasoning = args.reasoning || '';
                                            console.log('✅ Task completion received from delta:', completionReasoning);
                                        console.log('✅ NOT overwriting report content - keeping separate messages');
                                        } catch (error) {
                                            console.error('❌ Error parsing completion data:', error);
                                        }
                                    }
                                }
                            }
                            
                            // НОВОЕ: Обработка финального контента из message.tool_calls (финальный ответ)
                            if (parsed.choices?.[0]?.message?.tool_calls) {
                                const toolCalls = parsed.choices[0].message.tool_calls;
                                console.log('🔧 Final message tool calls received:', toolCalls.length);
                                
                                for (const toolCall of toolCalls) {
                                    if (toolCall.function?.name === 'agentcompletiontool') {
                                        // Только логируем завершение, не перезаписываем контент
                                        try {
                                            const args = JSON.parse(toolCall.function.arguments);
                                            const completionReasoning = args.reasoning || '';
                                            console.log('✅ Task completion received from message:', completionReasoning);
                                            console.log('✅ NOT overwriting report content - keeping separate messages');
                                        } catch (error) {
                                            console.error('❌ Error parsing completion data:', error);
                                        }
                                    }
                                }
                            }
                        } catch (e) {
                            // Игнорируем ошибки парсинга
                        }
                    }
                }
            }
        }
        
        console.log(`🎯 Final result: ${fullResponse.length} chars`);
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
                    <h2 className="chat-title">{currentChat ? currentChat.title : t('select_chat')}</h2>
                </div>
                
                <div className="chat-messages">
                    {!currentChat ? (
                        <div className="empty-chat">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="empty-icon">
                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                            </svg>
                            <p className="empty-text">{t('select_chat_or_create')}</p>
                        </div>
                    ) : currentChat.messages.length === 0 ? (
                        <div className="empty-chat">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="empty-icon">
                                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                            </svg>
                            <p className="empty-text">{t('start_new_conversation')}</p>
                            <p className="empty-subtext">{t('enter_message_below')}</p>
                        </div>
                    ) : (
                        <>
                            {/* Отображаем сообщения из currentChat */}
                            {currentChat.messages.map((message) => (
                                <MessageBubble
                                    key={message.id}
                                    message={message.content}
                                    timestamp={message.timestamp}
                                    type={message.type === 'question' ? 'user' : 'assistant'}
                                />
                            ))}
                            
                        </>
                    )}
                </div>
            </div>
            
            <div className={`chat-input-section ${!sidebarVisible ? 'expanded' : ''}`}>
                <div className="input-group modern-chat-input">
                    <input
                        type="text"
                        className="form-control chat-input"
                        placeholder={
                            currentChat 
                                ? t('enter_message') 
                                : t('select_chat_or_create')
                        }
                        aria-label="Chat input"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button
                        className="btn btn-primary send-button"
                        type="button"
                        onClick={sendMessage}
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