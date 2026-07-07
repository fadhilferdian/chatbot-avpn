const API_URL = 'http://localhost:3000';

// DOM Elements
const form = document.getElementById('chat-form');
const input = document.getElementById('user-input');
const chatBox = document.getElementById('chat-box');
const sessionsList = document.getElementById('sessions-list');
const newChatBtn = document.getElementById('new-chat-btn');
const activeChatTitle = document.getElementById('active-chat-title');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const sidebar = document.getElementById('sidebar');

// App State
let sessions = [];
let activeSessionId = null;
let isGenerating = false;

// Local Storage Keys
const SESSIONS_KEY = 'faidah_chat_sessions';
const ACTIVE_SESSION_ID_KEY = 'faidah_active_session_id';

// Initialize App
function init() {
  loadFromStorage();
  
  if (sessions.length === 0) {
    createNewSession();
  } else {
    // If active session ID is missing or doesn't exist, select the first session
    if (!activeSessionId || !sessions.find(s => s.id === activeSessionId)) {
      activeSessionId = sessions[0].id;
      localStorage.setItem(ACTIVE_SESSION_ID_KEY, activeSessionId);
    }
    renderSidebar();
    renderActiveSession();
  }

  // Event Listeners
  form.addEventListener('submit', handleFormSubmit);
  
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      createNewSession();
      // On mobile, close sidebar after starting a new chat
      sidebar.classList.remove('open');
    });
  }

  if (toggleSidebarBtn) {
    toggleSidebarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('open');
    });
  }

  // Close sidebar on mobile when clicking outside
  document.addEventListener('click', (e) => {
    if (sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== toggleSidebarBtn) {
      sidebar.classList.remove('open');
    }
  });
}

// Load Data from Local Storage
function loadFromStorage() {
  try {
    const storedSessions = localStorage.getItem(SESSIONS_KEY);
    sessions = storedSessions ? JSON.parse(storedSessions) : [];
    activeSessionId = localStorage.getItem(ACTIVE_SESSION_ID_KEY);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    sessions = [];
    activeSessionId = null;
  }
}

// Save Data to Local Storage
function saveToStorage() {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    localStorage.setItem(ACTIVE_SESSION_ID_KEY, activeSessionId);
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Create a New Chat Session
function createNewSession() {
  const newSession = {
    id: 'session_' + Date.now(),
    title: 'Percakapan Baru',
    messages: [],
    createdAt: Date.now()
  };

  sessions.unshift(newSession);
  activeSessionId = newSession.id;
  saveToStorage();
  
  renderSidebar();
  renderActiveSession();
  input.focus();
}

// Switch Chat Session
function switchSession(id) {
  if (isGenerating) return; // Prevent switching while generating response
  activeSessionId = id;
  saveToStorage();
  renderSidebar();
  renderActiveSession();
  input.focus();
}

// Delete Chat Session
function deleteSession(id, event) {
  event.stopPropagation(); // Prevent trigger session switch
  
  if (isGenerating) return;

  const confirmDelete = confirm('Apakah Anda yakin ingin menghapus percakapan ini?');
  if (!confirmDelete) return;

  const index = sessions.findIndex(s => s.id === id);
  if (index === -1) return;

  sessions.splice(index, 1);

  if (activeSessionId === id) {
    if (sessions.length > 0) {
      activeSessionId = sessions[0].id;
    } else {
      createNewSession();
      return; // createNewSession handles save and render
    }
  }

  saveToStorage();
  renderSidebar();
  renderActiveSession();
}

// Render the Sidebar Sessions List
function renderSidebar() {
  sessionsList.innerHTML = '';
  
  sessions.forEach(session => {
    const item = document.createElement('div');
    item.classList.add('session-item');
    if (session.id === activeSessionId) {
      item.classList.add('active');
    }
    
    item.addEventListener('click', () => {
      switchSession(session.id);
      sidebar.classList.remove('open'); // Close on mobile after selection
    });

    const titleWrapper = document.createElement('div');
    titleWrapper.classList.add('session-title-wrapper');

    const icon = document.createElement('span');
    icon.classList.add('session-icon');
    icon.textContent = '💬';

    const title = document.createElement('span');
    title.classList.add('session-title');
    title.textContent = session.title;

    titleWrapper.appendChild(icon);
    titleWrapper.appendChild(title);

    const deleteBtn = document.createElement('button');
    deleteBtn.classList.add('btn-delete-session');
    deleteBtn.innerHTML = '&times;';
    deleteBtn.title = 'Hapus Percakapan';
    deleteBtn.addEventListener('click', (e) => deleteSession(session.id, e));

    item.appendChild(titleWrapper);
    item.appendChild(deleteBtn);
    sessionsList.appendChild(item);
  });
}

// Render Messages for Active Session
function renderActiveSession() {
  chatBox.innerHTML = '';
  
  const activeSession = sessions.find(s => s.id === activeSessionId);
  if (!activeSession) return;

  activeChatTitle.textContent = activeSession.title;

  if (activeSession.messages.length === 0) {
    // Show Welcome Screen
    const welcome = document.createElement('div');
    welcome.classList.add('welcome-screen');
    welcome.innerHTML = `
      <div class="welcome-icon">✨</div>
      <h2>Ahlan wa Sahlan!</h2>
      <p>Saya adalah <strong>Faidah Arabic Bot</strong>. Silakan tanyakan apa saja seputar program kursus belajar bahasa Arab di Faidah Arabic Course. Mari mulai perjalanan mulia tholabul 'ilmi! 🚀</p>
    `;
    chatBox.appendChild(welcome);
    return;
  }

  activeSession.messages.forEach(msg => {
    appendMessageToDOM(msg.role, msg.text);
  });
  
  scrollToBottom();
}

// Format message text to support basic markdown (links, bold, italic) and convert raw phone numbers to WhatsApp links
function formatMessageText(text) {
  if (!text) return '';

  // 1. Escape HTML tags to prevent XSS
  let formatted = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Parse markdown links [Label](URL)
  formatted = formatted.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 3. Parse markdown links without custom label [URL]
  formatted = formatted.replace(/\[(https?:\/\/[^\s\]]+)\]/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  // 4. Parse bold text: **bold** -> <strong>bold</strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 5. Parse italic text: *italic* -> <em>italic</em>
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 6. Convert raw URLs to active links (if not already inside href)
  const urlRegex = /(?<!href=")(https?:\/\/[^\s<]+)/g;
  formatted = formatted.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');

  // 7. Auto-detect Indonesian phone numbers and turn them into wa.me links
  // (Negative lookbehind prevents matching numbers inside URLs like wa.me/62852...)
  const phoneRegex = /(?<![/\w])(08\d{8,11}|\+?628\d{8,11})(?!\w)/g;
  formatted = formatted.replace(phoneRegex, (match) => {
    let cleanNumber = match.replace(/\+/g, '');
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '62' + cleanNumber.substring(1);
    }
    return `<a href="https://wa.me/${cleanNumber}" target="_blank" rel="noopener noreferrer">${match}</a>`;
  });

  return formatted;
}

// Append a Message to the DOM
function appendMessageToDOM(role, text) {
  const container = document.createElement('div');
  container.classList.add('message-container', role);

  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.textContent = role === 'user' ? 'U' : '✨';

  const content = document.createElement('div');
  content.classList.add('message-content');

  const bubble = document.createElement('div');
  bubble.classList.add('message-bubble');
  bubble.innerHTML = formatMessageText(text);

  content.appendChild(bubble);
  container.appendChild(avatar);
  container.appendChild(content);
  chatBox.appendChild(container);
}

// Show/Hide Typing Indicator
function setTypingIndicator(show) {
  const existingIndicator = document.getElementById('typing-indicator');
  
  if (show) {
    if (existingIndicator) return;
    
    const container = document.createElement('div');
    container.id = 'typing-indicator';
    container.classList.add('typing-indicator-container');
    container.innerHTML = `
      <div class="avatar">✨</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    `;
    chatBox.appendChild(container);
    scrollToBottom();
  } else {
    if (existingIndicator) {
      existingIndicator.remove();
    }
  }
}

// Handle Form Submission (Sending Message)
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (isGenerating) return;

  const text = input.value.trim();
  if (!text) return;

  const activeSession = sessions.find(s => s.id === activeSessionId);
  if (!activeSession) return;

  // Clear input
  input.value = '';
  
  // Update state
  isGenerating = true;
  disableUI(true);

  // If this is the first message, update the session title
  const isFirstMessage = activeSession.messages.length === 0;
  if (isFirstMessage) {
    activeSession.title = text.length > 25 ? text.substring(0, 25) + '...' : text;
    // Clear welcome screen if it's there
    chatBox.innerHTML = '';
  }

  // Push user message to local state
  const userMessageObj = { role: 'user', text };
  activeSession.messages.push(userMessageObj);
  saveToStorage();

  // Update UI with user message
  appendMessageToDOM('user', text);
  if (isFirstMessage) {
    renderSidebar();
    activeChatTitle.textContent = activeSession.title;
  }
  scrollToBottom();

  // Show typing indicator
  setTypingIndicator(true);

  try {
    // Send standard API request to the backend
    const response = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        conversation: activeSession.messages
      })
    });

    if (!response.ok) {
      throw new Error(`Server returned status: ${response.status}`);
    }

    const data = await response.json();
    
    // Remove typing indicator
    setTypingIndicator(false);

    const botResponseText = data.output || 'Maaf, terjadi kesalahan saat memproses respons Anda.';
    
    // Push bot response to local state
    const botMessageObj = { role: 'model', text: botResponseText };
    activeSession.messages.push(botMessageObj);
    saveToStorage();

    // Render bot message
    appendMessageToDOM('model', botResponseText);
    scrollToBottom();
  } catch (error) {
    console.error('API Error:', error);
    setTypingIndicator(false);
    
    const errorMsg = 'Afwan, koneksi ke server terputus atau terjadi gangguan internal. Silakan coba sesaat lagi 🙏';
    appendMessageToDOM('model', errorMsg);
    
    // Also append the error message to the session array to retain conversation history
    activeSession.messages.push({ role: 'model', text: errorMsg });
    saveToStorage();
    scrollToBottom();
  } finally {
    isGenerating = false;
    disableUI(false);
    input.focus();
  }
}

// Disable/Enable Input elements
function disableUI(disable) {
  input.disabled = disable;
  const sendBtn = document.getElementById('send-btn');
  if (sendBtn) sendBtn.disabled = disable;
}

// Scroll Chat Box to Bottom
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);
