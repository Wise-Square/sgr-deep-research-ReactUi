import { useState } from 'react';
import TopBar from './Components/TopBar'
import HistoryTab from './Components/HistoryTab'
import Chat from './Components/Chat'
import './Styles/Light/Default.css'

type Locale = "en" | "ru";
type Translates = Record<Locale, Record<string, string>>;
const translates: Translates = {
  en: { 
    // TopBar
    chat_search: "  search in history",
    
    // HistoryTab
    chat_history_title: "Chat History",
    new_chat: "New Chat",
    open_chat: "Open Chat",
    delete_chat: "Delete Chat",
    empty_history_title: "Chat history is empty",
    empty_history_subtitle: "Create a new chat to start communication",
    
    // Chat
    select_chat: "Select a chat",
    ready_to_work: "Ready to work",
    online: "Online",
    start_new_conversation: "Start a new conversation",
    enter_message_below: "Enter your message below",
    your_question: "Your question",
    ai_answer: "AI Answer",
    share: "Share",
    like: "Like",
    enter_message: "Enter your message...",
    select_chat_or_create: "Select a chat or create a new one...",
    
    // Time
    just_now: "Just now",
    today: "Today",
    yesterday: "Yesterday",
    days_ago: "days ago"
  },
  ru: { 
    // TopBar
    chat_search: "  найти в истории",
    
    // HistoryTab
    chat_history_title: "История чатов",
    new_chat: "Новый чат",
    open_chat: "Открыть чат",
    delete_chat: "Удалить чат",
    empty_history_title: "История чатов пуста",
    empty_history_subtitle: "Создайте новый чат, чтобы начать общение",
    
    // Chat
    select_chat: "Выберите чат",
    ready_to_work: "Готов к работе",
    online: "Онлайн",
    start_new_conversation: "Начните новый разговор",
    enter_message_below: "Введите ваше сообщение ниже",
    your_question: "Ваш вопрос",
    ai_answer: "Ответ ИИ",
    share: "Поделиться",
    like: "Нравится",
    enter_message: "Введите ваше сообщение...",
    select_chat_or_create: "Выберите чат или создайте новый...",
    
    // Time
    just_now: "Только что",
    today: "Сегодня",
    yesterday: "Вчера",
    days_ago: "дней назад"
  },
};

type Theme = "Dark" | "Light"

type ChatItem = {
  id: number;
  title: string;
  timestamp: string;
  preview: string;
  messages: Array<{id: number, type: 'question' | 'answer', content: string, timestamp: string}>;
};

function App() {
  const [current_theme, setCurrentTheme] = useState<Theme>("Light");
  const [current_lng, setCurrentLng] = useState<Locale>("ru");
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);

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

  const addNewChat = () => {
    const newId = Math.max(...chatHistory.map(item => item.id), 0) + 1;
    const newChat: ChatItem = {
      id: newId,
      title: `${t('new_chat')} ${newId}`,
      timestamp: t('just_now'),
      preview: t('start_new_conversation'),
      messages: []
    };
    setChatHistory([newChat, ...chatHistory]);
    setCurrentChatId(newId);
  };

  const selectChat = (chatId: number) => {
    setCurrentChatId(chatId);
  };

  const deleteChat = (chatId: number) => {
    setChatHistory(chatHistory.filter(item => item.id !== chatId));
    if (currentChatId === chatId) {
      setCurrentChatId(null);
    }
  };

  const currentChat = chatHistory.find(chat => chat.id === currentChatId);

  // Функция для получения перевода
  const t = (key: string) => translates[current_lng][key] || key;

  // Функция для переключения языка
  const toggleLanguage = () => {
    setCurrentLng(current_lng === "ru" ? "en" : "ru");
  };

  // Функция для переключения видимости боковой панели
  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };


  return (
    <div className={`app-container ${!sidebarVisible ? 'sidebar-hidden' : ''}`}>
      <TopBar
        setTheme={(theme: string) => applyTheme(theme)}
        current_theme={current_theme}
        onToggleLanguage={toggleLanguage}
        currentLanguage={current_lng}
        onToggleSidebar={toggleSidebar}
        sidebarVisible={sidebarVisible}
      />
      <HistoryTab
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onAddChat={addNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        t={t}
        visible={sidebarVisible}
        searchPlaceholder={t("chat_search")}
      />
      <Chat
        currentChat={currentChat}
        onSendMessage={(message: string) => {
          if (currentChat) {
            const newMessage = {
              id: currentChat.messages.length + 1,
              type: 'question' as const,
              content: message,
              timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
            };
            
            setChatHistory(chatHistory.map(chat => 
              chat.id === currentChat.id 
                ? { 
                    ...chat, 
                    messages: [...chat.messages, newMessage],
                    preview: message.length > 50 ? message.substring(0, 50) + '...' : message
                  }
                : chat
            ));
          }
        }}
        setChatHistory={setChatHistory}
        t={t}
        sidebarVisible={sidebarVisible}
      />
    </div>
  )
}

export default App
