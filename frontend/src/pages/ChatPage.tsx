import { useState, useEffect, useRef } from 'react';
import { Send, LogOut, User, Bell, X, Plus, Moon, Sun, Edit2, Check, X as XIcon, MessageSquare, MoreVertical, ChevronDown } from 'lucide-react';
import { sendChatMessage, logout, getProfile, getNotifications } from '../services/api';
import { ChatMessage } from '../services/api';
import { useTheme } from '../contexts/ThemeContext';
import LogoutModal from '../components/LogoutModal';
import ChatContextMenu from '../components/ChatContextMenu';
import RenameChatModal from '../components/RenameChatModal';
import DeleteChatModal from '../components/DeleteChatModal';
import './ChatPage.css';

interface Chat {
  id: string;
  title: string;
  messages: ChatMessage[];
  threadId: string;
  createdAt: Date;
}

interface ChatPageProps {
  setIsAuthenticated: (value: boolean) => void;
}

const ChatPage = ({ setIsAuthenticated }: ChatPageProps) => {
  const { theme, toggleTheme } = useTheme();
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string; picture?: string } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editInput, setEditInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<Array<{ id: string; summary: string; start: string; meetingLink?: string }>>([]);
  const [contextMenu, setContextMenu] = useState<{ chatId: string; x: number; y: number } | null>(null);
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const currentChat = chats.find(c => c.id === currentChatId);

  // Load chats from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem('assistly-chats');
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        const chatsWithDates = parsed.map((chat: any) => ({
          ...chat,
          createdAt: new Date(chat.createdAt),
        }));
        setChats(chatsWithDates);
        if (chatsWithDates.length > 0 && !currentChatId) {
          setCurrentChatId(chatsWithDates[0].id);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
      }
    }
  }, []);

  // Save chats to localStorage whenever they change
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('assistly-chats', JSON.stringify(chats));
    }
  }, [chats]);

  useEffect(() => {
    getProfile()
      .then((data) => {
        if (data.success && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
      });

    checkMeetingNotifications();
    const notificationInterval = setInterval(checkMeetingNotifications, 60000);

    return () => clearInterval(notificationInterval);
  }, [setIsAuthenticated]);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages]);

  // Check if user can scroll down
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const threshold = 100; // Show button if more than 100px from bottom
      const isScrolledToBottom = 
        container.scrollHeight - container.scrollTop - container.clientHeight < threshold;
      const hasScrollableContent = container.scrollHeight > container.clientHeight;
      setShowScrollButton(!isScrolledToBottom && hasScrollableContent);
    };

    // Use setTimeout to ensure DOM is updated
    const timeoutId = setTimeout(checkScroll, 100);
    
    container.addEventListener('scroll', checkScroll);
    checkScroll(); // Initial check

    // Also check when messages change
    const observer = new MutationObserver(checkScroll);
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      clearTimeout(timeoutId);
      container.removeEventListener('scroll', checkScroll);
      observer.disconnect();
    };
  }, [currentChat?.messages, loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkMeetingNotifications = async () => {
    try {
      const response = await getNotifications();
      if (response.success && response.meetings.length > 0) {
        setNotifications(response.meetings);
      }
    } catch (error) {
      console.error('Error checking notifications:', error);
    }
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      threadId: `thread-${Date.now()}`, // Unique threadId for each chat for memory
      createdAt: new Date(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
  };

  const handleDeleteChat = (chatId: string) => {
    setDeleteChatId(chatId);
    setContextMenu(null);
  };

  const confirmDeleteChat = () => {
    if (!deleteChatId) return;

    setChats(prev => {
      const filtered = prev.filter(c => c.id !== deleteChatId);
      if (filtered.length === 0) {
        // If no chats left, create a new one
        const newChat: Chat = {
          id: Date.now().toString(),
          title: 'New Chat',
          messages: [],
          threadId: `thread-${Date.now()}`,
          createdAt: new Date(),
        };
        setCurrentChatId(newChat.id);
        setDeleteChatId(null);
        return [newChat];
      }
      // If deleted chat was current, switch to first available
      if (currentChatId === deleteChatId) {
        setCurrentChatId(filtered[0].id);
      }
      setDeleteChatId(null);
      return filtered;
    });
  };

  const handleRenameChat = (chatId: string, newName: string) => {
    setChats(prev => prev.map(c => 
      c.id === chatId ? { ...c, title: newName } : c
    ));
    setRenameChatId(null);
  };

  const handleChatContextMenu = (e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      chatId,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleSend = async (messageText?: string, editIndex?: number) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const chat = currentChat || chats.find(c => c.id === currentChatId);
    if (!chat) {
      createNewChat();
      return;
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    let updatedMessages: ChatMessage[];
    if (editIndex !== undefined && editIndex !== null) {
      // Edit mode: replace messages from editIndex onwards
      updatedMessages = [...chat.messages.slice(0, editIndex), userMessage];
      setEditingMessageIndex(null);
      setEditInput('');
    } else {
      updatedMessages = [...chat.messages, userMessage];
    }

    const updatedChat = {
      ...chat,
      messages: updatedMessages,
      title: chat.title === 'New Chat' && chat.messages.length === 0 
        ? textToSend.substring(0, 50) 
        : chat.title,
    };

    setChats(prev => prev.map(c => c.id === chat.id ? updatedChat : c));
    setInput('');
    setLoading(true);

    try {
      const response = await sendChatMessage(textToSend, chat.threadId);
      
      if (response.success) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
        };
        
        const finalChat = {
          ...updatedChat,
          messages: [...updatedMessages, assistantMessage],
          threadId: response.threadId || chat.threadId,
        };
        
        setChats(prev => prev.map(c => c.id === chat.id ? finalChat : c));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setChats(prev => prev.map(c => 
        c.id === chat.id 
          ? { ...c, messages: [...updatedMessages, errorMessage] }
          : c
      ));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index: number) => {
    const message = currentChat?.messages[index];
    if (message && message.role === 'user') {
      setEditingMessageIndex(index);
      setEditInput(message.content);
    }
  };

  const handleSaveEdit = () => {
    if (editingMessageIndex !== null) {
      handleSend(editInput, editingMessageIndex);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageIndex(null);
    setEditInput('');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageIndex !== null) {
        handleSaveEdit();
      } else {
        handleSend();
      }
    }
  };

  useEffect(() => {
    // Initialize with a new chat if none exist
    const savedChats = localStorage.getItem('assistly-chats');
    if (!savedChats && chats.length === 0) {
      createNewChat();
    }
  }, []);

  return (
    <div className="chat-page" data-theme={theme}>
      <div className="sidebar">
        <div className="sidebar-header">
          <button className="btn-new-chat" onClick={createNewChat}>
            <Plus size={20} />
            <span>New chat</span>
          </button>
        </div>
        <div className="sidebar-chats">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item-wrapper ${currentChatId === chat.id ? 'active' : ''}`}
            >
              <button
                className="chat-item"
                onClick={() => {
                  setCurrentChatId(chat.id);
                  setContextMenu(null);
                }}
              >
                <MessageSquare size={16} />
                <span className="chat-title">{chat.title}</span>
              </button>
              <button
                className="chat-item-menu"
                onClick={(e) => handleChatContextMenu(e, chat.id)}
                title="More options"
              >
                <MoreVertical size={16} />
              </button>
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          {user && (
            <div className="user-profile">
              {user.picture ? (
                <img src={user.picture} alt={user.name} className="user-avatar" />
              ) : (
                <div className="user-avatar-placeholder">
                  <User size={16} />
                </div>
              )}
              <span className="user-name">{user.name}</span>
            </div>
          )}
          <div className="sidebar-actions">
            <button className="btn-theme-toggle" onClick={toggleTheme} title="Toggle theme">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="btn-logout" onClick={() => setShowLogoutModal(true)} title="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="chat-main">
        <header className="chat-header">
          <h1>Assistly</h1>
        </header>

        <div className="chat-container">
          {notifications.length > 0 && (
            <div className="notifications-banner">
              {notifications.map((notif) => (
                <div key={notif.id} className="notification-item">
                  <Bell size={16} />
                  <span>
                    Meeting "{notif.summary}" starts in less than 1 hour
                    {notif.meetingLink && (
                      <a href={notif.meetingLink} target="_blank" rel="noopener noreferrer" className="meeting-link">
                        Join Meeting
                      </a>
                    )}
                  </span>
                  <button
                    className="notification-close"
                    onClick={() => setNotifications(notifications.filter(n => n.id !== notif.id))}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="messages-container" ref={messagesContainerRef}>
            {(!currentChat || currentChat.messages.length === 0) && (
              <div className="welcome-message">
                <h2>Hi {user?.name || 'there'}! How can I help you today?</h2>
                <p>I can help you with:</p>
                <ul>
                  <li>📅 Schedule and manage meetings</li>
                  <li>👥 Create and manage contacts</li>
                  <li>🔍 Check your calendar</li>
                  <li>💬 Answer questions about your schedule</li>
                </ul>
                <p className="welcome-examples">
                  Try asking: "Do I have any meetings today?" or "Schedule a meeting with John tomorrow at 2 PM"
                </p>
              </div>
            )}

            {currentChat?.messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role === 'user' ? 'message-user' : 'message-assistant'}`}
              >
                {editingMessageIndex === index && message.role === 'user' ? (
                  <div className="message-edit">
                    <textarea
                      className="edit-input"
                      value={editInput}
                      onChange={(e) => setEditInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      rows={3}
                      autoFocus
                    />
                    <div className="edit-actions">
                      <button className="btn-edit-save" onClick={handleSaveEdit}>
                        <Check size={16} />
                        Save
                      </button>
                      <button className="btn-edit-cancel" onClick={handleCancelEdit}>
                        <XIcon size={16} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="message-content">
                      {message.content}
                    </div>
                    {message.role === 'user' && (
                      <button
                        className="btn-edit-message"
                        onClick={() => handleEdit(index)}
                        title="Edit message"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}

            {loading && (
              <div className="message message-assistant">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {showScrollButton && (
            <button
              className="scroll-to-bottom-btn"
              onClick={scrollToBottom}
              title="Scroll to bottom"
            >
              <ChevronDown size={20} />
            </button>
          )}

          <div className="input-container">
            <textarea
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message Assistly..."
              rows={1}
              disabled={loading || editingMessageIndex !== null}
            />
            <button
              className="send-button"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading || editingMessageIndex !== null}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </div>

      <LogoutModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        userEmail={user?.email || ''}
      />

      {contextMenu && (
        <ChatContextMenu
          isOpen={true}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRename={() => {
            setRenameChatId(contextMenu.chatId);
            setContextMenu(null);
          }}
          onDelete={() => {
            handleDeleteChat(contextMenu.chatId);
          }}
        />
      )}

      {renameChatId && (
        <RenameChatModal
          isOpen={true}
          currentName={chats.find(c => c.id === renameChatId)?.title || ''}
          onClose={() => setRenameChatId(null)}
          onSave={(newName) => handleRenameChat(renameChatId, newName)}
        />
      )}

      {deleteChatId && (
        <DeleteChatModal
          isOpen={true}
          chatTitle={chats.find(c => c.id === deleteChatId)?.title || 'this chat'}
          onClose={() => setDeleteChatId(null)}
          onConfirm={confirmDeleteChat}
        />
      )}
    </div>
  );
};

export default ChatPage;
