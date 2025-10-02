import React, { useState } from 'react';

type MessageBubbleProps = {
  message: string;
  timestamp: string;
  type: 'user' | 'assistant';
  className?: string;
  spoilerText?: string;
  spoilerTitle?: string;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  timestamp, 
  type, 
  className = '',
  spoilerText,
  spoilerTitle = 'Детали'
}) => {
  const [isSpoilerOpen, setIsSpoilerOpen] = useState(false);

  const renderContent = () => {
    if (!spoilerText) {
      return (
        <div 
          className="message-bubble-text" 
          dangerouslySetInnerHTML={{ __html: message }}
        />
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
              {spoilerTitle}
            </summary>
            <div className="message-bubble-spoiler-content">
              <div 
                className="message-bubble-text" 
                dangerouslySetInnerHTML={{ __html: spoilerText }}
              />
            </div>
          </details>
        </div>
        <div 
          className="message-bubble-text" 
          dangerouslySetInnerHTML={{ __html: message }}
        />
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
