// JURIX AI Chat Widget - Blue Minimalist Design
window.JurixChat = (function() {
    'use strict';
    
    let isOpen = false;
    let conversationId = null;
    let chatWindow = null;
    let messageContainer = null;
    let inputField = null;
    let isTyping = false;
    
    const API_BASE = '/rest/jurix-api/1.0';
    
    function init() {
        // Generate unique conversation ID
        conversationId = 'jira-chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Create chat button
        createChatButton();
        
        // Create chat window
        createChatWindow();
        
        // Load saved messages if any
        loadConversationHistory();
    }
    
    function createChatButton() {
        const button = document.createElement('div');
        button.className = 'jurix-chat-button';
        button.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
        `;
        button.onclick = toggleChat;
        
        const widget = document.createElement('div');
        widget.className = 'jurix-chat-widget';
        widget.appendChild(button);
        
        document.body.appendChild(widget);
    }
    
    function createChatWindow() {
        chatWindow = document.createElement('div');
        chatWindow.className = 'jurix-chat-window';
        chatWindow.innerHTML = `
            <div class="jurix-chat-header">
                <div class="jurix-chat-header-content">
                    <div class="chat-avatar">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
                            <circle cx="12" cy="12" r="5" />
                            <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
                            <circle cx="12" cy="12" r="3" fill="white" />
                            <path d="M8 8l-1.5-1.5M16 8l1.5-1.5M8 16l-1.5 1.5M16 16l1.5 1.5" />
                        </svg>
                    </div>
                    <div class="chat-header-text">
                        <div class="chat-header-title">JURIX Assistant</div>
                        <div class="chat-header-status">Always online • Typically replies instantly</div>
                    </div>
                </div>
                <button onclick="JurixChat.toggleChat()" style="background: none; border: none; cursor: pointer;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            </div>
            
            <div class="jurix-chat-messages" id="chatMessages">
                <div class="chat-message assistant">
                    <div class="message-avatar">AI</div>
                    <div>
                        <div class="message-content">
                            <p>Hello! I'm your AI assistant. I can help you with:</p>
                            <ul>
                                <li>Project analytics and insights</li>
                                <li>Sprint predictions and recommendations</li>
                                <li>Team productivity analysis</li>
                                <li>Best practices and process improvements</li>
                            </ul>
                            <p>What would you like to know?</p>
                        </div>
                        <div class="quick-actions">
                            <button class="quick-action-btn" onclick="JurixChat.sendQuickMessage('Show current sprint metrics')">Sprint metrics</button>
                            <button class="quick-action-btn" onclick="JurixChat.sendQuickMessage('Team performance analysis')">Team analysis</button>
                            <button class="quick-action-btn" onclick="JurixChat.sendQuickMessage('Show blockers')">Blockers</button>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="jurix-chat-input">
                <input type="text" id="chatInput" placeholder="Type your message..." onkeypress="JurixChat.handleKeyPress(event)">
                <button onclick="JurixChat.sendMessage()" class="send-button">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
                    </svg>
                </button>
            </div>
        `;
        
        document.querySelector('.jurix-chat-widget').appendChild(chatWindow);
        
        messageContainer = document.getElementById('chatMessages');
        inputField = document.getElementById('chatInput');
    }
    
    function toggleChat() {
        isOpen = !isOpen;
        
        if (isOpen) {
            chatWindow.classList.add('open');
            inputField.focus();
            scrollToBottom();
        } else {
            chatWindow.classList.remove('open');
        }
    }
    
    function sendMessage() {
        const message = inputField.value.trim();
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        
        // Clear input
        inputField.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Send to API
        AJS.$.ajax({
            url: API_BASE + '/chat',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                query: message,
                conversationId: conversationId
            }),
            success: function(response) {
                hideTypingIndicator();
                
                // Add AI response
                addMessage(response.response, 'assistant');
                
                // Add quick actions if recommendations available
                if (response.recommendations && response.recommendations.length > 0) {
                    addQuickActions(response.recommendations);
                }
                
                // Save conversation
                saveConversation();
            },
            error: function(xhr, status, error) {
                hideTypingIndicator();
                addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
                console.error('Chat error:', error);
            }
        });
    }
    
    function sendQuickMessage(text) {
        inputField.value = text;
        sendMessage();
    }
    
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        
        if (sender === 'user') {
            messageDiv.innerHTML = `
                <div class="message-content">
                    <p>${escapeHtml(text)}</p>
                </div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-avatar">AI</div>
                <div class="message-content">
                    <p>${escapeHtml(text)}</p>
                </div>
            `;
        }
        
        messageContainer.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function addQuickActions(recommendations) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'quick-actions';
        
        recommendations.slice(0, 3).forEach(rec => {
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            btn.textContent = rec.substring(0, 50) + (rec.length > 50 ? '...' : '');
            btn.onclick = function() {
                inputField.value = `Tell me more about: ${rec}`;
                sendMessage();
            };
            actionsDiv.appendChild(btn);
        });
        
        const lastMessage = messageContainer.lastElementChild;
        if (lastMessage && lastMessage.classList.contains('assistant')) {
            lastMessage.appendChild(actionsDiv);
        }
    }
    
    function showTypingIndicator() {
        isTyping = true;
        const indicator = document.createElement('div');
        indicator.className = 'chat-message assistant typing-message';
        indicator.innerHTML = `
            <div class="message-avatar">AI</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        messageContainer.appendChild(indicator);
        scrollToBottom();
    }
    
    function hideTypingIndicator() {
        isTyping = false;
        const indicator = messageContainer.querySelector('.typing-message');
        if (indicator) {
            indicator.remove();
        }
    }
    
    function handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }
    
    function scrollToBottom() {
        messageContainer.scrollTop = messageContainer.scrollHeight;
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    function saveConversation() {
        // Save to local storage (you might want to use Jira's storage API instead)
        const messages = Array.from(messageContainer.children).map(msg => {
            const messageContent = msg.querySelector('.message-content p');
            return {
                sender: msg.classList.contains('user') ? 'user' : 'assistant',
                content: messageContent ? messageContent.textContent : ''
            };
        });
        
        localStorage.setItem('jurix-chat-' + conversationId, JSON.stringify(messages));
    }
    
    function loadConversationHistory() {
        // Load from local storage
        const saved = localStorage.getItem('jurix-chat-' + conversationId);
        if (saved) {
            try {
                const messages = JSON.parse(saved);
                messages.forEach(msg => {
                    if (msg.content && !msg.content.includes('Hello! I\'m your AI assistant')) {
                        addMessage(msg.content, msg.sender);
                    }
                });
            } catch (e) {
                console.error('Failed to load conversation history:', e);
            }
        }
    }
    
    // Public API
    return {
        init: init,
        toggleChat: toggleChat,
        sendMessage: sendMessage,
        handleKeyPress: handleKeyPress,
        sendQuickMessage: sendQuickMessage
    };
})();

// Initialize when DOM is ready
AJS.$(document).ready(function() {
    JurixChat.init();
});

// Add the CSS directly via JavaScript to ensure it overrides any existing styles
(function() {
    const style = document.createElement('style');
    style.textContent = `
        /* Override chat button styles to ensure blue color */
        .jurix-chat-widget .jurix-chat-button {
            background: #0052CC !important; /* Solid Jira blue */
            box-shadow: 0 4px 12px rgba(0, 82, 204, 0.25) !important;
            background-image: none !important; /* Remove gradient */
        }
        
        .jurix-chat-widget .jurix-chat-button:hover {
            background: #0747A6 !important; /* Darker blue on hover */
            box-shadow: 0 6px 20px rgba(0, 82, 204, 0.35) !important;
        }
        
        .jurix-chat-widget .jurix-chat-button::before {
            background: #0052CC !important;
            animation: none !important; /* Remove pulse for more minimalist look */
        }
        
        /* Ensure chat window has minimalist design */
        .jurix-chat-window {
            border: 1px solid #DFE1E6 !important;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1) !important;
        }
        
        /* Chat header minimalist style */
        .jurix-chat-header {
            background: #FFFFFF !important;
            border-bottom: 1px solid #DFE1E6 !important;
        }
        
        /* Avatar with blue gradient */
        .chat-avatar {
            background: #0052CC !important;
        }
        
        /* Quick action buttons with blue theme */
        .quick-action-btn {
            border-color: #4C9AFF !important;
            color: #0052CC !important;
        }
        
        .quick-action-btn:hover {
            background: #DEEBFF !important;
            border-color: #0052CC !important;
        }
        
        /* Send button blue */
        .send-button {
            background: #0052CC !important;
        }
        
        .send-button:hover {
            background: #0747A6 !important;
        }
        
        /* Input focus blue */
        .jurix-chat-input input:focus {
            border-color: #0052CC !important;
            box-shadow: 0 0 0 2px #DEEBFF !important;
        }
        
        /* User messages blue */
        .chat-message.user .message-content {
            background: #0052CC !important;
        }
        
        /* Assistant avatar blue theme */
        .chat-message.assistant .message-avatar {
            background: #DEEBFF !important;
            color: #0052CC !important;
        }
    `;
    document.head.appendChild(style);
})();