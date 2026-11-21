
/* ==========================================================
   ORACLE — INTERACTION ENGINE
   Version: 0.1.0
   ========================================================== */

(() => {
  "use strict";

  // ---------- DOM REFERENCES ----------

  const $ = (selector) => document.querySelector(selector);

  const sidebar = $("#sidebar");
  const chatForm = $("#chatForm");
  const messageInput = $("#messageInput");
  const sendButton = $("#sendButton");
  const welcomeScreen = $("#welcomeScreen");
  const messagesContainer = $("#messagesContainer");
  const messagesList = $("#messagesList");
  const historyList = $("#historyList");
  const statusIndicator = $("#statusIndicator");
  const statusText = $("#statusText");
  const settingsModal = $("#settingsModal");

  // ---------- CONFIGURATION ----------

  const STORAGE_KEY = "oracle_conversations_v1";

  // This is a prototype response engine, not a connected AI.
  const ORACLE_RESPONSES = [
    "Interesting question. Let's explore it from another angle. What appears obvious on the surface often becomes more fascinating when we examine what lies beneath.",
    "There is more to this than meets the eye. Let's break it down, examine what we know, and see where the evidence leads.",
    "Let's approach this methodically. We can start with what we know, separate assumptions from facts, and build toward a clearer understanding.",
    "A curious question deserves more than a quick answer. Let's investigate the details and uncover what makes it interesting.",
    "Consider that there may be several ways to approach this. Let's examine the possibilities rather than settling on the first explanation.",
    "Let's turn that idea into something tangible. Start with the core concept, then we can develop it piece by piece.",
    "The best place to begin is with curiosity. Let's examine the subject, find the important details, and follow the trail."
  ];

  // ---------- STATE ----------

  let conversations = [];
  let activeConversationId = null;
  let isProcessing = false;

  // ---------- UTILITIES ----------

  function createId() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function getActiveConversation() {
    return conversations.find(
      (conversation) => conversation.id === activeConversationId
    );
  }

  function saveConversations() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.warn("Oracle could not save conversations:", error);
    }
  }

  function loadConversations() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (!stored) return [];

      const parsed = JSON.parse(stored);

      if (!Array.isArray(parsed)) return [];

      return parsed.filter(
        (conversation) =>
          conversation &&
          typeof conversation.id === "string" &&
          Array.isArray(conversation.messages)
      );
    } catch (error) {
      console.warn("Oracle could not load conversations:", error);
      return [];
    }
  }

  function setStatus(text, online = false) {
    statusText.textContent = text;
    statusIndicator.classList.toggle("online", online);
  }

  function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit"
    });
  }

  // ---------- CONVERSATIONS ----------

  function createConversation() {
    const conversation = {
      id: createId(),
      title: "New conversation",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: []
    };

    conversations.unshift(conversation);
    activeConversationId = conversation.id;

    saveConversations();
    renderConversation();
    renderHistory();

    messageInput.focus();
  }

  function switchConversation(id) {
    const conversation = conversations.find((item) => item.id === id);

    if (!conversation) return;

    activeConversationId = id;

    renderConversation();
    renderHistory();
    closeMobileSidebar();
  }

  function updateConversationTitle(conversation) {
    if (conversation.messages.length === 0) {
      conversation.title = "New conversation";
      return;
    }

    const firstUserMessage = conversation.messages.find(
      (message) => message.role === "user"
    );

    if (!firstUserMessage) return;

    conversation.title =
      firstUserMessage.content.length > 36
        ? firstUserMessage.content.slice(0, 36).trim() + "…"
        : firstUserMessage.content;
  }

  function deleteConversation(id) {
    conversations = conversations.filter(
      (conversation) => conversation.id !== id
    );

    if (activeConversationId === id) {
      activeConversationId = conversations[0]?.id || null;
    }

    saveConversations();
    renderHistory();
    renderConversation();

    if (!activeConversationId) {
      showWelcome();
    }
  }

  // ---------- RENDERING ----------

  function showWelcome() {
    welcomeScreen.hidden = false;
    messagesContainer.hidden = true;
  }

  function showMessages() {
    welcomeScreen.hidden = true;
    messagesContainer.hidden = false;
  }

  function renderConversation() {
    const conversation = getActiveConversation();

    if (!conversation || conversation.messages.length === 0) {
      messagesList.innerHTML = "";
      showWelcome();
      return;
    }

    showMessages();

    messagesList.innerHTML = conversation.messages
      .map((message) => renderMessage(message))
      .join("");

    scrollToBottom();
  }

  function renderMessage(message) {
    const isUser = message.role === "user";
    const roleName = isUser ? "You" : "Oracle";
    const avatar = isUser ? "U" : "✦";

    return `
      <article class="message ${isUser ? "user" : "assistant"}">
        <div class="message-avatar">${avatar}</div>

        <div class="message-content">
          <div class="message-role">${roleName}</div>

          <div class="message-text">${escapeHTML(message.content)}</div>
        </div>
      </article>
    `;
  }

  function renderHistory() {
    if (conversations.length === 0) {
      historyList.innerHTML = "";
      return;
    }

    historyList.innerHTML = conversations
      .map((conversation) => {
        const isActive = conversation.id === activeConversationId;

        return `
          <button
            class="history-item ${isActive ? "active" : ""}"
            data-conversation-id="${escapeHTML(conversation.id)}"
            title="${escapeHTML(conversation.title)}"
          >
            ${escapeHTML(conversation.title)}
          </button>
        `;
      })
      .join("");
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
  }

  // ---------- MESSAGE HANDLING ----------

  function addMessage(role, content) {
    const conversation = getActiveConversation();

    if (!conversation) return null;

    const message = {
      id: createId(),
      role,
      content,
      timestamp: Date.now()
    };

    conversation.messages.push(message);
    conversation.updatedAt = Date.now();

    updateConversationTitle(conversation);
    saveConversations();

    return message;
  }

  function showTypingIndicator() {
    const indicator = document.createElement("article");

    indicator.className = "message assistant";
    indicator.id = "typingIndicator";

    indicator.innerHTML = `
      <div class="message-avatar">✦</div>

      <div class="message-content">
        <div class="message-role">Oracle</div>

        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;

    messagesList.appendChild(indicator);
    scrollToBottom();
  }

  function removeTypingIndicator() {
    $("#typingIndicator")?.remove();
  }

  function getPrototypeResponse(userMessage) {
    const message = userMessage.toLowerCase().trim();

    if (/^(hi|hello|hey|hiya)\b/.test(message)) {
      return "Greetings. My vessel is awake, though my intelligence is not yet connected. For now, I can demonstrate Oracle's interface. Soon, we'll give me the ability to genuinely understand and respond to your questions.";
    }

    if (message.includes("who are you") || message.includes("what are you")) {
      return "I am Oracle—your personal AI project, currently in its earliest form. My interface is alive, my conversation system works, and my actual AI engine is still awaiting integration. This response is part of my prototype, not generated intelligence.";
    }

    if (message.includes("help")) {
      return "I can demonstrate conversation handling, local history, and the interface right now. My actual abilities—research, reasoning, knowledge, and genuine AI conversation—will arrive when we connect the intelligence engine.";
    }

    return ORACLE_RESPONSES[
      Math.floor(Math.random() * ORACLE_RESPONSES.length)
    ] +
      "\n\nFor now, these are prototype responses. My real intelligence has not been connected yet.";
  }

  function processMessage(content) {
    if (isProcessing || !content.trim()) return;

    isProcessing = true;
    sendButton.disabled = true;

    if (!activeConversationId) {
      createConversation();
    }

    const conversation = getActiveConversation();

    if (!conversation) {
      isProcessing = false;
      return;
    }

    addMessage("user", content.trim());

    renderConversation();
    renderHistory();

    showTypingIndicator();
    setStatus("Contemplating...");

    // Temporary local prototype response.
    // This will be replaced with the real AI connection.
    const response = getPrototypeResponse(content);

    window.setTimeout(() => {
      removeTypingIndicator();
      addMessage("assistant", response);

      renderConversation();
      renderHistory();

      isProcessing = false;
      sendButton.disabled = !messageInput.value.trim();

      setStatus("Prototype mode");
      messageInput.focus();
    }, 850);
  }

  // ---------- INPUT ----------

  function resizeInput() {
    messageInput.style.height = "auto";

    messageInput.style.height =
      Math.min(messageInput.scrollHeight, 180) + "px";
  }

  function updateSendButton() {
    sendButton.disabled =
      !messageInput.value.trim() || isProcessing;
  }

  function submitMessage(message) {
    const content = message.trim();

    if (!content || isProcessing) return;

    messageInput.value = "";
    resizeInput();
    updateSendButton();

    processMessage(content);
  }

  // ---------- SIDEBAR ----------

  function toggleSidebar() {
    sidebar.classList.toggle("mobile-open");
  }

  function closeMobileSidebar() {
    sidebar.classList.remove("mobile-open");
  }

  // ---------- SETTINGS ----------

  function openSettings() {
    settingsModal.hidden = false;
  }

  function closeSettings() {
    settingsModal.hidden = true;
  }

  // ---------- EVENT LISTENERS ----------

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitMessage(messageInput.value);
  });

  messageInput.addEventListener("input", () => {
    resizeInput();
    updateSendButton();
  });

  messageInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();

      if (!sendButton.disabled) {
        chatForm.requestSubmit();
      }
    }
  });

  $("#newChatButton").addEventListener("click", createConversation);

  $("#homeButton").addEventListener("click", () => {
    activeConversationId = null;
    renderConversation();
    renderHistory();
    closeMobileSidebar();
  });

  $("#historyButton").addEventListener("click", () => {
    $("#conversationHistory").scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });

  $("#sidebarToggle").addEventListener("click", toggleSidebar);
  $("#mobileMenuButton").addEventListener("click", toggleSidebar);

  historyList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-conversation-id]");

    if (!button) return;

    switchConversation(button.dataset.conversationId);
  });

  $("#suggestionGrid").addEventListener("click", (event) => {
    const card = event.target.closest("[data-prompt]");

    if (!card) return;

    submitMessage(card.dataset.prompt);
  });

  $("#settingsButton").addEventListener("click", openSettings);
  $("#closeSettingsButton").addEventListener("click", closeSettings);

  settingsModal.addEventListener("click", (event) => {
    if (event.target === settingsModal) {
      closeSettings();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSettings();
      closeMobileSidebar();
    }

    // Ctrl/Cmd + Shift + O = new conversation
    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "o"
    ) {
      event.preventDefault();
      createConversation();
    }
  });

  // ---------- INITIALIZATION ----------

  function initialize() {
    conversations = loadConversations();

    // Restore the most recently active conversation.
    activeConversationId = conversations[0]?.id || null;

    renderHistory();
    renderConversation();
    resizeInput();
    updateSendButton();

    setStatus("Prototype mode");

    console.info("Oracle vessel initialized.");
  }

  initialize();

})();
