package com.jurix.ai.rest;

import javax.inject.Named;
import javax.inject.Inject;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.codehaus.jackson.map.ObjectMapper;
import org.codehaus.jackson.map.DeserializationConfig;
import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.RequestBody;
import okhttp3.Response;
import okhttp3.MediaType;

import com.jurix.ai.config.JurixConfiguration;

/**
 * Service for communicating with the Python backend
 */
@Named
public class ChatService {
    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
    
    private static final int TIMEOUT_SECONDS = 120; // 2 minutes timeout
    
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final JurixConfiguration configuration;
    
    @Inject
    public ChatService(JurixConfiguration configuration) {
        this.configuration = configuration;
        
        // Configure HTTP client with custom timeouts
        this.httpClient = new OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .readTimeout(TIMEOUT_SECONDS, TimeUnit.SECONDS)
            .build();
            
        // Configure JSON mapper
        this.objectMapper = new ObjectMapper();
        this.objectMapper.configure(DeserializationConfig.Feature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }
    
    /**
     * Send a chat message to the Python backend
     */
    public ChatController.ChatResponse sendChatMessage(String query, String conversationId, String username) 
            throws IOException {
        
        log.info("Sending chat message to Python backend: conversationId={}, username={}", 
                conversationId, username);
        log.info("Backend URL: {}", configuration.getBackendUrl());
        
        // Build request payload
        Map<String, Object> requestData = new HashMap<>();
        requestData.put("query", query);
        requestData.put("conversationId", conversationId);
        
        // Convert to JSON
        String jsonPayload = objectMapper.writeValueAsString(requestData);
        log.debug("Request payload: {}", jsonPayload);
        
        // Create HTTP request
        RequestBody body = RequestBody.create(
            MediaType.parse("application/json; charset=utf-8"), 
            jsonPayload
        );
        
        Request request = new Request.Builder()
            .url(configuration.getBackendUrl() + "/api/chat")
            .post(body)
            .addHeader("Content-Type", "application/json")
            .addHeader("Accept", "application/json")
            .build();
        
        // Execute request
        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body().string();
            log.info("Response code from backend: {}", response.code());
            
            if (!response.isSuccessful()) {
                log.error("Python backend returned error: {} - Body: {}", 
                    response.code(), responseBody);
                
                // Try to parse error response
                try {
                    Map<String, Object> errorResponse = objectMapper.readValue(
                        responseBody, Map.class);
                    String errorMessage = (String) errorResponse.get("error");
                    throw new IOException("Backend error: " + response.code() + 
                        " - " + (errorMessage != null ? errorMessage : "Unknown error"));
                } catch (Exception e) {
                    throw new IOException("Backend error: " + response.code() + 
                        " - Response: " + responseBody);
                }
            }
            
            // Parse response
            log.info("Successfully received response from Python backend");
            log.debug("Response from Python backend: {}", responseBody);
            
            // Convert to response object
            PythonBackendResponse backendResponse = objectMapper.readValue(
                responseBody, 
                PythonBackendResponse.class
            );
            
            // Transform to our response format
            return transformResponse(backendResponse, conversationId);
        }
    }
    
    /**
     * Transform Python backend response to our format
     */
    private ChatController.ChatResponse transformResponse(
            PythonBackendResponse backendResponse, 
            String conversationId) {
        
        ChatController.ChatResponse response = new ChatController.ChatResponse();
        
        // Set basic fields
        response.setResponse(backendResponse.getResponse());
        response.setConversationId(conversationId);
        response.setWorkflowStatus(backendResponse.getStatus() != null ? backendResponse.getStatus() : "success");
        
        // Transform articles
        if (backendResponse.getArticles() != null) {
            List<ChatController.Article> articles = new ArrayList<>();
            for (Map<String, Object> articleData : backendResponse.getArticles()) {
                ChatController.Article article = new ChatController.Article();
                article.setTitle((String) articleData.get("title"));
                article.setContent((String) articleData.get("content"));
                
                // Handle relevance score
                Object relevanceScore = articleData.get("relevance_score");
                if (relevanceScore instanceof Number) {
                    article.setRelevanceScore(((Number) relevanceScore).doubleValue());
                }
                
                articles.add(article);
            }
            response.setArticles(articles);
        }
        
        // Set recommendations
        if (backendResponse.getRecommendations() != null) {
            response.setRecommendations(backendResponse.getRecommendations());
        }
        
        // Set predictions
        if (backendResponse.getPredictions() != null) {
            response.setPredictions(backendResponse.getPredictions());
        }
        
        // Set collaboration metadata
        if (backendResponse.getCollaborationMetadata() != null) {
            response.setCollaborationMetadata(backendResponse.getCollaborationMetadata());
        }
        
        return response;
    }
    
    /**
     * Internal class to represent Python backend response
     */
    private static class PythonBackendResponse {
        private String query;
        private String response;
        private String conversation_id;
        private String status;
        private String project_context;
        private List<Map<String, Object>> articles;
        private List<String> recommendations;
        private Integer tickets_analyzed;
        private Map<String, Object> predictions;
        private Map<String, Object> collaborationMetadata;
        private String workflowStatus;
        
        // Getters and setters
        public String getQuery() {
            return query;
        }
        
        public void setQuery(String query) {
            this.query = query;
        }
        
        public String getResponse() {
            return response;
        }
        
        public void setResponse(String response) {
            this.response = response;
        }
        
        public String getConversation_id() {
            return conversation_id;
        }
        
        public void setConversation_id(String conversation_id) {
            this.conversation_id = conversation_id;
        }
        
        public String getStatus() {
            return status;
        }
        
        public void setStatus(String status) {
            this.status = status;
        }
        
        public String getProject_context() {
            return project_context;
        }
        
        public void setProject_context(String project_context) {
            this.project_context = project_context;
        }
        
        public List<Map<String, Object>> getArticles() {
            return articles;
        }
        
        public void setArticles(List<Map<String, Object>> articles) {
            this.articles = articles;
        }
        
        public List<String> getRecommendations() {
            return recommendations;
        }
        
        public void setRecommendations(List<String> recommendations) {
            this.recommendations = recommendations;
        }
        
        public Integer getTickets_analyzed() {
            return tickets_analyzed;
        }
        
        public void setTickets_analyzed(Integer tickets_analyzed) {
            this.tickets_analyzed = tickets_analyzed;
        }
        
        public Map<String, Object> getPredictions() {
            return predictions;
        }
        
        public void setPredictions(Map<String, Object> predictions) {
            this.predictions = predictions;
        }
        
        public Map<String, Object> getCollaborationMetadata() {
            return collaborationMetadata;
        }
        
        public void setCollaborationMetadata(Map<String, Object> collaborationMetadata) {
            this.collaborationMetadata = collaborationMetadata;
        }
        
        public String getWorkflowStatus() {
            return workflowStatus;
        }
        
        public void setWorkflowStatus(String workflowStatus) {
            this.workflowStatus = workflowStatus;
        }
    }
}