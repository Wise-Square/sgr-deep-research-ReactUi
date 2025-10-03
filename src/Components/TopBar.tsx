import React from 'react';

type TopBarProps = {
  setTheme?: (theme: string) => void;
  onToggleLanguage?: () => void;
  currentLanguage?: string;
  onToggleSidebar?: () => void;
  sidebarVisible?: boolean;
};


export const TopBar: React.FC<TopBarProps> = ({ setTheme, onToggleLanguage, currentLanguage, onToggleSidebar, sidebarVisible}) => {
  
  return (
    <div className="top-rect">
      <div className="search-section">
        <button 
          className="btn btn-outline-secondary sidebar-toggle-btn" 
          onClick={onToggleSidebar}
          title={sidebarVisible ? "Скрыть панель истории" : "Показать панель истории"}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            {sidebarVisible ? (
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            ) : (
              <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
            )}
          </svg>
        </button>
      </div>
      
      <div className="theme-controls">
        <div className="language-toggle">
          <button 
            type="button" 
            className="btn btn-outline-secondary language-btn" 
            onClick={onToggleLanguage}
            title={currentLanguage === "ru" ? "Switch to English" : "Переключить на русский"}
          >
            <span className="language-text">{currentLanguage === "ru" ? "EN" : "RU"}</span>
          </button>
        </div>
        
        <div className="theme-toggle">
          <button 
            type="button" 
            className="btn btn-outline-primary theme-btn" 
            onClick={() => setTheme?.("/src/Styles/Light/Default.css")}
            title="Светлая тема"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z"/>
            </svg>
          </button>
          <button 
            type="button" 
            className="btn btn-outline-primary theme-btn" 
            onClick={() => setTheme?.("/src/Styles/Dark/Default.css")}
            title="Темная тема"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TopBar;


