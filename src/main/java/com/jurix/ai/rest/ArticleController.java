package com.jurix.ai.rest;

import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.jurix.ai.service.ArticleGenerationService;
import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.issue.IssueManager;
import com.atlassian.jira.issue.Issue;
import com.google.gson.Gson;
import okhttp3.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Named
@Path("/article")
public class ArticleController {
    
    private static final Logger log = LoggerFactory.getLogger(ArticleController.class);
    private final ArticleGenerationService articleService;
    private final Gson gson = new Gson();
    private final OkHttpClient httpClient;
    
    @Inject
    public ArticleController(ArticleGenerationService articleService) {
        this.articleService = articleService;
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .build();
    }
    
    @GET
    @Path("/{issueKey}")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response getArticle(@PathParam("issueKey") String issueKey) {
        try {
            log.info("📖 Getting article for issue: {}", issueKey);
            
            // First check local storage
            ArticleGenerationService.ArticleData articleData = articleService.getArticleData(issueKey);
            
            if (articleData != null && articleData.article != null) {
                log.info("✅ Found article in local storage");
                
                Map<String, Object> response = new HashMap<>();
                response.put("issueKey", issueKey);
                response.put("article", articleData.article);
                response.put("status", articleData.status);
                response.put("createdAt", articleData.createdAt);
                
                return Response.ok(response).build();
            }
            
            // If not found locally, check Python backend
            log.info("🔍 Article not in local storage, checking Python backend...");
            
            String backendUrl = "http://localhost:5001/api/article/status/" + issueKey;
            Request request = new Request.Builder()
                .url(backendUrl)
                .get()
                .build();
            
            try (okhttp3.Response backendResponse = httpClient.newCall(request).execute()) {
                if (backendResponse.isSuccessful()) {
                    String responseBody = backendResponse.body().string();
                    Map<String, Object> backendData = gson.fromJson(responseBody, Map.class);
                    
                    if ("success".equals(backendData.get("status"))) {
                        // Store in local cache
                        Map<String, Object> article = (Map<String, Object>) backendData.get("article");
                        if (article != null) {
                            articleService.storeArticleData(issueKey, backendData);
                            log.info("✅ Retrieved and cached article from backend");
                        }
                        
                        return Response.ok(backendData).build();
                    }
                }
            }
            
            // Try to get issue details and generate if needed
            IssueManager issueManager = ComponentAccessor.getIssueManager();
            Issue issue = issueManager.getIssueObject(issueKey);
            
            if (issue != null) {
                // Check if issue is resolved
                String status = issue.getStatus().getName();
                if (status.equalsIgnoreCase("Done") || status.equalsIgnoreCase("Resolved") || 
                    status.equalsIgnoreCase("Closed")) {
                    
                    log.info("🔄 Issue is resolved but no article found. Generating...");
                    
                    // Trigger generation
                    Map<String, Object> issueData = new HashMap<>();
                    issueData.put("key", issue.getKey());
                    issueData.put("summary", issue.getSummary());
                    issueData.put("description", issue.getDescription());
                    issueData.put("status", status);
                    issueData.put("type", issue.getIssueType().getName());
                    issueData.put("projectKey", issue.getProjectObject().getKey());
                    
                    RequestBody body = RequestBody.create(
                        okhttp3.MediaType.parse("application/json"),
                        gson.toJson(issueData)
                    );
                    
                    Request genRequest = new Request.Builder()
                        .url("http://localhost:5001/api/article/generate/" + issueKey)
                        .post(body)
                        .build();
                    
                    try (okhttp3.Response genResponse = httpClient.newCall(genRequest).execute()) {
                        if (genResponse.isSuccessful()) {
                            String genResponseBody = genResponse.body().string();
                            Map<String, Object> genResult = gson.fromJson(genResponseBody, Map.class);
                            
                            // Store locally
                            articleService.storeArticleData(issueKey, genResult);
                            
                            return Response.ok(genResult).build();
                        }
                    }
                }
            }
            
            return Response.status(Response.Status.NOT_FOUND)
                .entity(createErrorResponse("No article found for this issue"))
                .build();
            
        } catch (Exception e) {
            log.error("Error getting article", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse("Failed to get article: " + e.getMessage()))
                .build();
        }
    }
    
    @POST
    @Path("/{issueKey}/generate")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response generateArticle(@PathParam("issueKey") String issueKey) {
        try {
            log.info("🚀 Article generation requested for: {}", issueKey);
            
            // Check if already generating
            String cacheKey = "article_generation:" + issueKey;
            if (articleService.isArticleGenerationInProgress(cacheKey)) {
                return Response.ok(createInfoResponse("Article generation already in progress")).build();
            }
            
            // Get issue details
            IssueManager issueManager = ComponentAccessor.getIssueManager();
            Issue issue = issueManager.getIssueObject(issueKey);
            
            if (issue == null) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(createErrorResponse("Issue not found"))
                    .build();
            }
            
            // Mark as generating
            articleService.markGenerationInProgress(cacheKey);
            
            // Prepare issue data
            Map<String, Object> issueData = new HashMap<>();
            issueData.put("key", issue.getKey());
            issueData.put("summary", issue.getSummary());
            issueData.put("description", issue.getDescription());
            issueData.put("status", issue.getStatus().getName());
            issueData.put("type", issue.getIssueType().getName());
            issueData.put("projectKey", issue.getProjectObject().getKey());
            
            // Call Python backend
            String backendUrl = "http://localhost:5001/api/article/generate/" + issueKey;
            
            RequestBody body = RequestBody.create(
                okhttp3.MediaType.parse("application/json"),
                gson.toJson(issueData)
            );
            
            Request request = new Request.Builder()
                .url(backendUrl)
                .post(body)
                .build();
            
            // Execute synchronously to return result
            try (okhttp3.Response response = httpClient.newCall(request).execute()) {
                String responseBody = response.body().string();
                
                if (response.isSuccessful()) {
                    Map<String, Object> result = gson.fromJson(responseBody, Map.class);
                    
                    // Store the article data
                    articleService.storeArticleData(issueKey, result);
                    articleService.createNotification(issueKey, issue.getSummary());
                    
                    log.info("✅ Article generated and stored successfully");
                    return Response.ok(result).build();
                } else {
                    log.error("Backend error: {} - {}", response.code(), responseBody);
                    articleService.storeGenerationError(issueKey, "Backend error: " + response.code());
                    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(createErrorResponse("Failed to generate article"))
                        .build();
                }
            } finally {
                articleService.markGenerationComplete(cacheKey);
            }
            
        } catch (Exception e) {
            log.error("Error starting article generation", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse("Failed to start generation: " + e.getMessage()))
                .build();
        }
    }
    
    @POST
    @Path("/{issueKey}/feedback")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response submitFeedback(@PathParam("issueKey") String issueKey, Map<String, Object> feedbackData) {
        try {
            log.info("📝 ===== FEEDBACK SUBMISSION =====");
            log.info("📝 Issue Key: {}", issueKey);
            log.info("📝 Feedback Data: {}", gson.toJson(feedbackData));
            
            // Validate input
            if (feedbackData == null || feedbackData.isEmpty()) {
                log.error("❌ Empty feedback data received");
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(createErrorResponse("Invalid feedback data"))
                    .build();
            }
            
            // Check if Python backend is available
            String healthUrl = "http://localhost:5001/health";
            try {
                Request healthCheck = new Request.Builder()
                    .url(healthUrl)
                    .get()
                    .build();
                
                try (okhttp3.Response healthResponse = httpClient.newCall(healthCheck).execute()) {
                    if (!healthResponse.isSuccessful()) {
                        log.error("❌ Python backend health check failed: {}", healthResponse.code());
                        return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                            .entity(createErrorResponse("Backend service is not available"))
                            .build();
                    }
                }
            } catch (Exception e) {
                log.error("❌ Cannot connect to Python backend", e);
                return Response.status(Response.Status.SERVICE_UNAVAILABLE)
                    .entity(createErrorResponse("Cannot connect to backend service"))
                    .build();
            }
            
            // Forward to Python backend
            String backendUrl = "http://localhost:5001/api/article/feedback/" + issueKey;
            log.info("📤 Forwarding to Python backend: {}", backendUrl);
            
            RequestBody body = RequestBody.create(
                okhttp3.MediaType.parse("application/json"),
                gson.toJson(feedbackData)
            );
            
            Request request = new Request.Builder()
                .url(backendUrl)
                .post(body)
                .build();
            
            try (okhttp3.Response response = httpClient.newCall(request).execute()) {
                String responseBody = response.body().string();
                log.info("📨 Python backend response code: {}", response.code());
                log.info("📨 Python backend response body: {}", responseBody);
                
                if (response.isSuccessful()) {
                    Map<String, Object> result = gson.fromJson(responseBody, Map.class);
                    
                    // Update local storage if article was refined
                    if (result.get("article") != null) {
                        log.info("💾 Updating local article storage");
                        articleService.storeArticleData(issueKey, result);
                    }
                    
                    log.info("✅ Feedback processed successfully");
                    return Response.ok(result).build();
                } else {
                    log.error("❌ Python backend returned error: {} - {}", response.code(), responseBody);
                    
                    // Try to parse error message
                    String errorMessage = "Failed to process feedback";
                    try {
                        Map<String, Object> errorResponse = gson.fromJson(responseBody, Map.class);
                        if (errorResponse.containsKey("error")) {
                            errorMessage = (String) errorResponse.get("error");
                        }
                    } catch (Exception e) {
                        // Use default error message
                    }
                    
                    return Response.status(response.code())
                        .entity(createErrorResponse(errorMessage))
                        .build();
                }
            }
            
        } catch (Exception e) {
            log.error("❌ Error submitting feedback", e);
            e.printStackTrace();
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse("Internal error: " + e.getMessage()))
                .build();
        }
    }

    // Also add a test endpoint to verify feedback works
    @POST
    @Path("/test-feedback")
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response testFeedback(Map<String, Object> testData) {
        log.info("🧪 Test feedback endpoint called");
        
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", "Test feedback received");
        response.put("received_data", testData);
        response.put("timestamp", System.currentTimeMillis());
        
        return Response.ok(response).build();
    }
    
    @GET
    @Path("/test/{issueKey}")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response testArticleGeneration(@PathParam("issueKey") String issueKey) {
        try {
            // Create test article data
            Map<String, Object> testArticle = new HashMap<>();
            testArticle.put("title", "Resolution Guide: " + issueKey);
            testArticle.put("content", "# Issue Resolution\n\nThis issue was successfully resolved.\n\n## Problem\nThe problem was identified as...\n\n## Solution\nThe following steps were taken:\n1. Step 1\n2. Step 2\n3. Step 3\n\n## Prevention\nTo prevent this in the future...");
            testArticle.put("version", 1);
            testArticle.put("approval_status", "pending");
            testArticle.put("created_at", System.currentTimeMillis());
            
            Map<String, Object> articleData = new HashMap<>();
            articleData.put("article", testArticle);
            articleData.put("status", "success");
            
            // Store test article
            articleService.storeArticleData(issueKey, articleData);
            
            return Response.ok(createSuccessResponse("Test article created")).build();
            
        } catch (Exception e) {
            log.error("Error creating test article", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse(e.getMessage()))
                .build();
        }
    }
    
    private Map<String, Object> createSuccessResponse(String message) {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "success");
        response.put("message", message);
        return response;
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