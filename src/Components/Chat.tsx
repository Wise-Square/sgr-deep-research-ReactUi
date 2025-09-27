import React, { useState } from 'react';

type ChatItem = {
  id: number;
  title: string;
  timestamp: string;
  preview: string;
  messages: Array<{id: number, type: 'question' | 'answer', content: string, timestamp: string}>;
};

type ChatProps = {
  currentChat: ChatItem | undefined;
  onSendMessage: (message: string) => void;
  t: (key: string) => string;
  sidebarVisible: boolean;
};

const Chat: React.FC<ChatProps> = ({ currentChat, onSendMessage, t, sidebarVisible }) => {
    const [inputMessage, setInputMessage] = useState('');

    const handleSendMessage = () => {
        if (inputMessage.trim() && currentChat) {
            onSendMessage(inputMessage.trim());
            setInputMessage('');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    // Убираем условие, которое полностью скрывает чатбокс

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
                        currentChat.messages.map((message, index) => (
                            <div key={message.id} className={`message-item ${message.type}`} style={{animationDelay: `${index * 0.1}s`}}>
                                <div className="message-header">
                                    <h4 className="message-title">
                                        {message.type === 'question' ? t('your_question') : t('ai_answer')}
                                    </h4>
                                    <span className="message-time">{message.timestamp}</span>
                                </div>
                                <div className="message-content">
                                    <p>{message.content}</p>
                                </div>
                                <div className="message-actions">
                                    <button className="btn btn-sm btn-outline-primary">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                                        </svg>
                                        {t('share')}
                                    </button>
                                    <button className="btn btn-sm btn-outline-primary">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                                        </svg>
                                        {t('like')}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
            
            <div className={`chat-input-section ${!sidebarVisible ? 'expanded' : ''}`}>
                <div className="input-group modern-chat-input">
                    <input
                        type="text"
                        className="form-control chat-input"
                        placeholder={currentChat ? t('enter_message') : t('select_chat_or_create')}
                        aria-label="Chat input"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={!currentChat}
                    />
                    <button
                        className="btn btn-primary send-button"
                        type="button"
                        onClick={handleSendMessage}
                        disabled={!inputMessage.trim() || !currentChat}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </>
    )
}

export default Chat;