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
import com.jurix.ai.service.DashboardUpdateService;
import com.jurix.ai.service.DashboardUpdateService.UpdateEvent;
import com.google.gson.Gson;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.DisposableBean;
import org.springframework.beans.factory.InitializingBean;

import javax.inject.Inject;
import javax.inject.Named;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.TimeUnit;

@Named("issueEventListener")
public class IssueEventListener implements InitializingBean, DisposableBean {

    private static final Logger log = LoggerFactory.getLogger(IssueEventListener.class);

    private static final List<String> RESOLVED_STATUSES = Arrays.asList(
            "Done", "Resolved", "Closed", "Complete", "Fixed"
    );

    @ComponentImport
    private final EventPublisher eventPublisher;
    
    private final DashboardUpdateService updateService;
    private final Gson gson = new Gson();
    private OkHttpClient httpClient;

    @Inject
    public IssueEventListener(@ComponentImport EventPublisher eventPublisher,
                             DashboardUpdateService updateService) {
        this.eventPublisher = eventPublisher;
        this.updateService = updateService;
        log.info("🚀 IssueEventListener CONSTRUCTOR called - updateService: {}", updateService);
    }

    @Override
    public void afterPropertiesSet() {
        log.info("🟢 IssueEventListener.afterPropertiesSet() - STARTING REGISTRATION");
        
        try {
            // Initialize HTTP client
            this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .writeTimeout(5, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.SECONDS)
                .build();
            
            // Register with event publisher
            eventPublisher.register(this);
            log.info("✅ JURIX Real-time Issue Event Listener SUCCESSFULLY REGISTERED!");
            log.info("✅ Event Publisher: {}", eventPublisher);
            log.info("✅ Update Service: {}", updateService);
            
        } catch (Exception e) {
            log.error("❌ Failed to register event listener!", e);
        }
    }

    @Override
    public void destroy() {
        log.info("🔴 IssueEventListener.destroy() - UNREGISTERING");
        eventPublisher.unregister(this);
        log.info("JURIX Issue Event Listener unregistered");
    }

    @EventListener
    public void onIssueEvent(IssueEvent event) {
        log.info("🎯 ========== ISSUE EVENT RECEIVED ==========");
        
        try {
            Long eventTypeId = event.getEventTypeId();
            Issue issue = event.getIssue();
            
            log.info("📋 Event Type ID: {}", eventTypeId);
            log.info("📋 Event Type Name: {}", getEventTypeName(eventTypeId));
            
            if (issue == null) {
                log.warn("⚠️ Issue is null, skipping event");
                return;
            }
            
            log.info("📋 Issue Key: {}", issue.getKey());
            log.info("📋 Issue Status: {}", issue.getStatus().getName());
            log.info("📋 Project: {}", issue.getProjectObject().getKey());
            
            // Track the update
            String projectKey = issue.getProjectObject().getKey();
            String eventType = getEventTypeName(eventTypeId);
            
            // Store in service
            UpdateEvent updateEvent = new UpdateEvent(
                issue.getKey(),
                issue.getStatus().getName(),
                eventType,
                System.currentTimeMillis()
            );
            
            log.info("💾 Recording update in DashboardUpdateService...");
            updateService.recordUpdate(projectKey, updateEvent);
            log.info("✅ Update recorded successfully!");
            
            // Notify Python backend in a separate thread
            new Thread(() -> {
                log.info("📡 Notifying Python backend...");
                notifyPythonBackend(projectKey, eventType, issue);
            }).start();
            
            // Handle resolution for article generation
            if (eventTypeId.equals(EventType.ISSUE_RESOLVED_ID) ||
                eventTypeId.equals(EventType.ISSUE_CLOSED_ID)) {
                
                Status currentStatus = issue.getStatus();
                if (currentStatus != null && RESOLVED_STATUSES.contains(currentStatus.getName())) {
                    log.info("🎉 Issue {} was resolved/closed", issue.getKey());
                    handleIssueResolved(issue);
                }
            }
            // Remove or comment out the problematic block
            // if (eventTypeId.equals(EventType.ISSUE_VIEWED_ID)) {
            //     triggerSmartSuggestions(issue);
            // }

        } catch (Exception e) {
            log.error("❌ Error handling issue event", e);
        }
        
        log.info("🏁 ========== EVENT PROCESSING COMPLETE ==========");
    }
    
    private void notifyPythonBackend(String projectKey, String updateType, Issue issue) {
        try {
            // Create detailed update payload
            Map<String, Object> details = new HashMap<>();
            details.put("issueKey", issue.getKey());
            details.put("status", issue.getStatus().getName());
            details.put("summary", issue.getSummary());
            
            // Add more context
            if (issue.getAssignee() != null) {
                details.put("assignee", issue.getAssignee().getDisplayName());
            }
            
            // Add issue type
            if (issue.getIssueType() != null) {
                details.put("issueType", issue.getIssueType().getName());
            }
            
            // Add priority if available
            if (issue.getPriority() != null) {
                details.put("priority", issue.getPriority().getName());
            }
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("projectKey", projectKey);
            payload.put("updateType", updateType);
            payload.put("details", details);
            payload.put("timestamp", System.currentTimeMillis());
            
            String backendUrl = "http://localhost:5001/api/notify-update";
            
            log.info("📤 Sending update notification to backend:");
            log.info("   Project: " + projectKey);
            log.info("   Type: " + updateType);
            log.info("   Issue: " + issue.getKey());
            log.info("   Status: " + issue.getStatus().getName());
            
            RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                gson.toJson(payload)
            );
            
            Request request = new Request.Builder()
                .url(backendUrl)
                .post(body)
                .addHeader("Content-Type", "application/json")
                .build();
            
            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    log.warn("📡 Failed to notify Python backend: {}", e.getMessage());
                }
                
                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    try {
                        if (response.isSuccessful()) {
                            log.info("✅ Successfully notified Python backend for {} update", issue.getKey());
                            
                            // Also store in DashboardUpdateService to ensure it's tracked
                            UpdateEvent updateEvent = new UpdateEvent(
                                issue.getKey(),
                                issue.getStatus().getName(),
                                updateType,
                                System.currentTimeMillis()
                            );
                            updateService.recordUpdate(projectKey, updateEvent);
                            
                        } else {
                            log.warn("⚠️ Python backend returned: {} - {}", response.code(), response.message());
                        }
                    } finally {
                        response.close();
                    }
                }
            });
            
        } catch (Exception e) {
            log.error("❌ Error notifying Python backend: {}", e.getMessage(), e);
        }
    }
    private String getEventTypeName(Long eventTypeId) {
        if (eventTypeId.equals(EventType.ISSUE_CREATED_ID)) return "created";
        if (eventTypeId.equals(EventType.ISSUE_UPDATED_ID)) return "updated";
        if (eventTypeId.equals(EventType.ISSUE_RESOLVED_ID)) return "resolved";
        if (eventTypeId.equals(EventType.ISSUE_CLOSED_ID)) return "closed";
        if (eventTypeId.equals(EventType.ISSUE_REOPENED_ID)) return "reopened";
        if (eventTypeId.equals(EventType.ISSUE_ASSIGNED_ID)) return "assigned";
        if (eventTypeId.equals(EventType.ISSUE_WORKSTARTED_ID)) return "work_started";
        if (eventTypeId.equals(EventType.ISSUE_WORKSTOPPED_ID)) return "work_stopped";
        return "changed";
    }

    private void handleIssueResolved(Issue issue) {
        try {
            log.info("🎊 Processing resolved issue: {}", issue.getKey());
            
            // Get the API client and notify about resolution
            JurixApiClient apiClient = JurixApiClient.getInstance();
            Map<String, Object> issueData = new HashMap<>();
            issueData.put("key", issue.getKey());
            issueData.put("summary", issue.getSummary());
            issueData.put("status", issue.getStatus().getName());
            
            apiClient.notifyTicketResolved(issue.getKey(), issueData);
            
            // Send notification
            NotificationService notificationService = NotificationService.getInstance();
            notificationService.notifyArticleGenerationStarted(issue);
            
            log.info("✅ Resolved issue processing complete");
            
        } catch (Exception e) {
            log.error("❌ Error processing resolved issue: " + issue.getKey(), e);
        }
    }

    private void triggerSmartSuggestions(Issue issue) {
        try {
            // Prepare suggestion request
            Map<String, Object> suggestionRequest = new HashMap<>();
            suggestionRequest.put("issue_key", issue.getKey());
            suggestionRequest.put("issue_summary", issue.getSummary());
            suggestionRequest.put("issue_description", issue.getDescription());
            suggestionRequest.put("issue_type", issue.getIssueType().getName());
            suggestionRequest.put("issue_status", issue.getStatus().getName());
            suggestionRequest.put("event_type", "issue_viewed");
            suggestionRequest.put("timestamp", System.currentTimeMillis());
            
            // Send async request to suggestion service
            RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                gson.toJson(suggestionRequest)
            );
            
            Request request = new Request.Builder()
                .url("http://localhost:5001/api/suggest-articles")
                .post(body)
                .build();
            
            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    log.warn("Failed to trigger smart suggestions: {}", e.getMessage());
                }
                
                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    if (response.isSuccessful()) {
                        log.info("Smart suggestions triggered for issue {}", issue.getKey());
                    }
                    response.close();
                }
            });
            
        } catch (Exception e) {
            log.error("Error triggering smart suggestions", e);
        }
    }
}