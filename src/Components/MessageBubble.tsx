import React from 'react';

type MessageBubbleProps = {
  message: string;
  timestamp: string;
  type: 'user' | 'assistant';
  className?: string;
};

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  timestamp, 
  type, 
  className = '' 
}) => {
  return (
    <div className={`message-bubble ${type} ${className}`}>
      <div className="message-bubble-content">
        <p className="message-bubble-text">{message}</p>
        <div className="message-bubble-time">{timestamp}</div>
      </div>
    </div>
  );
};

export default MessageBubble;
