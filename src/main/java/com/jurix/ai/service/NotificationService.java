package com.jurix.ai.service;

import com.atlassian.jira.issue.Issue;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.inject.Named;

import javax.inject.Named;
import org.springframework.stereotype.Component;

@Component
@Named("notificationService")
public class NotificationService {
    
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);
    
    public NotificationService() {
        // Default constructor
    }
    
    public void notifyArticleGenerationStarted(Issue issue) {
        log.info("Article generation started for issue: {}", issue.getKey());
    }
    
    public void notifyArticleGenerationComplete(String issueKey, String title, String content) {
        log.info("Article generation complete for issue: {}", issueKey);
    }
    
    public void notifyArticleGenerationFailed(String issueKey) {
        log.error("Article generation failed for issue: {}", issueKey);
    }
    
    public void notifyArticleGenerationTimeout(String issueKey) {
        log.warn("Article generation timed out for issue: {}", issueKey);
    }
}