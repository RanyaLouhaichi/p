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
    private boolean registered = false;
    private JedisPool jedisPool;
    private boolean redisEnabled = false;
    private final Set<String> generatedArticles = ConcurrentHashMap.newKeySet();
    private final Set<String> inProgressArticles = ConcurrentHashMap.newKeySet();
    private static final String ARTICLE_GENERATED_PREFIX = "article_generated:";
    private static final String ARTICLE_IN_PROGRESS_PREFIX = "article_in_progress:";
    private static final String LISTENER_STARTUP_TIME = "listener_startup_time";
    private long startupTime;
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
            initializeRedisOptional();
            startupTime = System.currentTimeMillis();
            if (redisEnabled) {
                try (Jedis jedis = jedisPool.getResource()) {
                    jedis.set(LISTENER_STARTUP_TIME, String.valueOf(startupTime));
                }
            }
            log.info("📝 Recorded startup time: {}", new Date(startupTime));
            this.httpClient = new OkHttpClient.Builder()
                .connectTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)  
                .readTimeout(500, TimeUnit.SECONDS) 
                .build();
            log.info("📝 Attempting to register with EventPublisher...");
            eventPublisher.register(this);
            registered = true;
            log.info("✅ SUCCESSFULLY REGISTERED with EventPublisher!");
            if (redisEnabled) {
                cleanupStaleInProgressEntries();
            }
            
        } catch (Exception e) {
            log.error("❌ Failed to register event listener!", e);
            throw e;
        }
    }

    private void initializeRedisOptional() {
        try {
            JedisPoolConfig poolConfig = new JedisPoolConfig();
            poolConfig.setMaxTotal(128);
            poolConfig.setMaxIdle(128);
            poolConfig.setMinIdle(16);
            poolConfig.setTestOnBorrow(true);
            poolConfig.setTestOnReturn(true);
            poolConfig.setTestWhileIdle(true);
            poolConfig.setNumTestsPerEvictionRun(3);
            jedisPool = new JedisPool(poolConfig, "localhost", 6379, 2000);

            try (Jedis jedis = jedisPool.getResource()) {
                jedis.ping();
                redisEnabled = true;
                log.info("✅ Connected to Redis for persistent article tracking");
            }
        } catch (Exception e) {
            log.warn("⚠️ Redis not available - using in-memory storage for article tracking");
            log.warn("   To enable persistent tracking, please start Redis on localhost:6379");
            redisEnabled = false;
            if (jedisPool != null) {
                try {
                    jedisPool.close();
                } catch (Exception ex) {
                }
                jedisPool = null;
            }
        }
    }

    private void cleanupStaleInProgressEntries() {
        if (!redisEnabled) return;
        
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
            Date resolutionDate = issue.getResolutionDate();
            
            log.info("📌 Event: {} - Issue: {} - Status: {} - Resolution Date: {}", 
                     eventType, issueKey, issue.getStatus().getName(), resolutionDate);
            new Thread(() -> {
                handleDashboardUpdate(projectKey, issue, eventType);
            }).start();
            log.debug("Article generation is currently disabled");
            
        } catch (Exception e) {
            log.error("Error handling issue event", e);
        }
    }
    
    private boolean hasArticleBeenGenerated(String issueKey) {
        if (redisEnabled) {
            try (Jedis jedis = jedisPool.getResource()) {
                return jedis.exists(ARTICLE_GENERATED_PREFIX + issueKey);
            } catch (Exception e) {
                log.error("Error checking if article was generated for {}", issueKey, e);
            }
        }
        return generatedArticles.contains(issueKey);
    }
    
    private boolean markArticleGenerationInProgress(String issueKey) {
        if (redisEnabled) {
            try (Jedis jedis = jedisPool.getResource()) {
                String key = ARTICLE_IN_PROGRESS_PREFIX + issueKey;
                Long result = jedis.setnx(key, String.valueOf(System.currentTimeMillis()));
                if (result == 1) {
                    jedis.expire(key, 900); 
                    return true;
                }
                return false;
            } catch (Exception e) {
                log.error("Error marking article generation in progress for {}", issueKey, e);
            }
        }
        return inProgressArticles.add(issueKey);
    }
    
    private void clearArticleGenerationInProgress(String issueKey) {
        if (redisEnabled) {
            try (Jedis jedis = jedisPool.getResource()) {
                jedis.del(ARTICLE_IN_PROGRESS_PREFIX + issueKey);
            } catch (Exception e) {
                log.error("Error clearing in-progress status for {}", issueKey, e);
            }
        }
        inProgressArticles.remove(issueKey);
    }
    
    private void markArticleGenerationComplete(String issueKey) {
        if (redisEnabled) {
            try (Jedis jedis = jedisPool.getResource()) {
                jedis.set(ARTICLE_GENERATED_PREFIX + issueKey, String.valueOf(System.currentTimeMillis()));
                jedis.expire(ARTICLE_GENERATED_PREFIX + issueKey, 2592000);
                clearArticleGenerationInProgress(issueKey);
                
                log.info("✅ Marked article generation complete for {}", issueKey);
            } catch (Exception e) {
                log.error("Error marking article generation complete for {}", issueKey, e);
            }
        }
        generatedArticles.add(issueKey);
        inProgressArticles.remove(issueKey);
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
            notifyPythonBackend(projectKey, eventType, issue);
            
        } catch (Exception e) {
            log.error("Error handling dashboard update", e);
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
            
            String backendUrl = "http://host.docker.internal:5001/api/notify-update";
            
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