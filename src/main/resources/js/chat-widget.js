// JURIX AI Chat Widget
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
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
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
                <div>
                    <div style="font-weight: 600; font-size: 1.125rem;">JURIX AI Assistant</div>
                    <div style="font-size: 0.875rem; opacity: 0.9;">Always here to help</div>
                </div>
                <button onclick="JurixChat.toggleChat()" style="background: none; border: none; color: white; font-size: 1.5rem; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; transition: background 0.2s;">
                    ×
                </button>
            </div>
            
            <div class="jurix-chat-messages" id="chatMessages">
                <div class="chat-message assistant">
                    <div class="message-avatar">AI</div>
                    <div class="message-content">
                        <p>Hello! I'm your AI assistant. I can help you with:</p>
                        <ul style="margin: 0.5rem 0; padding-left: 1.5rem;">
                            <li>Project analytics and insights</li>
                            <li>Sprint predictions and recommendations</li>
                            <li>Team productivity analysis</li>
                            <li>Best practices and process improvements</li>
                        </ul>
                        <p>What would you like to know?</p>
                    </div>
                </div>
            </div>
            
            <div class="jurix-chat-input">
                <input type="text" id="chatInput" placeholder="Type your message..." onkeypress="JurixChat.handleKeyPress(event)">
                <button onclick="JurixChat.sendMessage()" class="send-button">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                </button>
            </div>
        `;
        
        document.querySelector('.jurix-chat-widget').appendChild(chatWindow);
        
        messageContainer = document.getElementById('chatMessages');
        inputField = document.getElementById('chatInput');
        
        // Add styles
        addChatStyles();
    }
    
    function addChatStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .jurix-chat-input {
                padding: 1rem;
                border-top: 1px solid rgba(0, 0, 0, 0.1);
                display: flex;
                gap: 0.5rem;
                background: white;
            }
            
            .jurix-chat-input input {
                flex: 1;
                padding: 0.75rem 1rem;
                border: 1px solid #e5e7eb;
                border-radius: 100px;
                font-size: 0.875rem;
                transition: all 0.2s;
                background: #f9fafb;
            }
            
            .jurix-chat-input input:focus {
                outline: none;
                border-color: #6366f1;
                background: white;
                box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
            }
            
            .send-button {
                width: 44px;
                height: 44px;
                border-radius: 50%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border: none;
                color: white;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
            }
            
            .send-button:hover {
                transform: scale(1.05);
                box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
            }
            
            .send-button:active {
                transform: scale(0.95);
            }
            
            .chat-message {
                display: flex;
                gap: 0.75rem;
                margin-bottom: 1rem;
                animation: messageSlide 0.3s ease;
            }
            
            @keyframes messageSlide {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .message-avatar {
                width: 36px;
                height: 36px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.875rem;
                flex-shrink: 0;
            }
            
            .chat-message.assistant .message-avatar {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .chat-message.user .message-avatar {
                background: #e5e7eb;
                color: #6b7280;
            }
            
            .message-content {
                flex: 1;
                background: white;
                padding: 0.75rem 1rem;
                border-radius: 12px;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            }
            
            .chat-message.user .message-content {
                background: #f3f4f6;
            }
            
            .message-content p {
                margin: 0;
                line-height: 1.5;
            }
            
            .message-content p + p {
                margin-top: 0.5rem;
            }
            
            .typing-indicator {
                display: flex;
                gap: 0.25rem;
                padding: 0.5rem 0;
            }
            
            .typing-indicator span {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: #6b7280;
                animation: typing 1.4s infinite;
            }
            
            .typing-indicator span:nth-child(2) {
                animation-delay: 0.2s;
            }
            
            .typing-indicator span:nth-child(3) {
                animation-delay: 0.4s;
            }
            
            @keyframes typing {
                0%, 60%, 100% {
                    transform: translateY(0);
                    opacity: 0.5;
                }
                30% {
                    transform: translateY(-10px);
                    opacity: 1;
                }
            }
            
            .quick-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-top: 0.75rem;
            }
            
            .quick-action-btn {
                padding: 0.5rem 1rem;
                background: #f3f4f6;
                border: 1px solid #e5e7eb;
                border-radius: 100px;
                font-size: 0.875rem;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .quick-action-btn:hover {
                background: #e5e7eb;
                border-color: #d1d5db;
            }
        `;
        document.head.appendChild(style);
    }
    
    function toggleChat() {
        isOpen = !isOpen;
        chatWindow.style.display = isOpen ? 'flex' : 'none';
        
        if (isOpen) {
            inputField.focus();
            scrollToBottom();
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
    
    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.innerHTML = `
            <div class="message-avatar">${sender === 'user' ? 'You' : 'AI'}</div>
            <div class="message-content">
                <p>${escapeHtml(text)}</p>
            </div>
        `;
        
        messageContainer.appendChild(messageDiv);
        scrollToBottom();
    }
    
    function addQuickActions(recommendations) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'quick-actions';
        
        recommendations.slice(0, 3).forEach(rec => {
            const btn = document.createElement('button');
            btn.className = 'quick-action-btn';
            btn.textContent = rec.substring(0, 50) + '...';
            btn.onclick = function() {
                inputField.value = `Tell me more about: ${rec}`;
                sendMessage();
            };
            actionsDiv.appendChild(btn);
        });
        
        const lastMessage = messageContainer.lastElementChild;
        if (lastMessage && lastMessage.classList.contains('assistant')) {
            lastMessage.querySelector('.message-content').appendChild(actionsDiv);
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
            const messageP = msg.querySelector('.message-content p');
            return {
                sender: msg.classList.contains('user') ? 'user' : 'assistant',
                content: (messageP && messageP.textContent) || ''
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
        handleKeyPress: handleKeyPress
    };
})();

// Initialize when DOM is ready
AJS.$(document).ready(function() {
    JurixChat.init();
});