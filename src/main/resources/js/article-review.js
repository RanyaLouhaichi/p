// article-review.js - Beautiful, minimalist article review system
(function() {
    'use strict';
    
    const ArticleReview = {
        API_BASE: AJS.contextPath() + '/rest/jurix/1.0/article',
        notificationCheckInterval: 30000, // Check every 30 seconds
        currentArticle: null,
        currentIssueKey: null,
        
        init: function() {
            console.log('🚀 Initializing JURIX Article Review System');
            
            // Add styles
            this.injectStyles();
            
            // Initialize notification system
            this.initNotificationSystem();
            
            // Check for notifications immediately
            this.checkNotifications();
            
            // Set up periodic check
            setInterval(() => this.checkNotifications(), this.notificationCheckInterval);
            
            // Listen for issue view events
            if (typeof JIRA !== 'undefined' && JIRA.Events) {
                JIRA.bind(JIRA.Events.NEW_CONTENT_ADDED, () => {
                    this.checkCurrentIssueArticle();
                });
            }
            
            // Initialize if on issue view
            this.checkCurrentIssueArticle();
        },
        
        initNotificationSystem: function() {
            // Create notification container
            if (!AJS.$('#jurix-notifications').length) {
                const notificationContainer = `
                    <div id="jurix-notifications" class="jurix-notifications-container">
                        <div class="jurix-notification-bell" title="JURIX AI Notifications">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                            </svg>
                            <span class="notification-badge" style="display: none;">0</span>
                        </div>
                        <div class="jurix-notification-dropdown" style="display: none;">
                            <div class="notification-header">
                                <h4>AI Article Notifications</h4>
                                <button class="clear-all">Clear All</button>
                            </div>
                            <div class="notification-list">
                                <!-- Notifications will be populated here -->
                            </div>
                        </div>
                    </div>
                `;
                
                AJS.$('body').append(notificationContainer);
                
                // Bind events
                AJS.$('.jurix-notification-bell').on('click', (e) => {
                    e.stopPropagation();
                    this.toggleNotificationDropdown();
                });
                
                AJS.$(document).on('click', () => {
                    AJS.$('.jurix-notification-dropdown').hide();
                });
                
                AJS.$('.jurix-notification-dropdown').on('click', (e) => {
                    e.stopPropagation();
                });
            }
        },
        
        checkNotifications: function() {
            AJS.$.ajax({
                url: this.API_BASE + '/notifications',
                type: 'GET',
                success: (notifications) => {
                    this.updateNotificationBadge(notifications);
                    this.renderNotifications(notifications);
                },
                error: (xhr) => {
                    console.error('Failed to fetch notifications:', xhr);
                }
            });
        },
        
        updateNotificationBadge: function(notifications) {
            const unreadCount = notifications.filter(n => !n.read).length;
            const badge = AJS.$('.notification-badge');
            
            if (unreadCount > 0) {
                badge.text(unreadCount).show();
                // Add pulse animation for new notifications
                badge.addClass('pulse');
                setTimeout(() => badge.removeClass('pulse'), 3000);
            } else {
                badge.hide();
            }
        },
        
        renderNotifications: function(notifications) {
            const list = AJS.$('.notification-list');
            list.empty();
            
            if (notifications.length === 0) {
                list.html('<div class="no-notifications">No new notifications</div>');
                return;
            }
            
            notifications.forEach(notification => {
                const timeAgo = this.getTimeAgo(notification.timestamp);
                const notificationHtml = `
                    <div class="notification-item ${notification.read ? 'read' : 'unread'}" 
                         data-notification-id="${notification.id}"
                         data-issue-key="${notification.issueKey}">
                        <div class="notification-icon">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                            </svg>
                        </div>
                        <div class="notification-content">
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-message">${notification.message}</div>
                            <div class="notification-time">${timeAgo}</div>
                        </div>
                        <button class="view-article-btn" data-issue-key="${notification.issueKey}">
                            Review Article
                        </button>
                    </div>
                `;
                list.append(notificationHtml);
            });
            
            // Bind click events
            AJS.$('.view-article-btn').off('click').on('click', (e) => {
                e.stopPropagation();
                const issueKey = AJS.$(e.target).data('issue-key');
                const notificationId = AJS.$(e.target).closest('.notification-item').data('notification-id');
                
                // Mark as read
                this.markNotificationRead(notificationId);
                
                // Open article review
                this.openArticleReview(issueKey);
            });
        },
        
        toggleNotificationDropdown: function() {
            const dropdown = AJS.$('.jurix-notification-dropdown');
            dropdown.toggle();
            
            if (dropdown.is(':visible')) {
                // Mark visible notifications as read after a delay
                setTimeout(() => {
                    AJS.$('.notification-item.unread').each((index, item) => {
                        const notificationId = AJS.$(item).data('notification-id');
                        this.markNotificationRead(notificationId);
                    });
                }, 3000);
            }
        },
        
        markNotificationRead: function(notificationId) {
            AJS.$.ajax({
                url: `${this.API_BASE}/notifications/${notificationId}/read`,
                type: 'POST',
                success: () => {
                    AJS.$(`.notification-item[data-notification-id="${notificationId}"]`)
                        .removeClass('unread')
                        .addClass('read');
                    this.checkNotifications(); // Refresh badge
                }
            });
        },
        
        checkCurrentIssueArticle: function() {
            const issueKey = this.getCurrentIssueKey();
            if (!issueKey) return;
            
            // Check if article exists for this issue
            AJS.$.ajax({
                url: `${this.API_BASE}/${issueKey}`,
                type: 'GET',
                success: (data) => {
                    if (data.article) {
                        this.addArticleIndicator(issueKey);
                    }
                },
                error: (xhr) => {
                    // No article exists yet
                    if (xhr.status !== 404) {
                        console.error('Error checking article:', xhr);
                    }
                }
            });
        },
        
        getCurrentIssueKey: function() {
            // Try multiple methods to get issue key
            if (typeof JIRA !== 'undefined' && JIRA.Issue && JIRA.Issue.getIssueKey) {
                return JIRA.Issue.getIssueKey();
            }
            
            const match = window.location.pathname.match(/browse\/([A-Z]+-\d+)/);
            if (match) return match[1];
            
            const metaTag = AJS.$('meta[name="ajs-issue-key"]');
            if (metaTag.length) return metaTag.attr('content');
            
            return null;
        },
        
        addArticleIndicator: function(issueKey) {
            // Add indicator to issue header
            if (!AJS.$('.jurix-article-indicator').length) {
                const indicator = `
                    <button class="jurix-article-indicator aui-button" 
                            title="View AI-generated article">
                        <span class="aui-icon aui-icon-small aui-iconfont-document"></span>
                        AI Article Available
                    </button>
                `;
                
                // Find appropriate place to insert
                const issueHeader = AJS.$('.issue-header-content, .aui-page-header-actions').first();
                if (issueHeader.length) {
                    issueHeader.append(indicator);
                    
                    AJS.$('.jurix-article-indicator').on('click', () => {
                        this.openArticleReview(issueKey);
                    });
                }
            }
        },
        
        openArticleReview: function(issueKey) {
            this.currentIssueKey = issueKey;
            
            // Show loading
            this.showArticleModal('loading');
            
            // Fetch article
            AJS.$.ajax({
                url: `${this.API_BASE}/${issueKey}`,
                type: 'GET',
                success: (data) => {
                    this.currentArticle = data;
                    this.showArticleModal('article', data);
                },
                error: (xhr) => {
                    this.showArticleModal('error', {
                        message: 'Failed to load article'
                    });
                }
            });
        },
        
        showArticleModal: function(state, data) {
            // Remove existing modal
            AJS.$('#jurix-article-modal').remove();
            
            let modalContent = '';
            
            if (state === 'loading') {
                modalContent = this.getLoadingContent();
            } else if (state === 'error') {
                modalContent = this.getErrorContent(data.message);
            } else if (state === 'article') {
                modalContent = this.getArticleContent(data);
            }
            
            const modal = `
                <div id="jurix-article-modal" class="jurix-modal-overlay">
                    <div class="jurix-modal">
                        <div class="jurix-modal-header">
                            <div class="modal-title-section">
                                <h2>AI-Generated Article</h2>
                                <span class="issue-key-badge">${this.currentIssueKey}</span>
                            </div>
                            <button class="close-modal" aria-label="Close">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <line x1="18" y1="6" x2="6" y2="18"/>
                                    <line x1="6" y1="6" x2="18" y2="18"/>
                                </svg>
                            </button>
                        </div>
                        <div class="jurix-modal-body">
                            ${modalContent}
                        </div>
                    </div>
                </div>
            `;
            
            AJS.$('body').append(modal);
            
            // Bind events
            AJS.$('.close-modal, .jurix-modal-overlay').on('click', (e) => {
                if (e.target === e.currentTarget || AJS.$(e.target).hasClass('close-modal')) {
                    this.closeModal();
                }
            });
            
            // Bind feedback events if article is shown
            if (state === 'article') {
                this.bindFeedbackEvents();
            }
            
            // Show modal with animation
            setTimeout(() => {
                AJS.$('#jurix-article-modal').addClass('show');
            }, 10);
        },
        
        getLoadingContent: function() {
            return `
                <div class="article-loading">
                    <div class="loading-spinner">
                        <div class="spinner"></div>
                    </div>
                    <p>Loading article...</p>
                </div>
            `;
        },
        
        getErrorContent: function(message) {
            return `
                <div class="article-error">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="12" y1="8" x2="12" y2="12"/>
                        <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <p>${message}</p>
                    <button class="aui-button aui-button-primary" onclick="ArticleReview.closeModal()">
                        Close
                    </button>
                </div>
            `;
        },
        
        getArticleContent: function(data) {
            const article = data.article;
            const isApproved = article.approval_status === 'approved';
            
            // Convert markdown to HTML (basic conversion)
            const htmlContent = this.markdownToHtml(article.content);
            
            return `
                <div class="article-container">
                    <div class="article-meta">
                        <div class="meta-item">
                            <span class="meta-label">Version:</span>
                            <span class="meta-value version-badge">v${article.version}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Status:</span>
                            <span class="meta-value status-badge ${article.approval_status}">
                                ${article.approval_status.charAt(0).toUpperCase() + article.approval_status.slice(1)}
                            </span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Created:</span>
                            <span class="meta-value">${this.formatDate(data.createdAt)}</span>
                        </div>
                    </div>
                    
                    <div class="article-preview">
                        <h3 class="article-title">${article.title}</h3>
                        <div class="article-content">
                            ${htmlContent}
                        </div>
                    </div>
                    
                    ${!isApproved ? this.getFeedbackSection() : this.getApprovedSection()}
                </div>
            `;
        },
        
        getFeedbackSection: function() {
            return `
                <div class="feedback-section">
                    <h4>Provide Feedback</h4>
                    <div class="feedback-input-container">
                        <textarea id="feedback-input" 
                                  placeholder="Describe what improvements you'd like to see..."
                                  rows="4"></textarea>
                        <div class="feedback-actions">
                            <button class="aui-button feedback-btn" data-action="refine">
                                <span class="aui-icon aui-icon-small aui-iconfont-edit"></span>
                                Refine Article
                            </button>
                            <button class="aui-button aui-button-primary feedback-btn" data-action="approve">
                                <span class="aui-icon aui-icon-small aui-iconfont-approve"></span>
                                Approve & Publish
                            </button>
                            <button class="aui-button feedback-btn" data-action="reject">
                                <span class="aui-icon aui-icon-small aui-iconfont-cross-circle"></span>
                                Reject
                            </button>
                        </div>
                    </div>
                    
                    <div class="feedback-history">
                        ${this.renderFeedbackHistory()}
                    </div>
                </div>
            `;
        },
        
        getApprovedSection: function() {
            return `
                <div class="approved-section">
                    <div class="approval-message">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00875A" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                        <h4>Article Approved!</h4>
                        <p>This article has been approved and is ready for publication.</p>
                        <button class="aui-button aui-button-primary">
                            Publish to Confluence
                        </button>
                    </div>
                </div>
            `;
        },
        
        renderFeedbackHistory: function() {
            if (!this.currentArticle || !this.currentArticle.article.feedback_history) {
                return '';
            }
            
            const history = this.currentArticle.article.feedback_history;
            if (history.length === 0) return '';
            
            let historyHtml = '<h5>Feedback History</h5><div class="history-timeline">';
            
            history.forEach((entry, index) => {
                const timeAgo = this.getTimeAgo(entry.timestamp);
                historyHtml += `
                    <div class="history-item">
                        <div class="history-marker"></div>
                        <div class="history-content">
                            <div class="history-header">
                                <span class="history-user">${entry.user || 'User'}</span>
                                <span class="history-time">${timeAgo}</span>
                            </div>
                            <div class="history-feedback">${entry.feedback}</div>
                            <div class="history-action action-${entry.action}">${entry.action}</div>
                        </div>
                    </div>
                `;
            });
            
            historyHtml += '</div>';
            return historyHtml;
        },
        
        bindFeedbackEvents: function() {
            AJS.$('.feedback-btn').on('click', (e) => {
                const action = AJS.$(e.currentTarget).data('action');
                const feedback = AJS.$('#feedback-input').val().trim();
                
                if (action === 'refine' && !feedback) {
                    AJS.flag({
                        type: 'warning',
                        title: 'Feedback Required',
                        body: 'Please provide feedback for refinement',
                        close: 'auto'
                    });
                    return;
                }
                
                this.submitFeedback(action, feedback);
            });
        },
        
        submitFeedback: function(action, feedback) {
            // Show loading state
            AJS.$('.feedback-actions').html('<div class="loading-spinner"><div class="spinner"></div></div>');
            
            const feedbackData = {
                feedback: feedback || `Article ${action}d`,
                action: action,
                current_version: this.currentArticle.version
            };
            
            AJS.$.ajax({
                url: `${this.API_BASE}/${this.currentIssueKey}/feedback`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(feedbackData),
                success: (response) => {
                    AJS.flag({
                        type: 'success',
                        title: 'Feedback Submitted',
                        body: action === 'refine' ? 'Article is being refined...' : 
                              action === 'approve' ? 'Article approved!' : 'Article rejected',
                        close: 'auto'
                    });
                    
                    // Refresh article
                    if (action === 'refine') {
                        setTimeout(() => {
                            this.openArticleReview(this.currentIssueKey);
                        }, 2000);
                    } else {
                        this.closeModal();
                    }
                },
                error: (xhr) => {
                    AJS.flag({
                        type: 'error',
                        title: 'Error',
                        body: 'Failed to submit feedback. Please try again.',
                        close: 'auto'
                    });
                    
                    // Restore buttons
                    this.showArticleModal('article', this.currentArticle);
                }
            });
        },
        
        closeModal: function() {
            const modal = AJS.$('#jurix-article-modal');
            modal.removeClass('show');
            setTimeout(() => modal.remove(), 300);
        },
        
        markdownToHtml: function(markdown) {
            // Basic markdown to HTML conversion
            let html = markdown
                // Headers
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                // Bold
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                // Italic
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                // Code blocks
                .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
                // Inline code
                .replace(/`(.+?)`/g, '<code>$1</code>')
                // Lists
                .replace(/^\* (.+)$/gim, '<li>$1</li>')
                .replace(/^- (.+)$/gim, '<li>$1</li>')
                .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
                // Paragraphs
                .replace(/\n\n/g, '</p><p>')
                // Line breaks
                .replace(/\n/g, '<br>');
            
            // Wrap in paragraph tags
            html = '<p>' + html + '</p>';
            
            // Clean up list items
            html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
            
            return html;
        },
        
        formatDate: function(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },
        
        getTimeAgo: function(timestamp) {
            const seconds = Math.floor((Date.now() - timestamp) / 1000);
            
            if (seconds < 60) return 'just now';
            if (seconds < 3600) return Math.floor(seconds / 60) + ' minutes ago';
            if (seconds < 86400) return Math.floor(seconds / 3600) + ' hours ago';
            if (seconds < 604800) return Math.floor(seconds / 86400) + ' days ago';
            
            return new Date(timestamp).toLocaleDateString();
        },
        
        injectStyles: function() {
            const styleId = 'jurix-article-review-styles';
            if (document.getElementById(styleId)) return;
            
            const styles = `<style id="${styleId}">
                /* Notification System */
                .jurix-notifications-container {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                }
                
                .jurix-notification-bell {
                    position: relative;
                    width: 40px;
                    height: 40px;
                    background: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                    transition: all 0.3s ease;
                }
                
                .jurix-notification-bell:hover {
                    transform: scale(1.05);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                
                .notification-badge {
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    background: #FF5630;
                    color: white;
                    font-size: 11px;
                    font-weight: bold;
                    padding: 2px 6px;
                    border-radius: 10px;
                    min-width: 18px;
                    text-align: center;
                }
                
                .notification-badge.pulse {
                    animation: pulse 1s ease-in-out 3;
                }
                
                @keyframes pulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.1); }
                    100% { transform: scale(1); }
                }
                
                .jurix-notification-dropdown {
                    position: absolute;
                    top: 50px;
                    right: 0;
                    width: 380px;
                    max-height: 500px;
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                }
                
                .notification-header {
                    padding: 16px 20px;
                    border-bottom: 1px solid #DFE1E6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .notification-header h4 {
                    margin: 0;
                    font-size: 16px;
                    color: #172B4D;
                }
                
                .clear-all {
                    background: none;
                    border: none;
                    color: #6B778C;
                    font-size: 13px;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 3px;
                    transition: all 0.2s;
                }
                
                .clear-all:hover {
                    background: #F4F5F7;
                    color: #172B4D;
                }
                
                .notification-list {
                    flex: 1;
                    overflow-y: auto;
                }
                
                .notification-item {
                    padding: 16px 20px;
                    border-bottom: 1px solid #F4F5F7;
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    transition: background 0.2s;
                }
                
                .notification-item:hover {
                    background: #F4F5F7;
                }
                
                .notification-item.unread {
                    background: #DEEBFF;
                }
                
                .notification-icon {
                    width: 32px;
                    height: 32px;
                    background: #0052CC;
                    color: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                
                .notification-content {
                    flex: 1;
                }
                
                .notification-title {
                    font-weight: 600;
                    color: #172B4D;
                    margin-bottom: 4px;
                }
                
                .notification-message {
                    color: #6B778C;
                    font-size: 13px;
                    margin-bottom: 4px;
                }
                
                .notification-time {
                    color: #97A0AF;
                    font-size: 12px;
                }
                
                .view-article-btn {
                    padding: 6px 12px;
                    background: #0052CC;
                    color: white;
                    border: none;
                    border-radius: 3px;
                    font-size: 12px;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                
                .view-article-btn:hover {
                    background: #0747A6;
                }
                
                .no-notifications {
                    padding: 40px;
                    text-align: center;
                    color: #6B778C;
                }
                
                /* Article Indicator */
                .jurix-article-indicator {
                    margin-left: 8px;
                }
                
                /* Modal Styles */
                .jurix-modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    opacity: 0;
                    transition: opacity 0.3s ease;
                }
                
                .jurix-modal-overlay.show {
                    opacity: 1;
                }
                
                .jurix-modal {
                    background: white;
                    border-radius: 12px;
                    width: 90%;
                    max-width: 900px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
                    transform: scale(0.9);
                    transition: transform 0.3s ease;
                }
                
                .jurix-modal-overlay.show .jurix-modal {
                    transform: scale(1);
                }
                
                .jurix-modal-header {
                    padding: 24px 32px;
                    border-bottom: 1px solid #DFE1E6;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .modal-title-section {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }
                
                .jurix-modal-header h2 {
                    margin: 0;
                    font-size: 20px;
                    color: #172B4D;
                }
                
                .issue-key-badge {
                    background: #0052CC;
                    color: white;
                    padding: 4px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                }
                
                .close-modal {
                    background: none;
                    border: none;
                    padding: 8px;
                    cursor: pointer;
                    color: #6B778C;
                    transition: all 0.2s;
                    border-radius: 4px;
                }
                
                .close-modal:hover {
                    background: #F4F5F7;
                    color: #172B4D;
                }
                
                .jurix-modal-body {
                    flex: 1;
                    overflow-y: auto;
                    padding: 0;
                }
                
                /* Loading State */
                .article-loading {
                    padding: 80px;
                    text-align: center;
                }
                
                .loading-spinner {
                    margin: 0 auto 20px;
                }
                
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 3px solid #F4F5F7;
                    border-top-color: #0052CC;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                
                /* Error State */
                .article-error {
                    padding: 80px;
                    text-align: center;
                    color: #6B778C;
                }
                
                .article-error svg {
                    color: #FF5630;
                    margin-bottom: 20px;
                }
                
                /* Article Content */
                .article-container {
                    display: flex;
                    flex-direction: column;
                }
                
                .article-meta {
                    padding: 20px 32px;
                    background: #F4F5F7;
                    border-bottom: 1px solid #DFE1E6;
                    display: flex;
                    gap: 32px;
                }
                
                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .meta-label {
                    color: #6B778C;
                    font-size: 13px;
                }
                
                .meta-value {
                    font-weight: 600;
                    color: #172B4D;
                }
                
                .version-badge {
                    background: #0052CC;
                    color: white;
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                }
                
                .status-badge {
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 12px;
                    font-weight: 600;
                }
                
                .status-badge.pending {
                    background: #FFF0B3;
                    color: #7F5F01;
                }
                
                .status-badge.approved {
                    background: #E3FCEF;
                    color: #006644;
                }
                
                .status-badge.rejected {
                    background: #FFEBE6;
                    color: #DE350B;
                }
                
                .article-preview {
                    padding: 32px;
                    background: white;
                    flex: 1;
                    overflow-y: auto;
                }
                
                .article-title {
                    font-size: 24px;
                    color: #172B4D;
                    margin: 0 0 24px 0;
                    padding-bottom: 16px;
                    border-bottom: 2px solid #DFE1E6;
                }
                
                .article-content {
                    color: #172B4D;
                    line-height: 1.6;
                    font-size: 14px;
                }
                
                .article-content h1,
                .article-content h2,
                .article-content h3 {
                    color: #172B4D;
                    margin: 24px 0 12px 0;
                    font-weight: 600;
                }
                
                .article-content h1 { font-size: 20px; }
                .article-content h2 { font-size: 18px; }
                .article-content h3 { font-size: 16px; }
                
                .article-content p {
                    margin: 0 0 16px 0;
                }
                
                .article-content ul,
                .article-content ol {
                    margin: 0 0 16px 24px;
                }
                
                .article-content li {
                    margin: 0 0 8px 0;
                }
                
                .article-content code {
                    background: #F4F5F7;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-family: 'Monaco', 'Menlo', monospace;
                    font-size: 13px;
                }
                
                .article-content pre {
                    background: #F4F5F7;
                    padding: 16px;
                    border-radius: 4px;
                    overflow-x: auto;
                    margin: 0 0 16px 0;
                }
                
                .article-content pre code {
                    background: none;
                    padding: 0;
                }
                
                .article-content strong {
                    font-weight: 600;
                    color: #172B4D;
                }
                
                /* Feedback Section */
                .feedback-section {
                    padding: 32px;
                    background: #F4F5F7;
                    border-top: 1px solid #DFE1E6;
                }
                
                .feedback-section h4 {
                    margin: 0 0 16px 0;
                    color: #172B4D;
                    font-size: 16px;
                }
                
                .feedback-input-container {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                    margin-bottom: 24px;
                }
                
                #feedback-input {
                    width: 100%;
                    border: 1px solid #DFE1E6;
                    border-radius: 4px;
                    padding: 12px;
                    font-size: 14px;
                    resize: vertical;
                    min-height: 100px;
                    font-family: inherit;
                }
                
                #feedback-input:focus {
                    outline: none;
                    border-color: #0052CC;
                    box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
                }
                
                .feedback-actions {
                    margin-top: 16px;
                    display: flex;
                    gap: 12px;
                    justify-content: flex-end;
                }
                
                .feedback-btn {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                /* Feedback History */
                .feedback-history h5 {
                    margin: 32px 0 16px 0;
                    color: #172B4D;
                    font-size: 14px;
                    font-weight: 600;
                }
                
                .history-timeline {
                    position: relative;
                    padding-left: 24px;
                }
                
                .history-timeline::before {
                    content: '';
                    position: absolute;
                    left: 8px;
                    top: 8px;
                    bottom: 8px;
                    width: 2px;
                    background: #DFE1E6;
                }
                
                .history-item {
                    position: relative;
                    margin-bottom: 24px;
                }
                
                .history-marker {
                    position: absolute;
                    left: -16px;
                    top: 8px;
                    width: 12px;
                    height: 12px;
                    background: white;
                    border: 2px solid #0052CC;
                    border-radius: 50%;
                }
                
                .history-content {
                    background: white;
                    padding: 16px;
                    border-radius: 6px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                
                .history-header {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                
                .history-user {
                    font-weight: 600;
                    color: #172B4D;
                    font-size: 13px;
                }
                
                .history-time {
                    color: #6B778C;
                    font-size: 12px;
                }
                
                .history-feedback {
                    color: #172B4D;
                    font-size: 13px;
                    margin-bottom: 8px;
                    line-height: 1.5;
                }
                
                .history-action {
                    display: inline-block;
                    padding: 2px 8px;
                    border-radius: 3px;
                    font-size: 11px;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                
                .action-refine {
                    background: #E9F2FF;
                    color: #0052CC;
                }
                
                .action-approve {
                    background: #E3FCEF;
                    color: #006644;
                }
                
                .action-reject {
                    background: #FFEBE6;
                    color: #DE350B;
                }
                
                /* Approved Section */
                .approved-section {
                    padding: 60px;
                    text-align: center;
                    background: #F4F5F7;
                }
                
                .approval-message svg {
                    margin-bottom: 20px;
                }
                
                .approval-message h4 {
                    color: #172B4D;
                    margin: 0 0 12px 0;
                    font-size: 20px;
                }
                
                .approval-message p {
                    color: #6B778C;
                    margin: 0 0 24px 0;
                }
                
                /* Responsive Design */
                @media (max-width: 768px) {
                    .jurix-modal {
                        width: 95%;
                        max-height: 95vh;
                    }
                    
                    .article-meta {
                        flex-wrap: wrap;
                        gap: 16px;
                    }
                    
                    .feedback-actions {
                        flex-wrap: wrap;
                    }
                    
                    .jurix-notification-dropdown {
                        width: 320px;
                    }
                }
            `;
            
            const styleSheet = document.createElement("style");
            styleSheet.id = styleId;
            styleSheet.type = "text/css";
            styleSheet.appendChild(document.createTextNode(styles));
            document.head.appendChild(styleSheet);
        }
    };
    
    // Initialize on DOM ready
    AJS.toInit(() => {
        ArticleReview.init();
    });
})();
