package com.jurix.ai.rest;

import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.jurix.ai.service.ArticleGenerationService;
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
    public Response getArticle(@PathParam("issueKey") String issueKey) {
        try {
            ArticleGenerationService.ArticleData articleData = articleService.getArticleData(issueKey);
            
            if (articleData == null) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(createErrorResponse("Article not found"))
                    .build();
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("issueKey", issueKey);
            response.put("article", articleData.article);
            response.put("status", articleData.status);
            response.put("createdAt", articleData.createdAt);
            
            return Response.ok(response).build();
            
        } catch (Exception e) {
            log.error("Error getting article", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse("Failed to get article"))
                .build();
        }
    }
    
    @POST
    @Path("/{issueKey}/generate")
    @Produces(MediaType.APPLICATION_JSON)
    public Response generateArticle(@PathParam("issueKey") String issueKey) {
        try {
            // Check if already generating
            String cacheKey = "article_generation:" + issueKey;
            if (articleService.isArticleGenerationInProgress(cacheKey)) {
                return Response.ok(createInfoResponse("Article generation already in progress")).build();
            }
            
            // Mark as generating
            articleService.markGenerationInProgress(cacheKey);
            
            // Call Python backend
            String backendUrl = "http://localhost:5001/api/article/generate/" + issueKey;
            
            Request request = new Request.Builder()
                .url(backendUrl)
                .post(RequestBody.create(okhttp3.MediaType.parse("application/json"), "{}"))
                .build();
            
            httpClient.newCall(request).enqueue(new Callback() {
                @Override
                public void onFailure(Call call, IOException e) {
                    log.error("Failed to generate article", e);
                    articleService.markGenerationComplete(cacheKey);
                    articleService.storeGenerationError(issueKey, e.getMessage());
                }
                
                @Override
                public void onResponse(Call call, okhttp3.Response response) throws IOException {
                    try {
                        if (response.isSuccessful()) {
                            String responseBody = response.body().string();
                            Map<String, Object> result = gson.fromJson(responseBody, Map.class);
                            articleService.storeArticleData(issueKey, result);
                            articleService.createNotification(issueKey, "Article ready");
                        }
                    } finally {
                        response.close();
                        articleService.markGenerationComplete(cacheKey);
                    }
                }
            });
            
            return Response.ok(createSuccessResponse("Article generation started")).build();
            
        } catch (Exception e) {
            log.error("Error starting article generation", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse("Failed to start generation"))
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