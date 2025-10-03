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
    model_selection: "Model:",
    create_chat_with_model: "Create chat with model",
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
    thoughts: "Thoughts",
    
    // Tooltips
    hide_history_panel: "Hide history panel",
    show_history_panel: "Show history panel",
    switch_to_russian: "Switch to Russian",
    switch_to_english: "Switch to English",
    light_theme: "Light theme",
    dark_theme: "Dark theme",
    cancel: "Cancel",
    rename_chat: "Rename chat",
    close: "Close",
    rename_chat_title: "Rename chat",
    enter_new_name: "Enter new name",
    cancel_btn: "Cancel",
    save_btn: "Save",
    
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
    model_selection: "Модель:",
    create_chat_with_model: "Создать чат с моделью",
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
    thoughts: "Мысли",
    
    // Tooltips
    hide_history_panel: "Скрыть панель истории",
    show_history_panel: "Показать панель истории",
    switch_to_russian: "Переключить на русский",
    switch_to_english: "Переключить на английский",
    light_theme: "Светлая тема",
    dark_theme: "Темная тема",
    cancel: "Отменить",
    rename_chat: "Переименовать чат",
    close: "Закрыть",
    rename_chat_title: "Переименовать чат",
    enter_new_name: "Введите новое название",
    cancel_btn: "Отмена",
    save_btn: "Сохранить",
    
    // Time
    just_now: "Только что",
    today: "Сегодня",
    yesterday: "Вчера",
    days_ago: "дней назад"
  },
};


type ChatItem = {
  id: number;
  title: string;
  timestamp: string;
  preview: string;
  messages: Array<{id: number, type: 'question' | 'answer', content: string, timestamp: string}>;
};

function App() {
  const [current_lng, setCurrentLng] = useState<Locale>("ru");
  const [currentChatId, setCurrentChatId] = useState<number | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState<boolean>(true);
  const [chatHistory, setChatHistory] = useState<ChatItem[]>([]);
  const [availableModels, setAvailableModels] = useState<any[]>([]);
  const [showModelButtons, setShowModelButtons] = useState<boolean>(false);
  const [editingChatId, setEditingChatId] = useState<number | null>(null);
  const [newChatTitle, setNewChatTitle] = useState<string>('');

  const applyTheme = (theme: string) => {
    let themeElement = document.getElementById('theme') as HTMLLinkElement;
    if (!themeElement) {
      themeElement = document.createElement('link');
      themeElement.id = 'theme';
      themeElement.rel = 'stylesheet';
      document.head.appendChild(themeElement);
    }
    themeElement.href = theme;
  };

  const addNewChat = async () => {
    try {
      const response = await fetch('/v1/models');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const models = await response.json();
      
      // Сохраняем модели и показываем кнопки выбора
      setAvailableModels(models.data || []);
      setShowModelButtons(true);
      
    } catch (error) {
      console.error('❌ Error fetching models:', error);
      
      // Создаем новый чат с моделью по умолчанию если запрос не удался
      createNewChatWithModel('sgr_agent');
    }
  };

  const createNewChatWithModel = (modelId: string) => {
    // modelId используется для создания чата с определенной моделью
    // В будущем можно добавить сохранение модели в объект чата
    const newId = Math.max(...chatHistory.map(item => item.id), 0) + 1;
    const currentTime = new Date().toLocaleTimeString(current_lng === 'ru' ? 'ru-RU' : 'en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const newChat: ChatItem = {
      id: newId,
      title: `${t('new_chat')} ${newId}`,
      timestamp: currentTime,
      preview: t('start_new_conversation'),
      messages: []
    };
    setChatHistory([newChat, ...chatHistory]);
    setCurrentChatId(newId);
    setShowModelButtons(false);
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

  const startEditingChat = (chatId: number, event: React.MouseEvent) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setEditingChatId(chatId);
      setNewChatTitle(chat.title);
      
      // Получаем координаты кнопки для позиционирования модального окна
      const rect = event.currentTarget.getBoundingClientRect();
      const modalWidth = 300; // Ширина модального окна
      
      // Позиционируем правый верхний угол модального окна в координатах курсора
      let modalX = rect.right - modalWidth;
      let modalY = rect.top;
      
      // Проверяем, чтобы модальное окно не выходило за границы экрана
      if (modalX < 10) {
        modalX = 10; // Минимальный отступ от левого края
      }
      if (modalY < 10) {
        modalY = 10; // Минимальный отступ от верхнего края
      }
      
      // Устанавливаем позицию модального окна через CSS переменные
      document.documentElement.style.setProperty('--modal-x', `${modalX}px`);
      document.documentElement.style.setProperty('--modal-y', `${modalY}px`);
    }
  };

  const saveChatTitle = () => {
    if (editingChatId && newChatTitle.trim()) {
      setChatHistory(chatHistory.map(chat => 
        chat.id === editingChatId 
          ? { ...chat, title: newChatTitle.trim() }
          : chat
      ));
      setEditingChatId(null);
      setNewChatTitle('');
    }
  };

  const cancelEditing = () => {
    setEditingChatId(null);
    setNewChatTitle('');
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
        onToggleLanguage={toggleLanguage}
        currentLanguage={current_lng}
        onToggleSidebar={toggleSidebar}
        sidebarVisible={sidebarVisible}
        t={t}
      />
      <HistoryTab
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onAddChat={addNewChat}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onEditChat={startEditingChat}
        t={t}
        visible={sidebarVisible}
        searchPlaceholder={t("chat_search")}
        availableModels={availableModels}
        showModelButtons={showModelButtons}
        onCreateChatWithModel={createNewChatWithModel}
        onHideModelButtons={() => setShowModelButtons(false)}
        editingChatId={editingChatId}
        newChatTitle={newChatTitle}
        onTitleChange={setNewChatTitle}
        onSaveTitle={saveChatTitle}
        onCancelEditing={cancelEditing}
      />
      <Chat
        currentChat={currentChat}
        onSendMessage={(message: string) => {
          if (currentChat) {
            const newMessage = {
              id: currentChat.messages.length + 1,
              type: 'question' as const,
              content: message,
              timestamp: new Date().toLocaleTimeString(current_lng === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })
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
        currentModel={currentChat?.title?.match(/\(([^)]+)\)$/)?.[1] || 'sgr_agent'}
        currentLanguage={current_lng}
      />
    </div>
  )
}

export default App
