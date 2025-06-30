package com.jurix.ai.listener;

import com.atlassian.event.api.EventListener;
import com.atlassian.event.api.EventPublisher;
import com.atlassian.jira.event.issue.IssueEvent;
import com.atlassian.jira.event.type.EventType;
import com.atlassian.jira.issue.Issue;
import com.atlassian.jira.issue.status.Status;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.jurix.ai.api.JurixApiClient;
import com.jurix.ai.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;

import javax.inject.Inject;
import javax.inject.Named;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Named("issueEventListener")
public class IssueEventListener implements InitializingBean, DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(IssueEventListener.class);

    private static final List<String> RESOLVED_STATUSES = Arrays.asList(
            "Done", "Resolved", "Closed", "Complete", "Fixed"
    );

    @ComponentImport
    private final EventPublisher eventPublisher;

    @Inject
    public IssueEventListener(@ComponentImport EventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    @Override
    public void afterPropertiesSet() {
        eventPublisher.register(this);
        log.info("JURIX Issue Event Listener registered successfully");
    }

    @Override
    public void destroy() {
        eventPublisher.unregister(this);
        log.info("JURIX Issue Event Listener unregistered");
    }

    @EventListener
    public void onIssueEvent(IssueEvent event) {
        try {
            // Only process update events
            Long eventTypeId = event.getEventTypeId();
            if (!eventTypeId.equals(EventType.ISSUE_UPDATED_ID) &&
                !eventTypeId.equals(EventType.ISSUE_RESOLVED_ID) &&
                !eventTypeId.equals(EventType.ISSUE_CLOSED_ID)) {
                return;
            }

            Issue issue = event.getIssue();
            if (issue == null) {
                return;
            }

            // Check if issue was just resolved
            Status currentStatus = issue.getStatus();
            if (currentStatus != null && RESOLVED_STATUSES.contains(currentStatus.getName())) {
                log.info("Issue {} was resolved/closed. Status: {}", issue.getKey(), currentStatus.getName());
                handleIssueResolved(issue);
            }

        } catch (Exception e) {
            log.error("Error handling issue event", e);
        }
    }

    private void handleIssueResolved(Issue issue) {
        try {
            log.info("Processing resolved issue: {}", issue.getKey());
            
            // Prepare issue data
            Map<String, Object> issueData = new HashMap<>();
            issueData.put("key", issue.getKey());
            issueData.put("summary", issue.getSummary());
            issueData.put("description", issue.getDescription());
            issueData.put("status", issue.getStatus().getName());
            issueData.put("issueType", issue.getIssueType().getName());
            
            if (issue.getReporter() != null) {
                issueData.put("reporter", issue.getReporter().getDisplayName());
            }
            
            if (issue.getAssignee() != null) {
                issueData.put("assignee", issue.getAssignee().getDisplayName());
            }
            
            // Log the event (in a real implementation, this would trigger article generation)
            log.info("Issue {} resolved. Triggering AI article generation workflow", issue.getKey());
            
            // Get the API client and notify about resolution
            JurixApiClient apiClient = JurixApiClient.getInstance();
            apiClient.notifyTicketResolved(issue.getKey(), issueData);
            
            // Send notification that article generation has started
            NotificationService notificationService = NotificationService.getInstance();
            notificationService.notifyArticleGenerationStarted(issue);
            
            // Simulate article generation completion after a delay (in production, this would be async)
            simulateArticleGeneration(issue.getKey());
            
            // In a real implementation, you might:
            // 1. Store this in Active Objects for tracking
            // 2. Send a notification to users
            // 3. Trigger an async job to generate the article
            // 4. Update the issue with a comment about article generation
            
            // For now, just log success
            log.info("Successfully processed resolution event for issue: {}", issue.getKey());
            
        } catch (Exception e) {
            log.error("Error processing resolved issue: " + issue.getKey(), e);
        }
    }
    
    private void simulateArticleGeneration(final String issueKey) {
        // In production, this would be handled by an async service or job
        new Thread(() -> {
            try {
                // Wait 5 seconds to simulate processing
                Thread.sleep(5000);
                
                // Simulate successful article generation
                NotificationService notificationService = NotificationService.getInstance();
                notificationService.notifyArticleGenerationComplete(
                    issueKey,
                    "Resolution Guide for " + issueKey,
                    "This article contains the resolution steps and learnings from issue " + issueKey
                );
                
            } catch (InterruptedException e) {
                log.error("Article generation simulation interrupted", e);
            }
        }).start();
    }
}