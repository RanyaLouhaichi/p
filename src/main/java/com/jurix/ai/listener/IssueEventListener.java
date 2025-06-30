package com.jurix.ai.listener;

import com.atlassian.event.api.EventListener;
import com.atlassian.event.api.EventPublisher;
import com.atlassian.jira.event.issue.IssueEvent;
import com.atlassian.jira.event.type.EventType;
import com.atlassian.jira.issue.Issue;
import com.atlassian.jira.issue.status.Status;
import com.jurix.ai.api.JurixApiClient;
import com.jurix.ai.service.NotificationService;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import org.ofbiz.core.entity.GenericEntityException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

import javax.inject.Inject;
import javax.inject.Named;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Component
@Named("issueEventListener")
public class IssueEventListener implements InitializingBean, DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(IssueEventListener.class);

    private static final List<String> RESOLVED_STATUSES = Arrays.asList(
            "Done", "Resolved", "Closed", "Complete", "Fixed"
    );

    @ComponentImport
    private final EventPublisher eventPublisher;
    
    private final JurixApiClient apiClient;
    private final NotificationService notificationService;

    @Inject
    public IssueEventListener(@ComponentImport EventPublisher eventPublisher,
                              JurixApiClient apiClient,
                              NotificationService notificationService) {
        this.eventPublisher = eventPublisher;
        this.apiClient = apiClient;
        this.notificationService = notificationService;
    }

    @Override
    public void afterPropertiesSet() {
        eventPublisher.register(this);
        log.info("JURIX Issue Event Listener registered");
    }

    @Override
    public void destroy() {
        eventPublisher.unregister(this);
        log.info("JURIX Issue Event Listener unregistered");
    }

    @EventListener
    public void onIssueEvent(IssueEvent event) {
        try {
            if (!isRelevantEvent(event)) {
                return;
            }

            Issue issue = event.getIssue();
            if (issue == null) {
                return;
            }

            if (isIssueJustResolved(event)) {
                log.info("Issue {} was resolved, triggering AI article generation", issue.getKey());
                handleIssueResolved(issue);
            }

        } catch (Exception e) {
            log.error("Error handling issue event", e);
        }
    }

    private boolean isRelevantEvent(IssueEvent event) {
        Long eventTypeId = event.getEventTypeId();
        return eventTypeId.equals(EventType.ISSUE_UPDATED_ID) ||
                eventTypeId.equals(EventType.ISSUE_RESOLVED_ID) ||
                eventTypeId.equals(EventType.ISSUE_CLOSED_ID);
    }

    private boolean isIssueJustResolved(IssueEvent event) {
        Issue issue = event.getIssue();
        Status currentStatus = issue.getStatus();

        if (!RESOLVED_STATUSES.contains(currentStatus.getName())) {
            return false;
        }

        try {
            return event.getChangeLog() != null &&
                    event.getChangeLog().getRelated("ChildChangeItem").stream()
                            .anyMatch(item -> "status".equals(item.get("field")) &&
                                    !RESOLVED_STATUSES.contains(String.valueOf(item.get("oldstring"))) &&
                                    RESOLVED_STATUSES.contains(String.valueOf(item.get("newstring"))));
        } catch (GenericEntityException e) {
            log.error("Error checking change log for issue resolution", e);
            return false;
        }
    }

    private void handleIssueResolved(Issue issue) {
        Map<String, Object> ticketData = new HashMap<>();
        Map<String, Object> fields = new HashMap<>();

        fields.put("summary", issue.getSummary());
        fields.put("description", issue.getDescription());
        fields.put("issuetype", Map.of(
                "name", issue.getIssueType().getName(),
                "id", issue.getIssueType().getId()
        ));
        fields.put("status", Map.of(
                "name", issue.getStatus().getName(),
                "id", issue.getStatus().getId()
        ));

        try {
            fields.put("project", Map.of(
                "key", issue.getProjectObject().getKey(),
                "name", issue.getProjectObject().getName()
            ));
        } catch (Exception e) {
            log.error("Could not get project object for issue {}", issue.getKey(), e);
        }

        if (issue.getReporter() != null) {
            fields.put("reporter", Map.of(
                    "displayName", issue.getReporter().getDisplayName(),
                    "key", issue.getReporter().getKey()
            ));
        }

        if (issue.getAssignee() != null) {
            fields.put("assignee", Map.of(
                    "displayName", issue.getAssignee().getDisplayName(),
                    "key", issue.getAssignee().getKey()
            ));
        }

        fields.put("resolutiondate", issue.getResolutionDate());
        fields.put("created", issue.getCreated());
        fields.put("updated", issue.getUpdated());

        ticketData.put("fields", fields);

        apiClient.notifyTicketResolved(issue.getKey(), ticketData);
        notificationService.notifyArticleGenerationStarted(issue);
        pollForArticleCompletion(issue.getKey());
    }

    private void pollForArticleCompletion(String issueKey) {
        CompletableFuture.runAsync(() -> {
            int maxAttempts = 30;
            int attempt = 0;

            while (attempt < maxAttempts) {
                try {
                    Thread.sleep(10000);
                    JurixApiClient.ArticleResponse response =
                            apiClient.generateArticle(issueKey).get();

                    if (response != null && response.currentState != null) {
                        String workflowStatus = (String) response.currentState.get("workflow_status");

                        if ("success".equals(workflowStatus) || "complete".equals(workflowStatus)) {
                            Map<String, Object> article = (Map<String, Object>)
                                    response.currentState.get("article");

                            if (article != null) {
                                notificationService.notifyArticleGenerationComplete(
                                        issueKey,
                                        (String) article.get("title"),
                                        (String) article.get("content")
                                );
                                break;
                            }
                        } else if ("failure".equals(workflowStatus) || "error".equals(workflowStatus)) {
                            notificationService.notifyArticleGenerationFailed(issueKey);
                            break;
                        }
                    }

                    attempt++;

                } catch (Exception e) {
                    log.error("Error polling for article completion", e);
                    break;
                }
            }

            if (attempt >= maxAttempts) {
                log.warn("Article generation timed out for issue {}", issueKey);
                notificationService.notifyArticleGenerationTimeout(issueKey);
            }
        });
    }
}