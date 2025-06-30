package com.jurix.ai.api;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import javax.inject.Named;
import org.springframework.stereotype.Component;

@Component
@Named("jurixApiClient")
public class JurixApiClient {
    
    private static final Logger log = LoggerFactory.getLogger(JurixApiClient.class);
    private static final String API_BASE_URL = "http://localhost:5000";
    private static final int TIMEOUT_SECONDS = 30;
    
    private final Gson gson;
    private final ExecutorService executorService;
    
    public JurixApiClient() {
        this.gson = new GsonBuilder()
            .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            .create();
        this.executorService = Executors.newFixedThreadPool(10);
    }
    
    // Chat Endpoint
    public CompletableFuture<ChatResponse> askOrchestrator(String query, String conversationId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> request = new HashMap<>();
                request.put("query", query);
                request.put("conversation_id", conversationId);
                
                String response = post("/ask-orchestrator", request);
                return gson.fromJson(response, ChatResponse.class);
                
            } catch (Exception e) {
                log.error("Failed to call orchestrator", e);
                throw new RuntimeException(e);
            }
        }, executorService);
    }
    
    // Dashboard Endpoint
    public CompletableFuture<DashboardResponse> getDashboard(String projectId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> request = new HashMap<>();
                request.put("project_id", projectId);
                
                String response = post("/dashboard", request);
                return gson.fromJson(response, DashboardResponse.class);
                
            } catch (Exception e) {
                log.error("Failed to get dashboard", e);
                throw new RuntimeException(e);
            }
        }, executorService);
    }
    
    // Predictions Endpoint
    public CompletableFuture<PredictionsResponse> getPredictions(String projectId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> request = new HashMap<>();
                request.put("project_id", projectId);
                request.put("analysis_type", "comprehensive");
                
                String response = post("/predictions", request);
                return gson.fromJson(response, PredictionsResponse.class);
                
            } catch (Exception e) {
                log.error("Failed to get predictions", e);
                throw new RuntimeException(e);
            }
        }, executorService);
    }
    
    // Article Generation
    public CompletableFuture<ArticleResponse> generateArticle(String ticketId) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                Map<String, Object> request = new HashMap<>();
                request.put("ticket_id", ticketId);
                
                String response = post("/jira-workflow", request);
                return gson.fromJson(response, ArticleResponse.class);
                
            } catch (Exception e) {
                log.error("Failed to generate article", e);
                throw new RuntimeException(e);
            }
        }, executorService);
    }
    
    // Webhook notification
    public void notifyTicketResolved(String ticketId, Map<String, Object> ticketData) {
        CompletableFuture.runAsync(() -> {
            try {
                Map<String, Object> webhookPayload = new HashMap<>();
                webhookPayload.put("webhookEvent", "jira:issue_updated");
                webhookPayload.put("issue_event_type_name", "issue_generic");
                
                Map<String, Object> issue = new HashMap<>();
                issue.put("key", ticketId);
                issue.put("fields", ticketData);
                webhookPayload.put("issue", issue);
                
                post("/webhook/jira-ticket-resolved", webhookPayload);
                log.info("Webhook notification sent for ticket: {}", ticketId);
                
            } catch (Exception e) {
                log.error("Failed to send webhook notification", e);
            }
        }, executorService);
    }
    
    private String post(String endpoint, Map<String, Object> data) throws IOException {
        URL url = new URL(API_BASE_URL + endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        
        try {
            // Set up connection
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(TIMEOUT_SECONDS * 1000);
            conn.setReadTimeout(TIMEOUT_SECONDS * 1000);
            conn.setDoOutput(true);
            
            // Write request body
            String jsonBody = gson.toJson(data);
            try (OutputStream os = conn.getOutputStream()) {
                byte[] input = jsonBody.getBytes(StandardCharsets.UTF_8);
                os.write(input, 0, input.length);
            }
            
            // Check response code
            int responseCode = conn.getResponseCode();
            if (responseCode >= 300) {
                String errorMessage = "API request failed with status: " + responseCode;
                log.error(errorMessage);
                throw new IOException(errorMessage);
            }
            
            // Read response
            StringBuilder response = new StringBuilder();
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
            }
            
            return response.toString();
            
        } finally {
            conn.disconnect();
        }
    }
    
    private String get(String endpoint) throws IOException {
        URL url = new URL(API_BASE_URL + endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        
        try {
            // Set up connection
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(TIMEOUT_SECONDS * 1000);
            conn.setReadTimeout(TIMEOUT_SECONDS * 1000);
            
            // Check response code
            int responseCode = conn.getResponseCode();
            if (responseCode >= 300) {
                String errorMessage = "API request failed with status: " + responseCode;
                log.error(errorMessage);
                throw new IOException(errorMessage);
            }
            
            // Read response
            StringBuilder response = new StringBuilder();
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
            }
            
            return response.toString();
            
        } finally {
            conn.disconnect();
        }
    }
    
    // Response DTOs
    public static class ChatResponse {
        public String query;
        public String response;
        public List<Map<String, Object>> articles;
        public List<String> recommendations;
        public Map<String, Object> predictions;
        public Map<String, Object> collaborationMetadata;
        public String workflowStatus;
    }
    
    public static class DashboardResponse {
        public String projectId;
        public List<Map<String, Object>> tickets;
        public Map<String, Object> metrics;
        public Map<String, Object> visualizationData;
        public List<String> recommendations;
        public String report;
        public Map<String, Object> predictions;
        public String workflowStatus;
        public String dashboardId;
    }
    
    public static class PredictionsResponse {
        public String projectId;
        public String analysisType;
        public Map<String, Object> predictions;
        public List<String> recommendations;
        public String workflowStatus;
    }
    
    public static class ArticleResponse {
        public String ticketId;
        public String projectId;
        public List<Map<String, Object>> workflowHistory;
        public Map<String, Object> currentState;
    }
    
    // Clean up resources when the plugin is disabled
    public void destroy() {
        if (executorService != null && !executorService.isShutdown()) {
            executorService.shutdown();
        }
    }
}