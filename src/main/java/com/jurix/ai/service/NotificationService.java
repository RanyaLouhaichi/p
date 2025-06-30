package com.jurix.ai.service;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.issue.Issue;
import com.atlassian.jira.issue.IssueManager;
import com.atlassian.jira.issue.MutableIssue;
import com.atlassian.jira.issue.comments.CommentManager;
import com.atlassian.jira.user.ApplicationUser;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class NotificationService {
    
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    private static NotificationService instance;
    
    private NotificationService() {
        // Private constructor for singleton
    }
    
    public static synchronized NotificationService getInstance() {
        if (instance == null) {
            instance = new NotificationService();
        }
        return instance;
    }
    
    public void notifyArticleGenerationStarted(Issue issue) {
        log.info("Article generation started for issue: {}", issue.getKey());
        addCommentToIssue(issue.getKey(), 
            "🤖 AI Article Generation Started\n\n" +
            "JURIX AI is now analyzing this resolved issue to generate a knowledge base article. " +
            "This typically takes 1-2 minutes.");
    }
    
    public void notifyArticleGenerationComplete(String issueKey, String title, String content) {
        log.info("Article generation complete for issue: {}", issueKey);
        String commentBody = String.format(
            "✅ AI Article Generated Successfully\n\n" +
            "**Title:** %s\n\n" +
            "The article has been generated and is available in the knowledge base. " +
            "You can view it from the AI Analytics dashboard.",
            title
        );
        addCommentToIssue(issueKey, commentBody);
    }
    
    public void notifyArticleGenerationFailed(String issueKey) {
        log.error("Article generation failed for issue: {}", issueKey);
        addCommentToIssue(issueKey, 
            "❌ AI Article Generation Failed\n\n" +
            "Unfortunately, the AI article generation encountered an error. " +
            "Please try again later or contact your administrator.");
    }
    
    public void notifyArticleGenerationTimeout(String issueKey) {
        log.warn("Article generation timed out for issue: {}", issueKey);
        addCommentToIssue(issueKey, 
            "⏱️ AI Article Generation Timeout\n\n" +
            "The article generation process is taking longer than expected. " +
            "It will continue in the background and you'll be notified when complete.");
    }
    
    private void addCommentToIssue(String issueKey, String commentBody) {
        try {
            IssueManager issueManager = ComponentAccessor.getIssueManager();
            MutableIssue issue = issueManager.getIssueObject(issueKey);
            
            if (issue != null) {
                CommentManager commentManager = ComponentAccessor.getCommentManager();
                ApplicationUser systemUser = ComponentAccessor.getJiraAuthenticationContext().getLoggedInUser();
                
                if (systemUser == null) {
                    // Get a system user if no logged-in user
                    systemUser = ComponentAccessor.getUserManager().getUserByName("admin");
                }
                
                if (systemUser != null) {
                    commentManager.create(issue, systemUser, commentBody, false);
                    log.info("Added comment to issue {}", issueKey);
                } else {
                    log.warn("Could not find user to add comment for issue {}", issueKey);
                }
            } else {
                log.warn("Issue {} not found when trying to add comment", issueKey);
            }
        } catch (Exception e) {
            log.error("Error adding comment to issue " + issueKey, e);
        }
    }
}