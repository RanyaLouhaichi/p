(function() {
    'use strict';
    
    const ArticleReview = {
        API_BASE: AJS.contextPath() + '/rest/jurix/1.0/article',
        notificationCheckInterval: 30000, 
        currentArticle: null,
        currentIssueKey: null,
        
        init: function() {
            console.log('🚀 Initializing JURIX Article Review System');
            this.injectStyles();
            this.initNotificationSystem();
            this.checkNotifications();
            setInterval(() => this.checkNotifications(), this.notificationCheckInterval);
            if (typeof JIRA !== 'undefined' && JIRA.Events) {
                JIRA.bind(JIRA.Events.NEW_CONTENT_ADDED, () => {
                    this.checkCurrentIssueArticle();
                });
            }
            this.checkCurrentIssueArticle();
        },
        
        initNotificationSystem: function() {
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
            console.log('Checking notifications...');
        },
        
        updateNotificationBadge: function(notifications) {
            const unreadCount = notifications.filter(n => !n.read).length;
            const badge = AJS.$('.notification-badge');
            
            if (unreadCount > 0) {
                badge.text(unreadCount).show();
                badge.addClass('pulse');
                setTimeout(() => badge.removeClass('pulse'), 3000);
            } else {
                badge.hide();
            }
        },
        
        toggleNotificationDropdown: function() {
            const dropdown = AJS.$('.jurix-notification-dropdown');
            dropdown.toggle();
        },
        
        checkCurrentIssueArticle: function() {
            const issueKey = this.getCurrentIssueKey();
            if (!issueKey) return;
            AJS.$.ajax({
                url: `${this.API_BASE}/${issueKey}`,
                type: 'GET',
                success: (data) => {
                    if (data.article) {
                        this.addArticleIndicator(issueKey);
                    }
                },
                error: (xhr) => {
                    if (xhr.status !== 404) {
                        console.error('Error checking article:', xhr);
                    }
                }
            });
        },
        
        getCurrentIssueKey: function() {
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
            if (!AJS.$('.jurix-article-indicator').length) {
                const indicator = `
                    <button class="jurix-article-indicator aui-button" 
                            title="View AI-generated article">
                        <span class="aui-icon aui-icon-small aui-iconfont-document"></span>
                        AI Article Available
                    </button>
                `;
                
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
            console.log('🔍 Opening article review for:', issueKey);
            this.currentIssueKey = issueKey;
            this.showArticleModal('loading');
            AJS.$.ajax({
                url: `${this.API_BASE}/${issueKey}`,
                type: 'GET',
                dataType: 'json',
                success: (data) => {
                    console.log('✅ Article data received:', data);
                    
                    if (data.article) {
                        this.currentArticle = data;
                        this.showArticleModal('article', data);
                    } else {
                        this.showArticleModal('error', {
                            message: 'No article has been generated for this issue yet.'
                        });
                    }
                },
                error: (xhr) => {
                    console.error('❌ Error loading article:', xhr);
                    
                    let errorMessage = 'Failed to load article.';
                    if (xhr.status === 404) {
                        errorMessage = 'No article found for this issue. Make sure the issue is resolved.';
                    } else if (xhr.status === 500) {
                        errorMessage = 'Server error. Please check if the backend is running.';
                    }
                    
                    this.showArticleModal('error', {
                        message: errorMessage
                    });
                }
            });
        },
        
        showArticleModal: function(state, data) {
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
            AJS.$('.close-modal, .jurix-modal-overlay').on('click', (e) => {
                if (e.target === e.currentTarget || AJS.$(e.target).hasClass('close-modal')) {
                    this.closeModal();
                }
            });
            if (state === 'article') {
                this.bindFeedbackEvents();
            }
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
                    <button class="aui-button aui-button-primary" onclick="window.JurixArticleReview.closeModal()">
                        Close
                    </button>
                </div>
            `;
        },
        
        getArticleContent: function(data) {
            const article = data.article || {};
            const title = article.title || 'Untitled Article';
            const content = article.content || 'No content available';
            const version = article.version || 1;
            const approvalStatus = article.approval_status || 'pending';
            const createdAt = data.createdAt || Date.now();
            
            const isApproved = approvalStatus === 'approved';
            const htmlContent = this.markdownToHtml(content);
            
            return `
                <div class="article-container">
                    <div class="article-meta">
                        <div class="meta-item">
                            <span class="meta-label">Version:</span>
                            <span class="meta-value version-badge">v${version}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Status:</span>
                            <span class="meta-value status-badge ${approvalStatus}">
                                ${approvalStatus.charAt(0).toUpperCase() + approvalStatus.slice(1)}
                            </span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">Created:</span>
                            <span class="meta-value">${this.formatDate(createdAt)}</span>
                        </div>
                    </div>
                    
                    <div class="article-preview">
                        <h3 class="article-title">${this.escapeHtml(title)}</h3>
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
                    </div>
                </div>
            `;
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
            console.log('📤 Submitting feedback:', { action, feedback });
            AJS.$('.feedback-actions').html('<div class="loading-spinner"><div class="spinner"></div></div>');
            
            if (!this.currentArticle || !this.currentArticle.article) {
                console.error('❌ No current article data available');
                AJS.flag({
                    type: 'error',
                    title: 'Error',
                    body: 'Article data not found. Please refresh and try again.',
                    close: 'manual'
                });
                this.showArticleModal('article', this.currentArticle);
                return;
            }
            
            const feedbackData = {
                feedback: feedback || `Article ${action}d`,
                action: action,
                current_version: this.currentArticle.article.version || 1
            };
            
            console.log('📦 Feedback payload:', feedbackData);
            
            AJS.$.ajax({
                url: `${this.API_BASE}/${this.currentIssueKey}/feedback`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(feedbackData),
                success: (response) => {
                    console.log('✅ Feedback submitted successfully:', response);
                    
                    AJS.flag({
                        type: 'success',
                        title: 'Feedback Submitted',
                        body: action === 'refine' ? 'Article is being refined...' : 
                            action === 'approve' ? 'Article approved!' : 'Article rejected',
                        close: 'auto'
                    });
                    
                    if (action === 'refine' && response.article) {
                        this.currentArticle = response;
                        setTimeout(() => {
                            this.showArticleModal('article', this.currentArticle);
                        }, 1500);
                    } else if (action === 'approve' || action === 'reject') {
                        setTimeout(() => {
                            this.closeModal();
                        }, 1500);
                    }
                },
                error: (xhr, textStatus, errorThrown) => {
                    console.error('❌ Feedback submission failed:', {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText,
                        textStatus: textStatus,
                        errorThrown: errorThrown
                    });
                    
                    let errorMessage = 'Failed to submit feedback. Please try again.';

                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.error) {
                            errorMessage = errorResponse.error;
                        }
                    } catch (e) {
                    }
                    if (xhr.status === 0) {
                        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
                    } else if (xhr.status === 404) {
                        errorMessage = 'Feedback endpoint not found. Please check the API configuration.';
                    } else if (xhr.status === 500) {
                        errorMessage = 'Server error. Please check the server logs for details.';
                    } else if (xhr.status === 503) {
                        errorMessage = 'Backend service unavailable. Please ensure Python backend is running on port 5001.';
                    }
                    
                    AJS.flag({
                        type: 'error',
                        title: 'Error',
                        body: errorMessage,
                        close: 'manual'
                    });
                    
                    this.showArticleModal('article', this.currentArticle);
                }
            });
        },
        testFeedbackEndpoint: function() {
            console.log('🧪 Testing feedback endpoint...');
            
            const testData = {
                test: true,
                timestamp: Date.now()
            };
            
            AJS.$.ajax({
                url: `${this.API_BASE}/test-feedback`,
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(testData),
                success: (response) => {
                    console.log('✅ Test endpoint working:', response);
                    AJS.flag({
                        type: 'success',
                        title: 'Test Successful',
                        body: 'Feedback endpoint is working',
                        close: 'auto'
                    });
                },
                error: (xhr) => {
                    console.error('❌ Test endpoint failed:', xhr);
                    AJS.flag({
                        type: 'error',
                        title: 'Test Failed',
                        body: 'Cannot reach feedback endpoint',
                        close: 'manual'
                    });
                }
            });
        },
        
        closeModal: function() {
            const modal = AJS.$('#jurix-article-modal');
            modal.removeClass('show');
            setTimeout(() => modal.remove(), 300);
        },
        
        markdownToHtml: function(markdown) {
            let html = markdown
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
                .replace(/`(.+?)`/g, '<code>$1</code>')
                .replace(/^\* (.+)$/gim, '<li>$1</li>')
                .replace(/^- (.+)$/gim, '<li>$1</li>')
                .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            

            html = '<p>' + html + '</p>';
            

            html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
            
            return html;
        },
        
        formatDate: function(timestamp) {
            const date = new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        },
        
        escapeHtml: function(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
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
                    display: inline-block;
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
            </style>`;
            
            const styleSheet = document.createElement("style");
            styleSheet.id = styleId;
            styleSheet.type = "text/css";
            styleSheet.appendChild(document.createTextNode(styles));
            document.head.appendChild(styleSheet);
        }
    };
    
    window.JurixArticleReview = ArticleReview;

    AJS.toInit(() => {
        ArticleReview.init();
    });
})();