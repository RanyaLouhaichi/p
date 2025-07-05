package com.jurix.ai.rest;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.atlassian.sal.api.user.UserManager;
import com.atlassian.sal.api.user.UserProfile;
import com.jurix.ai.config.JurixConfiguration;

import org.codehaus.jackson.annotate.JsonProperty;
import org.codehaus.jackson.annotate.JsonIgnoreProperties;

/**
 * REST endpoint for handling chat interactions with the Python backend
 */
@Named
@Path("/chat")
public class ChatController {
    private static final Logger log = LoggerFactory.getLogger(ChatController.class);
    
    private final UserManager userManager;
    private final ChatService chatService;
    private final JurixConfiguration configuration;
    
    @Inject
    public ChatController(UserManager userManager, ChatService chatService, JurixConfiguration configuration) {
        this.userManager = userManager;
        this.chatService = chatService;
        this.configuration = configuration;
    }
    
    @GET
    @Path("/debug")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response debug() {
        Map<String, Object> debugInfo = new HashMap<>();
        debugInfo.put("backendUrl", configuration.getBackendUrl());
        debugInfo.put("status", "Java REST endpoint is working");
        debugInfo.put("chatEndpoint", configuration.getBackendUrl() + "/api/chat");
        
        return Response.ok(debugInfo).build();
    }
    
    @POST
    @Consumes(MediaType.APPLICATION_JSON)
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed // Remove this in production and use proper auth
    public Response chat(ChatRequest request) {
        try {
            // Log the incoming request
            log.info("Received chat request: {}", request.getQuery());
            
            // Get current user (optional - for context)
            UserProfile currentUser = userManager.getRemoteUser();
            String username = currentUser != null ? currentUser.getUsername() : "anonymous";
            
            // Validate request
            if (request.getQuery() == null || request.getQuery().trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(createErrorResponse("Query cannot be empty"))
                    .build();
            }
            
            // Call the chat service
            ChatResponse response = chatService.sendChatMessage(
                request.getQuery(),
                request.getConversationId(),
                username
            );
            
            // Log successful response
            log.info("Successfully generated response for query");
            
            // Return the response
            return Response.ok(response).build();
            
        } catch (Exception e) {
            log.error("Error processing chat request", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse("Failed to process chat request: " + e.getMessage()))
                .build();
        }
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", message);
        error.put("response", "I'm sorry, I encountered an error. Please try again.");
        return error;
    }
    
    /**
     * Request object for chat endpoint
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChatRequest {
        private String query;
        private String conversationId;
        
        // Default constructor
        public ChatRequest() {}
        
        // Getters and setters
        @JsonProperty("query")
        public String getQuery() {
            return query;
        }
        
        @JsonProperty("query")
        public void setQuery(String query) {
            this.query = query;
        }
        
        @JsonProperty("conversationId")
        public String getConversationId() {
            return conversationId;
        }
        
        @JsonProperty("conversationId")
        public void setConversationId(String conversationId) {
            this.conversationId = conversationId;
        }
        
        @Override
        public String toString() {
            return "ChatRequest{" +
                "query='" + query + '\'' +
                ", conversationId='" + conversationId + '\'' +
                '}';
        }
    }
    
    /**
     * Response object for chat endpoint
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ChatResponse {
        private String response;
        private String conversationId;
        private List<Article> articles;
        private List<String> recommendations;
        private Map<String, Object> predictions;
        private Map<String, Object> collaborationMetadata;
        private String workflowStatus;
        
        // Default constructor
        public ChatResponse() {
            this.articles = new ArrayList<>();
            this.recommendations = new ArrayList<>();
            this.predictions = new HashMap<>();
            this.collaborationMetadata = new HashMap<>();
        }
        
        // Getters and setters with JsonProperty on methods
        @JsonProperty("response")
        public String getResponse() {
            return response;
        }
        
        @JsonProperty("response")
        public void setResponse(String response) {
            this.response = response;
        }
        
        @JsonProperty("conversationId")
        public String getConversationId() {
            return conversationId;
        }
        
        @JsonProperty("conversationId")
        public void setConversationId(String conversationId) {
            this.conversationId = conversationId;
        }
        
        @JsonProperty("articles")
        public List<Article> getArticles() {
            return articles;
        }
        
        @JsonProperty("articles")
        public void setArticles(List<Article> articles) {
            this.articles = articles;
        }
        
        @JsonProperty("recommendations")
        public List<String> getRecommendations() {
            return recommendations;
        }
        
        @JsonProperty("recommendations")
        public void setRecommendations(List<String> recommendations) {
            this.recommendations = recommendations;
        }
        
        @JsonProperty("predictions")
        public Map<String, Object> getPredictions() {
            return predictions;
        }
        
        @JsonProperty("predictions")
        public void setPredictions(Map<String, Object> predictions) {
            this.predictions = predictions;
        }
        
        @JsonProperty("collaborationMetadata")
        public Map<String, Object> getCollaborationMetadata() {
            return collaborationMetadata;
        }
        
        @JsonProperty("collaborationMetadata")
        public void setCollaborationMetadata(Map<String, Object> collaborationMetadata) {
            this.collaborationMetadata = collaborationMetadata;
        }
        
        @JsonProperty("workflowStatus")
        public String getWorkflowStatus() {
            return workflowStatus;
        }
        
        @JsonProperty("workflowStatus")
        public void setWorkflowStatus(String workflowStatus) {
            this.workflowStatus = workflowStatus;
        }
    }
    
    /**
     * Article object
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Article {
        private String title;
        private String content;
        private double relevanceScore;
        
        // Default constructor
        public Article() {}
        
        // Getters and setters with JsonProperty
        @JsonProperty("title")
        public String getTitle() {
            return title;
        }
        
        @JsonProperty("title")
        public void setTitle(String title) {
            this.title = title;
        }
        
        @JsonProperty("content")
        public String getContent() {
            return content;
        }
        
        @JsonProperty("content")
        public void setContent(String content) {
            this.content = content;
        }
        
        @JsonProperty("relevanceScore")
        public double getRelevanceScore() {
            return relevanceScore;
        }
        
        @JsonProperty("relevanceScore")
        public void setRelevanceScore(double relevanceScore) {
            this.relevanceScore = relevanceScore;
        }
    }
}