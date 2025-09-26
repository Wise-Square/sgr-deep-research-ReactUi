import { useState, useEffect } from 'react';
import TopBar from './Components/TopBar'
import HistoryTab from './Components/HistoryTab'
import Chat from './Components/Chat'
import './Styles/Light/Default.css'


type Locale = "en" | "ru";
type Translates = Record<Locale, Record<string, string>>;
const translates: Translates = {
  en: { chat_search: "  search in history", two: "two" },
  ru: { chat_search: "  найти в истории", two: "два" },
};
const current_lng: Locale = "ru"

type Theme = "Dark" | "Light"

function App() {
  const [current_theme, setCurrentTheme] = useState<Theme>("Light");

  const applyTheme = (theme: string) => {
    const themeType = theme.includes('/Light/') ? 'Light' : 'Dark';
    setCurrentTheme(themeType);
    
    let themeElement = document.getElementById('theme') as HTMLLinkElement;
    if (!themeElement) {
      themeElement = document.createElement('link');
      themeElement.id = 'theme';
      themeElement.rel = 'stylesheet';
      document.head.appendChild(themeElement);
    }
    themeElement.href = theme;
  };

  return (
    <>
      <TopBar
        placeholder={translates[current_lng]["chat_search"]}
        setTheme={(theme: string) => applyTheme(theme)}
        current_theme={current_theme}
      />
      <HistoryTab
      
      />
      <Chat
      
      />
    </>
  )
}

export default App
