// JURIX AI Chat Widget - Backend Integration Version
window.JurixChat = (function() {
    'use strict';
    
    let isOpen = false;
    let conversationId = null;
    let chatWindow = null;
    let messageContainer = null;
    let inputField = null;
    let isTyping = false;
    let isConnected = false;
    
    const API_BASE = AJS.contextPath() + '/rest/jurix-api/1.0';
    
    function init() {
        // Generate unique conversation ID
        conversationId = 'jira-chat-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        
        // Create chat button
        createChatButton();
        
        // Create chat window
        createChatWindow();
        
        // Check backend connectivity
        checkBackendConnection();
        
        // Load saved messages if any
        loadConversationHistory();
    }
    
    function checkBackendConnection() {
        AJS.$.ajax({
            url: API_BASE + '/health',
            type: 'GET',
            success: function(response) {
                isConnected = response.backend_connected || false;
                if (isConnected) {
                    console.log('✅ Connected to JURIX AI backend');
                    updateConnectionStatus(true);
                } else {
                    console.warn('⚠️ Backend not connected, using fallback mode');
                    updateConnectionStatus(false);
                }
            },
            error: function() {
                isConnected = false;
                updateConnectionStatus(false);
            }
        });
    }
    
    function updateConnectionStatus(connected) {
        const statusElement = document.querySelector('.chat-header-status');
        if (statusElement) {
            if (connected) {
                statusElement.textContent = 'AI Assistant Ready • Typically replies instantly';
                statusElement.style.color = 'rgba(255, 255, 255, 0.9)';
            } else {
                statusElement.textContent = 'Limited Mode • Backend Offline';
                statusElement.style.color = 'rgba(255, 200, 200, 0.9)';
            }
        }
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
                        <div class="chat-header-status">Connecting...</div>
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
                            <p>Hello! I'm your AI assistant connected to your Jira instance. I can help you with:</p>
                            <ul>
                                <li>Answering questions about your projects</li>
                                <li>Providing insights and recommendations</li>
                                <li>Analyzing your team's productivity</li>
                                <li>General Agile and development best practices</li>
                            </ul>
                            <p>What would you like to know?</p>
                        </div>
                        <div class="quick-actions">
                            <button class="quick-action-btn" onclick="JurixChat.sendQuickMessage('What is my team\\'s current velocity?')">Team velocity</button>
                            <button class="quick-action-btn" onclick="JurixChat.sendQuickMessage('Show me productivity insights')">Productivity</button>
                            <button class="quick-action-btn" onclick="JurixChat.sendQuickMessage('Any blockers I should know about?')">Blockers</button>
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
            
            // Check connection status when opening
            checkBackendConnection();
        } else {
            chatWindow.classList.remove('open');
        }
    }
    
    // Updated sendMessage function in chat-widget.js
    function sendMessage() {
        const message = inputField.value.trim();
        if (!message) return;
        
        // Add user message
        addMessage(message, 'user');
        
        // Clear input
        inputField.value = '';
        
        // Show typing indicator
        showTypingIndicator();
        
        // Use the proper Java REST endpoint
        AJS.$.ajax({
            url: AJS.contextPath() + '/rest/jurix/1.0/chat',  // Uses Java layer
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                query: message,
                conversationId: conversationId
            }),
            timeout: 120000, // 120 seconds (2 minutes) timeout
            success: function(response) {
                hideTypingIndicator();
                
                // Add the main response
                if (response.response) {
                    addMessage(response.response, 'assistant');
                }
                
                // Handle additional data if present
                if (response.articles && response.articles.length > 0) {
                    addArticlesSummary(response.articles);
                }
                
                if (response.recommendations && response.recommendations.length > 0) {
                    addQuickActions(response.recommendations);
                }
                
                // Handle predictions if present
                if (response.predictions && Object.keys(response.predictions).length > 0) {
                    addPredictiveInsights(response.predictions);
                }
                
                // Save conversation
                saveConversation();
            },
            error: function(xhr, status, error) {
                hideTypingIndicator();
                console.error('Chat error:', error);
                
                let errorMessage = 'Sorry, I encountered an error. Please try again.';
                
                if (status === 'timeout') {
                    errorMessage = 'The request took too long to process. Please try a simpler query.';
                } else if (xhr.status === 0) {
                    errorMessage = 'Unable to connect to the server. Please check your connection.';
                } else if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMessage = xhr.responseJSON.error;
                }
                
                addMessage(errorMessage, 'assistant');
            }
        });
    }

    // Add function to display predictive insights
    function addPredictiveInsights(predictions) {
        if (!predictions || Object.keys(predictions).length === 0) return;
        
        const insightsDiv = document.createElement('div');
        insightsDiv.className = 'jurix-predictive-insights';
        
        // Check for sprint completion predictions
        if (predictions.sprint_completion) {
            const sprint = predictions.sprint_completion;
            insightsDiv.innerHTML = `
                <div class="insight-header">📊 Predictive Insights</div>
                <div class="insight-content">
                    <div class="insight-item">
                        <span class="insight-label">Sprint Completion:</span>
                        <span class="insight-value">${(sprint.probability * 100).toFixed(0)}%</span>
                    </div>
                    <div class="insight-item">
                        <span class="insight-label">Risk Level:</span>
                        <span class="insight-value risk-${sprint.risk_level}">${sprint.risk_level}</span>
                    </div>
                </div>
            `;
        }
        
        messagesContainer.appendChild(insightsDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Update addArticlesSummary to handle the new format
    function addArticlesSummary(articles) {
        if (!articles || articles.length === 0) return;
        
        const articlesDiv = document.createElement('div');
        articlesDiv.className = 'jurix-articles-summary';
        
        let articlesHtml = '<div class="articles-header">📚 Related Articles:</div>';
        articlesHtml += '<ul class="articles-list">';
        
        articles.forEach(article => {
            articlesHtml += `
                <li class="article-item">
                    <span class="article-title">${article.title || 'Untitled'}</span>
                    ${article.relevanceScore ? `<span class="relevance-score">(${(article.relevanceScore * 100).toFixed(0)}% relevant)</span>` : ''}
                </li>
            `;
        });
        
        articlesHtml += '</ul>';
        articlesDiv.innerHTML = articlesHtml;
        
        messagesContainer.appendChild(articlesDiv);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
        // Save to local storage
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
        // For now, we'll start fresh each time
        // You can implement persistent conversation loading if needed
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