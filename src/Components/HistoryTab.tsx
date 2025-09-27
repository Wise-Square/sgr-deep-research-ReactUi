import React from 'react';

type ChatItem = {
  id: number;
  title: string;
  timestamp: string;
  preview: string;
  messages: Array<{id: number, type: 'question' | 'answer', content: string, timestamp: string}>;
};

type HistoryTabProps = {
  chatHistory: ChatItem[];
  currentChatId: number | null;
  onAddChat: () => void;
  onSelectChat: (chatId: number) => void;
  onDeleteChat: (chatId: number) => void;
  t: (key: string) => string;
  visible: boolean;
  searchPlaceholder: string;
};

const HistoryTab: React.FC<HistoryTabProps> = ({
  chatHistory,
  currentChatId,
  onAddChat,
  onSelectChat,
  onDeleteChat,
  t,
  visible,
  searchPlaceholder
}) => {
    return (
        <div className={`bottom-rect ${!visible ? 'hidden' : ''}`}>
            <div className="history-header">
                <div className="input-group modern-search">
                    <span className="input-group-text" id="basic-addon1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                    </span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder={searchPlaceholder}
                        aria-label="Chat History Search"
                        aria-describedby="basic-addon1"
                    />
                </div>
                <button 
                    className="btn btn-primary add-chat-btn" 
                    onClick={onAddChat}
                    title={t('new_chat')}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </button>
            </div>
            
            <div className="history-list">
                {chatHistory.map((item, index) => (
                    <div 
                        key={item.id} 
                        className={`history-item ${currentChatId === item.id ? 'active' : ''}`} 
                        style={{
                            animationDelay: `${index * 0.1}s`
                        }}
                        onClick={() => onSelectChat(item.id)}
                    >
                        <div className="history-item-content">
                            <div className="history-item-header">
                                <h4 className="history-item-title">{item.title}</h4>
                                <span className="history-item-time">{item.timestamp}</span>
                            </div>
                            <p className="history-item-preview">{item.preview}</p>
                        </div>
                        <div className="history-item-actions">
                            <button 
                                className="btn btn-sm btn-outline-danger history-action-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteChat(item.id);
                                }}
                                title={t('delete_chat')}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            {chatHistory.length === 0 && (
                <div className="empty-history">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" className="empty-icon">
                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                    </svg>
                    <p className="empty-text">{t('empty_history_title')}</p>
                    <p className="empty-subtext">{t('empty_history_subtitle')}</p>
                </div>
            )}
        </div>
    )
}

export default HistoryTab;