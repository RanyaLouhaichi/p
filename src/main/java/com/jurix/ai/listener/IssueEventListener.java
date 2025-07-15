package com.jurix.ai.listener;

import com.atlassian.event.api.EventListener;
import com.atlassian.event.api.EventPublisher;
import com.atlassian.jira.event.issue.IssueEvent;
import com.atlassian.jira.event.type.EventType;
import com.atlassian.jira.issue.Issue;
import com.atlassian.jira.issue.status.Status;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.jurix.ai.service.DashboardUpdateService;
import com.jurix.ai.service.DashboardUpdateService.UpdateEvent;
import com.jurix.ai.service.ArticleGenerationService;
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
    private final ArticleGenerationService articleService;
    private final Gson gson = new Gson();
    private OkHttpClient httpClient;
    
    // Track registration status
    private boolean registered = false;

    @Inject
    public IssueEventListener(@ComponentImport EventPublisher eventPublisher,
                             DashboardUpdateService updateService,
                             ArticleGenerationService articleService) {
        this.eventPublisher = eventPublisher;
        this.updateService = updateService;
        this.articleService = articleService;
        log.info("🚀 IssueEventListener CONSTRUCTOR called");
        log.info("   EventPublisher: {}", eventPublisher);
        log.info("   DashboardUpdateService: {}", updateService);
        log.info("   ArticleGenerationService: {}", articleService);
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        log.info("🟢 ==========================================");
        log.info("🟢 IssueEventListener.afterPropertiesSet()");
        log.info("🟢 ==========================================");
        
        try {
            // Initialize HTTP client
            this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .writeTimeout(5, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .build();
            
            // Register with event publisher
            log.info("📝 Attempting to register with EventPublisher...");
            eventPublisher.register(this);
            registered = true;
            log.info("✅ SUCCESSFULLY REGISTERED with EventPublisher!");
            log.info("✅ Listener is now active and waiting for events");
            
        } catch (Exception e) {
            log.error("❌ Failed to register event listener!", e);
            throw e;
        }
    }

    @Override
    public void destroy() throws Exception {
        log.info("🔴 IssueEventListener.destroy() - UNREGISTERING");
        if (registered) {
            eventPublisher.unregister(this);
            registered = false;
        }
        log.info("JURIX Issue Event Listener unregistered");
    }

    @EventListener
    public void onIssueEvent(IssueEvent event) {
        // Log EVERY event to debug
        log.info("🎯 ==========================================");
        log.info("🎯 ISSUE EVENT RECEIVED!");
        log.info("🎯 ==========================================");
        
        try {
            Long eventTypeId = event.getEventTypeId();
            Issue issue = event.getIssue();
            
            log.info("📋 Event Details:");
            log.info("   Event Type ID: {}", eventTypeId);
            log.info("   Event Type Name: {}", getEventTypeName(eventTypeId));
            log.info("   Event Class: {}", event.getClass().getName());
            
            // Log ALL event type IDs for debugging
            log.info("📋 Event Type Constants:");
            log.info("   ISSUE_CREATED_ID = {}", EventType.ISSUE_CREATED_ID);
            log.info("   ISSUE_UPDATED_ID = {}", EventType.ISSUE_UPDATED_ID);
            log.info("   ISSUE_RESOLVED_ID = {}", EventType.ISSUE_RESOLVED_ID);
            log.info("   ISSUE_CLOSED_ID = {}", EventType.ISSUE_CLOSED_ID);
            log.info("   ISSUE_WORKSTARTED_ID = {}", EventType.ISSUE_WORKSTARTED_ID);
            log.info("   ISSUE_WORKSTOPPED_ID = {}", EventType.ISSUE_WORKSTOPPED_ID);
            log.info("   ISSUE_REOPENED_ID = {}", EventType.ISSUE_REOPENED_ID);
            
            if (issue == null) {
                log.warn("⚠️ Issue is null, skipping event");
                return;
            }
            
            log.info("📋 Issue Details:");
            log.info("   Key: {}", issue.getKey());
            log.info("   Status: {}", issue.getStatus().getName());
            log.info("   Status ID: {}", issue.getStatus().getId());
            log.info("   Project: {}", issue.getProjectObject().getKey());
            log.info("   Type: {}", issue.getIssueType().getName());
            
            // Check if this is ANY kind of status change
            if (event.getChangeLog() != null && event.getChangeLog().getRelated("ChildChangeItem") != null) {
                log.info("📋 Change Log Items:");
                Collection<?> changeItems = event.getChangeLog().getRelated("ChildChangeItem");
                for (Object item : changeItems) {
                    log.info("   Change Item: {}", item);
                }
            }
            
            String projectKey = issue.getProjectObject().getKey();
            String eventType = getEventTypeName(eventTypeId);
            
            // Always handle dashboard update
            new Thread(() -> {
                handleDashboardUpdate(projectKey, issue, eventType);
            }).start();
            
            // Special logging for status transitions
            if (eventTypeId.equals(EventType.ISSUE_UPDATED_ID)) {
                log.info("🔍 ISSUE UPDATED EVENT - Checking for status change...");
                // For updated events, check if status changed to resolved
                String currentStatus = issue.getStatus().getName();
                if (RESOLVED_STATUSES.contains(currentStatus)) {
                    log.info("✅ Issue status is now RESOLVED: {}", currentStatus);
                    log.info("🚀 Triggering article generation for status change!");
                    
                    // Trigger article generation
                    new Thread(() -> {
                        try {
                            handleArticleGeneration(issue);
                        } catch (Exception e) {
                            log.error("❌ Error in article generation thread", e);
                        }
                    }).start();
                }
            }
            
            // Also check for resolution events
            boolean shouldGenerate = shouldGenerateArticle(eventTypeId, issue);
            log.info("📝 Should generate article (standard check): {}", shouldGenerate);
            
            if (shouldGenerate) {
                log.info("🚀 STARTING ARTICLE GENERATION (from resolution event)!");
                new Thread(() -> {
                    try {
                        handleArticleGeneration(issue);
                    } catch (Exception e) {
                        log.error("❌ Error in article generation thread", e);
                    }
                }).start();
            }
            
        } catch (Exception e) {
            log.error("❌ Error handling issue event", e);
            e.printStackTrace();
        }
        
        log.info("🏁 ========== EVENT PROCESSING COMPLETE ==========");
    }
    
    private void handleDashboardUpdate(String projectKey, Issue issue, String eventType) {
        try {
            log.info("💾 Recording dashboard update for project: {}, issue: {}", projectKey, issue.getKey());
            
            UpdateEvent updateEvent = new UpdateEvent(
                issue.getKey(),
                issue.getStatus().getName(),
                eventType,
                System.currentTimeMillis()
            );
            
            updateService.recordUpdate(projectKey, updateEvent);
            
            // Notify Python backend
            notifyPythonBackend(projectKey, eventType, issue);
            
        } catch (Exception e) {
            log.error("Error handling dashboard update", e);
        }
    }
    
    private boolean shouldGenerateArticle(Long eventTypeId, Issue issue) {
        log.info("🤔 Checking if article should be generated...");
        
        // Check if this is a resolution event
        boolean isResolutionEvent = eventTypeId.equals(EventType.ISSUE_RESOLVED_ID) || 
                                   eventTypeId.equals(EventType.ISSUE_CLOSED_ID);
        log.info("   Is resolution event: {}", isResolutionEvent);
        
        if (!isResolutionEvent) {
            return false;
        }
        
        // Check if status is resolved
        Status currentStatus = issue.getStatus();
        String statusName = currentStatus != null ? currentStatus.getName() : "null";
        boolean isResolvedStatus = currentStatus != null && RESOLVED_STATUSES.contains(statusName);
        log.info("   Current status: '{}', Is resolved: {}", statusName, isResolvedStatus);
        
        if (!isResolvedStatus) {
            return false;
        }
        
        // Check if article already exists or is being generated
        String cacheKey = "article_generation:" + issue.getKey();
        boolean inProgress = articleService.isArticleGenerationInProgress(cacheKey);
        log.info("   Generation in progress: {}", inProgress);
        
        if (inProgress) {
            return false;
        }
        
        // Check issue type
        String issueType = issue.getIssueType().getName();
        List<String> articleEligibleTypes = Arrays.asList("Bug", "Story", "Task", "Improvement");
        boolean eligibleType = articleEligibleTypes.contains(issueType);
        log.info("   Issue type: '{}', Eligible: {}", issueType, eligibleType);
        
        return eligibleType;
    }
    
    private void handleArticleGeneration(Issue issue) {
        try {
            log.info("🎊 ==========================================");
            log.info("🎊 ARTICLE GENERATION STARTED");
            log.info("🎊 Issue: {}", issue.getKey());
            log.info("🎊 ==========================================");
            
            // Mark as in progress
            String cacheKey = "article_generation:" + issue.getKey();
            articleService.markGenerationInProgress(cacheKey);
            
            // Prepare issue data
            Map<String, Object> issueData = new HashMap<>();
            issueData.put("key", issue.getKey());
            issueData.put("summary", issue.getSummary());
            issueData.put("description", issue.getDescription());
            issueData.put("status", issue.getStatus().getName());
            issueData.put("type", issue.getIssueType().getName());
            issueData.put("projectKey", issue.getProjectObject().getKey());
            
            if (issue.getResolution() != null) {
                issueData.put("resolution", issue.getResolution().getName());
            }
            
            // Call article generation API
            String articleGenUrl = "http://localhost:5001/api/article/generate/" + issue.getKey();
            log.info("🌐 Calling: {}", articleGenUrl);
            
            RequestBody body = RequestBody.create(
                MediaType.parse("application/json"),
                gson.toJson(issueData)
            );
            
            Request request = new Request.Builder()
                .url(articleGenUrl)
                .post(body)
                .addHeader("Content-Type", "application/json")
                .build();
            
            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    log.error("❌ Failed to generate article for {}: {}", issue.getKey(), e.getMessage());
                    articleService.markGenerationComplete(cacheKey);
                    articleService.storeGenerationError(issue.getKey(), e.getMessage());
                }
                
                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    try {
                        if (response.isSuccessful()) {
                            String responseBody = response.body().string();
                            log.info("✅ Article generated successfully for {}", issue.getKey());
                            
                            Map<String, Object> result = gson.fromJson(responseBody, Map.class);
                            articleService.storeArticleData(issue.getKey(), result);
                            articleService.createNotification(issue.getKey(), issue.getSummary());
                            
                        } else {
                            log.error("❌ Article generation failed with status: {}", response.code());
                            articleService.storeGenerationError(issue.getKey(), 
                                "Generation failed with status: " + response.code());
                        }
                    } finally {
                        response.close();
                        articleService.markGenerationComplete(cacheKey);
                    }
                }
            });
            
        } catch (Exception e) {
            log.error("❌ Error in article generation process: " + issue.getKey(), e);
        }
    }
    
    private void notifyPythonBackend(String projectKey, String updateType, Issue issue) {
        try {
            Map<String, Object> details = new HashMap<>();
            details.put("issueKey", issue.getKey());
            details.put("status", issue.getStatus().getName());
            details.put("summary", issue.getSummary());
            
            if (issue.getAssignee() != null) {
                details.put("assignee", issue.getAssignee().getDisplayName());
            }
            
            Map<String, Object> payload = new HashMap<>();
            payload.put("projectKey", projectKey);
            payload.put("updateType", updateType);
            payload.put("details", details);
            payload.put("timestamp", System.currentTimeMillis());
            
            String backendUrl = "http://localhost:5001/api/notify-update";
            
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
                    log.warn("Failed to notify Python backend: {}", e.getMessage());
                }
                
                @Override
                public void onResponse(Call call, Response response) throws IOException {
                    if (response.isSuccessful()) {
                        log.info("✅ Successfully notified Python backend");
                    }
                    response.close();
                }
            });
            
        } catch (Exception e) {
            log.error("Error notifying Python backend", e);
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
}