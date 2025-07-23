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
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.JedisPoolConfig;

import javax.inject.Inject;
import javax.inject.Named;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.ConcurrentHashMap;
import java.net.URL;
import java.net.HttpURLConnection;
import java.io.OutputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.SocketTimeoutException;

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
    
    // Redis connection for persistent storage
    private JedisPool jedisPool;
    
    // Redis keys
    private static final String ARTICLE_GENERATED_PREFIX = "article_generated:";
    private static final String ARTICLE_IN_PROGRESS_PREFIX = "article_in_progress:";
    private static final String LISTENER_STARTUP_TIME = "listener_startup_time";
    
    // Track current session startup time
    private long startupTime;
    
    // Time to wait before considering an "in progress" generation as stale
    private static final long IN_PROGRESS_TIMEOUT_MS = 900000; // 15 minutes

    @Inject
    public IssueEventListener(@ComponentImport EventPublisher eventPublisher,
                             DashboardUpdateService updateService,
                             ArticleGenerationService articleService) {
        this.eventPublisher = eventPublisher;
        this.updateService = updateService;
        this.articleService = articleService;
        log.info("🚀 IssueEventListener CONSTRUCTOR called");
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        log.info("🟢 ==========================================");
        log.info("🟢 IssueEventListener.afterPropertiesSet()");
        log.info("🟢 ==========================================");
        
        try {
            // Initialize Redis connection
            initializeRedis();
            
            // Record startup time
            startupTime = System.currentTimeMillis();
            try (Jedis jedis = jedisPool.getResource()) {
                jedis.set(LISTENER_STARTUP_TIME, String.valueOf(startupTime));
            }
            log.info("📝 Recorded startup time: {}", new Date(startupTime));
            
            // Initialize HTTP client
            this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)  
                .readTimeout(500, TimeUnit.SECONDS) 
                .build();
            
            // Register with event publisher
            log.info("📝 Attempting to register with EventPublisher...");
            eventPublisher.register(this);
            registered = true;
            log.info("✅ SUCCESSFULLY REGISTERED with EventPublisher!");
            
            // Clean up any stale "in progress" entries
            cleanupStaleInProgressEntries();
            
        } catch (Exception e) {
            log.error("❌ Failed to register event listener!", e);
            throw e;
        }
    }

    private void initializeRedis() {
        JedisPoolConfig poolConfig = new JedisPoolConfig();
        poolConfig.setMaxTotal(128);
        poolConfig.setMaxIdle(128);
        poolConfig.setMinIdle(16);
        poolConfig.setTestOnBorrow(true);
        poolConfig.setTestOnReturn(true);
        poolConfig.setTestWhileIdle(true);
        poolConfig.setNumTestsPerEvictionRun(3);
        poolConfig.setBlockWhenExhausted(true);
        
        // Connect to Redis
        jedisPool = new JedisPool(poolConfig, "localhost", 6379, 2000);
        
        // Test connection
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.ping();
            log.info("✅ Connected to Redis for persistent article tracking");
        } catch (Exception e) {
            log.error("❌ Failed to connect to Redis", e);
            throw new RuntimeException("Redis connection required for article tracking", e);
        }
    }

    private void cleanupStaleInProgressEntries() {
        try (Jedis jedis = jedisPool.getResource()) {
            Set<String> inProgressKeys = jedis.keys(ARTICLE_IN_PROGRESS_PREFIX + "*");
            int cleaned = 0;
            
            for (String key : inProgressKeys) {
                String value = jedis.get(key);
                if (value != null) {
                    try {
                        long timestamp = Long.parseLong(value);
                        if (System.currentTimeMillis() - timestamp > IN_PROGRESS_TIMEOUT_MS) {
                            jedis.del(key);
                            cleaned++;
                        }
                    } catch (NumberFormatException e) {
                        // Invalid value, delete it
                        jedis.del(key);
                        cleaned++;
                    }
                }
            }
            
            if (cleaned > 0) {
                log.info("🧹 Cleaned up {} stale in-progress entries", cleaned);
            }
        } catch (Exception e) {
            log.error("Error cleaning up stale entries", e);
        }
    }

    @Override
    public void destroy() throws Exception {
        log.info("🔴 IssueEventListener.destroy() - UNREGISTERING");
        if (registered) {
            eventPublisher.unregister(this);
            registered = false;
        }
        if (jedisPool != null && !jedisPool.isClosed()) {
            jedisPool.close();
        }
        log.info("JURIX Issue Event Listener unregistered");
    }

    @EventListener
    public void onIssueEvent(IssueEvent event) {
        try {
            Long eventTypeId = event.getEventTypeId();
            Issue issue = event.getIssue();
            
            if (issue == null) {
                log.warn("Issue is null, skipping event");
                return;
            }
            
            String issueKey = issue.getKey();
            String projectKey = issue.getProjectObject().getKey();
            String eventType = getEventTypeName(eventTypeId);
            
            // Get issue resolution date
            Date resolutionDate = issue.getResolutionDate();
            
            log.info("📌 Event: {} - Issue: {} - Status: {} - Resolution Date: {}", 
                     eventType, issueKey, issue.getStatus().getName(), resolutionDate);
            
            // Always handle dashboard update in a separate thread
            new Thread(() -> {
                handleDashboardUpdate(projectKey, issue, eventType);
            }).start();
            
            // CRITICAL: Only generate articles for issues that were JUST resolved
            // (not for issues that were already resolved before startup)
            
            // First check: Is this an update event on an already resolved issue?
            if (eventTypeId.equals(EventType.ISSUE_UPDATED_ID)) {
                
                // If the issue has a resolution date that's before our startup time,
                // it was already resolved when we started - skip it
                if (resolutionDate != null && resolutionDate.getTime() < startupTime) {
                    log.info("⏭️ Skipping article generation - issue {} was resolved before startup", issueKey);
                    return;
                }
            }
            
            // Only process article generation for RESOLUTION events
            boolean isResolutionEvent = eventTypeId.equals(EventType.ISSUE_RESOLVED_ID) || 
                                      eventTypeId.equals(EventType.ISSUE_CLOSED_ID);
            
            if (!isResolutionEvent) {
                log.debug("Not a resolution event, skipping article generation for {}", issueKey);
                return;
            }
            
            String currentStatus = issue.getStatus().getName();
            
            // Check if issue is in a resolved status
            if (!RESOLVED_STATUSES.contains(currentStatus)) {
                log.debug("Issue {} not in resolved status ({}), skipping", issueKey, currentStatus);
                return;
            }
            
            // Check Redis for existing article generation
            if (hasArticleBeenGenerated(issueKey)) {
                log.info("✅ Article already generated for issue: {}, skipping", issueKey);
                return;
            }
            
            // Check if article generation is already in progress
            if (!markArticleGenerationInProgress(issueKey)) {
                log.info("⚠️ Article generation already in progress for issue: {}, skipping", issueKey);
                return;
            }
            
            // Check if article already exists in storage
            ArticleGenerationService.ArticleData existingArticle = 
                articleService.getArticleData(issueKey);
            
            if (existingArticle != null && existingArticle.status != null && 
                !existingArticle.status.equals("error")) {
                log.info("📄 Article already exists in storage for issue: {}, marking as complete", issueKey);
                markArticleGenerationComplete(issueKey);
                return;
            }
            
            // ARTICLE GENERATION TEMPORARILY DISABLED FOR TESTING
            log.info("⏸️ Article generation DISABLED for testing - would generate for: {}", issueKey);
            
            /* COMMENTED OUT FOR TESTING - Remove this comment block to re-enable
            // Start article generation in a separate thread
            log.info("🚀 Starting article generation for newly resolved issue: {}", issueKey);
            
            new Thread(() -> {
                try {
                    handleArticleGeneration(issue);
                    markArticleGenerationComplete(issueKey);
                } catch (Exception e) {
                    log.error("Error in article generation thread for {}", issueKey, e);
                    // Remove from in-progress on error
                    clearArticleGenerationInProgress(issueKey);
                }
            }).start();
            */
            
        } catch (Exception e) {
            log.error("Error handling issue event", e);
        }
    }
    
    private boolean hasArticleBeenGenerated(String issueKey) {
        try (Jedis jedis = jedisPool.getResource()) {
            return jedis.exists(ARTICLE_GENERATED_PREFIX + issueKey);
        } catch (Exception e) {
            log.error("Error checking if article was generated for {}", issueKey, e);
            // On error, assume it was generated to prevent duplicates
            return true;
        }
    }
    
    private boolean markArticleGenerationInProgress(String issueKey) {
        try (Jedis jedis = jedisPool.getResource()) {
            String key = ARTICLE_IN_PROGRESS_PREFIX + issueKey;
            // Set if not exists, with 15 minute expiry
            Long result = jedis.setnx(key, String.valueOf(System.currentTimeMillis()));
            if (result == 1) {
                jedis.expire(key, 900); // 15 minutes
                return true;
            }
            return false;
        } catch (Exception e) {
            log.error("Error marking article generation in progress for {}", issueKey, e);
            return false;
        }
    }
    
    private void clearArticleGenerationInProgress(String issueKey) {
        try (Jedis jedis = jedisPool.getResource()) {
            jedis.del(ARTICLE_IN_PROGRESS_PREFIX + issueKey);
        } catch (Exception e) {
            log.error("Error clearing in-progress status for {}", issueKey, e);
        }
    }
    
    private void markArticleGenerationComplete(String issueKey) {
        try (Jedis jedis = jedisPool.getResource()) {
            // Mark as complete with timestamp
            jedis.set(ARTICLE_GENERATED_PREFIX + issueKey, String.valueOf(System.currentTimeMillis()));
            // Set expiry to 30 days
            jedis.expire(ARTICLE_GENERATED_PREFIX + issueKey, 2592000);
            
            // Clear in-progress flag
            clearArticleGenerationInProgress(issueKey);
            
            log.info("✅ Marked article generation complete for {}", issueKey);
        } catch (Exception e) {
            log.error("Error marking article generation complete for {}", issueKey, e);
        }
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
    
    private void handleArticleGeneration(Issue issue) {
        String issueKey = issue.getKey();
        
        try {
            log.info("🎊 ARTICLE GENERATION STARTED for: {}", issueKey);
            
            // Prepare issue data
            Map<String, Object> issueData = new HashMap<>();
            issueData.put("key", issueKey);
            issueData.put("summary", issue.getSummary());
            issueData.put("description", issue.getDescription());
            issueData.put("status", issue.getStatus().getName());
            issueData.put("type", issue.getIssueType().getName());
            issueData.put("projectKey", issue.getProjectObject().getKey());
            
            String articleGenUrl = "http://localhost:5001/api/article/generate/" + issueKey;
            log.info("🌐 Calling Python backend: {}", articleGenUrl);
            
            // Use URLConnection with explicit timeout
            URL url = new URL(articleGenUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);
            
            // Set LONG timeouts
            conn.setConnectTimeout(30000);  // 30 seconds
            conn.setReadTimeout(600000);     // 10 MINUTES
            
            log.info("⏱️ Timeouts set: connect=30s, read=10min");
            
            // Send request
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = gson.toJson(issueData).getBytes("utf-8");
                os.write(input, 0, input.length);
            }
            
            // Get response
            int responseCode = conn.getResponseCode();
            log.info("📨 Response code: {}", responseCode);
            
            if (responseCode == 200) {
                // Read response
                StringBuilder response = new StringBuilder();
                try (BufferedReader br = new BufferedReader(
                        new InputStreamReader(conn.getInputStream(), "utf-8"))) {
                    String responseLine;
                    while ((responseLine = br.readLine()) != null) {
                        response.append(responseLine.trim());
                    }
                }
                
                String responseBody = response.toString();
                log.info("✅ Article generated successfully for {}", issueKey);
                
                Map<String, Object> result = gson.fromJson(responseBody, Map.class);
                articleService.storeArticleData(issueKey, result);
                articleService.createNotification(issueKey, issue.getSummary());
                
            } else {
                log.error("❌ Python backend returned error: {}", responseCode);
                articleService.storeGenerationError(issueKey, "HTTP " + responseCode);
            }
            
            conn.disconnect();
            
        } catch (SocketTimeoutException e) {
            log.error("❌ TIMEOUT after waiting! Issue: {}", issueKey);
            articleService.storeGenerationError(issueKey, "Timeout: " + e.getMessage());
        } catch (Exception e) {
            log.error("❌ Error generating article for {}: {}", issueKey, e.getMessage(), e);
            articleService.storeGenerationError(issueKey, e.getMessage());
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
                        log.debug("Successfully notified Python backend");
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