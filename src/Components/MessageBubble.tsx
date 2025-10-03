import React, { useState } from 'react';
import LoadingDots from './LoadingDots';

type MessageBubbleProps = {
  message: string;
  timestamp: string;
  type: 'user' | 'assistant';
  className?: string;
  spoilerText?: string;
  spoilerTitle?: string;
  t?: (key: string) => string;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  timestamp, 
  type, 
  className = '',
  spoilerText,
  spoilerTitle,
  t
}) => {
  // Используем перевод для заголовка спойлера, если функция перевода доступна
  const defaultSpoilerTitle = t ? t('thoughts') : 'Мысли';
  const finalSpoilerTitle = spoilerTitle || defaultSpoilerTitle;
  const [isSpoilerOpen, setIsSpoilerOpen] = useState(false);

  const renderContent = () => {
    // Если основной текст пустой, показываем точки загрузки
    const isEmptyMessage = !message || message.trim() === '';
    
    if (!spoilerText) {
      return (
        <div className="message-bubble-text">
          {isEmptyMessage ? <LoadingDots /> : <div dangerouslySetInnerHTML={{ __html: message }} />}
        </div>
      );
    }

    return (
      <div className="message-bubble-with-spoiler">
        <div className="message-bubble-spoiler">
          <details 
            open={isSpoilerOpen}
            onToggle={(e) => setIsSpoilerOpen((e.target as HTMLDetailsElement).open)}
          >
            <summary className="message-bubble-spoiler-summary">
              {finalSpoilerTitle}
            </summary>
            <div className="message-bubble-spoiler-content">
              <div 
                className="message-bubble-text" 
                dangerouslySetInnerHTML={{ __html: spoilerText }}
              />
            </div>
          </details>
        </div>
        <div className="message-bubble-text">
          {isEmptyMessage ? <LoadingDots /> : <div dangerouslySetInnerHTML={{ __html: message }} />}
        </div>
      </div>
    );
  };

  return (
    <div className={`message-bubble ${type} ${className}`}>
      <div className="message-bubble-content">
        {renderContent()}
        <div className="message-bubble-time">{timestamp}</div>
      </div>
    </div>
  );
};

export default MessageBubble;
