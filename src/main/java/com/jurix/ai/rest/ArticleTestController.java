package com.jurix.ai.rest;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.issue.IssueManager;
import com.atlassian.jira.issue.Issue;
import com.atlassian.jira.event.type.EventType;
import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.jurix.ai.service.ArticleGenerationService;
import com.jurix.ai.listener.IssueEventListener;
import com.google.gson.Gson;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Named
@Path("/article-test")
public class ArticleTestController {
    
    private static final Logger log = LoggerFactory.getLogger(ArticleTestController.class);
    private final ArticleGenerationService articleService;
    private final Gson gson = new Gson();
    private final OkHttpClient httpClient;
    
    @Inject
    public ArticleTestController(ArticleGenerationService articleService) {
        this.articleService = articleService;
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();
    }
    
    @GET
    @Path("/status")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response getStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("articleService", articleService != null ? "LOADED" : "NULL");
        status.put("httpClient", httpClient != null ? "LOADED" : "NULL");
        status.put("time", System.currentTimeMillis());
        
        log.info("🔍 Article Test Status Check:");
        log.info("   ArticleService: {}", articleService);
        log.info("   HttpClient: {}", httpClient);
        
        return Response.ok(status).build();
    }
    
    @POST
    @Path("/trigger/{issueKey}")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response triggerArticleGeneration(@PathParam("issueKey") String issueKey) {
        log.info("🚀 ========================================");
        log.info("🚀 MANUAL ARTICLE GENERATION TRIGGER");
        log.info("🚀 Issue Key: {}", issueKey);
        log.info("🚀 ========================================");
        
        try {
            // Get the issue
            IssueManager issueManager = ComponentAccessor.getIssueManager();
            Issue issue = issueManager.getIssueObject(issueKey);
            
            if (issue == null) {
                log.error("❌ Issue not found: {}", issueKey);
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(createErrorResponse("Issue not found"))
                    .build();
            }
            
            log.info("📋 Issue found:");
            log.info("   Key: {}", issue.getKey());
            log.info("   Summary: {}", issue.getSummary());
            log.info("   Status: {}", issue.getStatus().getName());
            log.info("   Type: {}", issue.getIssueType().getName());
            
            // Check if already generating
            String cacheKey = "article_generation:" + issue.getKey();
            if (articleService.isArticleGenerationInProgress(cacheKey)) {
                log.warn("⚠️ Article generation already in progress");
                return Response.ok(createInfoResponse("Article generation already in progress")).build();
            }
            
            // Mark as in progress
            log.info("🔄 Marking generation as in progress...");
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
            
            log.info("📦 Prepared issue data: {}", gson.toJson(issueData));
            
            // Call article generation API
            String articleGenUrl = "http://localhost:5001/api/article/generate/" + issue.getKey();
            log.info("🌐 Calling URL: {}", articleGenUrl);
            
            RequestBody body = RequestBody.create(
                okhttp3.MediaType.parse("application/json"),
                gson.toJson(issueData)
            );
            
            Request request = new Request.Builder()
                .url(articleGenUrl)
                .post(body)
                .addHeader("Content-Type", "application/json")
                .build();
            
            log.info("📤 Sending request to Python backend...");
            
            // Synchronous call for testing
            try (okhttp3.Response response = httpClient.newCall(request).execute()) {
                log.info("📨 Response received: {}", response.code());
                String responseBody = response.body().string();
                log.info("📄 Response body length: {} chars", responseBody.length());
                
                if (response.isSuccessful()) {
                    log.info("✅ Article generated successfully!");
                    
                    // Parse response
                    Map<String, Object> result = gson.fromJson(responseBody, Map.class);
                    
                    // Store article data
                    articleService.storeArticleData(issue.getKey(), result);
                    log.info("💾 Article data stored");
                    
                    // Create notification
                    articleService.createNotification(issue.getKey(), issue.getSummary());
                    log.info("🔔 Notification created");
                    
                    articleService.markGenerationComplete(cacheKey);
                    
                    return Response.ok(result).build();
                } else {
                    log.error("❌ Generation failed: {} - {}", response.code(), responseBody);
                    articleService.storeGenerationError(issue.getKey(), 
                        "Generation failed: " + response.code());
                    articleService.markGenerationComplete(cacheKey);
                    
                    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(createErrorResponse("Generation failed: " + response.code()))
                        .build();
                }
            }
            
        } catch (Exception e) {
            log.error("❌ Critical error in article generation test", e);
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse(e.getMessage()))
                .build();
        }
    }
    
    @GET
    @Path("/check-backend")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response checkBackend() {
        log.info("🔍 Checking Python backend connection...");
        
        try {
            String healthUrl = "http://localhost:5001/health";
            Request request = new Request.Builder()
                .url(healthUrl)
                .get()
                .build();
            
            try (okhttp3.Response response = httpClient.newCall(request).execute()) {
                String body = response.body().string();
                log.info("✅ Backend health check: {} - {}", response.code(), body);
                
                Map<String, Object> result = new HashMap<>();
                result.put("backendStatus", response.code());
                result.put("backendResponse", body);
                result.put("backendAvailable", response.isSuccessful());
                
                return Response.ok(result).build();
            }
        } catch (Exception e) {
            log.error("❌ Backend check failed", e);
            return Response.ok(createErrorResponse("Backend unavailable: " + e.getMessage())).build();
        }
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "error");
        response.put("error", message);
        return response;
    }
    
    private Map<String, Object> createInfoResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "info");
        response.put("message", message);
        return response;
    }
}