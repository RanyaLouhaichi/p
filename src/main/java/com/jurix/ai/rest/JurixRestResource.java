package com.jurix.ai.rest;

import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.security.JiraAuthenticationContext;
import com.atlassian.jira.user.ApplicationUser;
import com.google.gson.Gson;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.Arrays;
import java.util.UUID;

@Path("/")
@Consumes({MediaType.APPLICATION_JSON})
@Produces({MediaType.APPLICATION_JSON})
public class JurixRestResource {
    
    private static final Logger log = LoggerFactory.getLogger(JurixRestResource.class);
    private final Gson gson = new Gson();
    
    // Backend API URL - configure this based on your setup
    private static final String BACKEND_API_URL = "http://localhost:5001";
    
    @GET
    @Path("/health")
    public Response health() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "healthy");
        status.put("version", "1.0.0");
        status.put("timestamp", System.currentTimeMillis());
        
        // Check backend connectivity
        try {
            URL url = new URL(BACKEND_API_URL + "/health");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            
            int responseCode = conn.getResponseCode();
            status.put("backend_connected", responseCode == 200);
            
            conn.disconnect();
        } catch (Exception e) {
            status.put("backend_connected", false);
            status.put("backend_error", e.getMessage());
        }
        
        return Response.ok(status).build();
    }
    
    @POST
    @Path("/chat")
    public Response chat(Map<String, Object> requestMap) {
        JiraAuthenticationContext authContext = ComponentAccessor.getJiraAuthenticationContext();
        ApplicationUser user = authContext.getLoggedInUser();
        
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        String query = (String) requestMap.get("query");
        String conversationId = (String) requestMap.get("conversationId");
        if (conversationId == null) {
            conversationId = UUID.randomUUID().toString();
        }
        
        log.info("Chat request received - Query: {}, ConversationId: {}", query, conversationId);
        
        try {
            // Call backend API
            Map<String, Object> backendResponse = callBackendAPI("/api/chat", "POST", requestMap);
            
            // Return the backend response
            return Response.ok(backendResponse).build();
            
        } catch (Exception e) {
            log.error("Failed to call backend API", e);
            
            // Fallback response
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("query", query);
            errorResponse.put("response", "Sorry, I couldn't connect to the AI service. Please try again later.");
            errorResponse.put("status", "error");
            errorResponse.put("error", e.getMessage());
            
            return Response.ok(errorResponse).build();
        }
    }
    
    @POST
    @Path("/dashboard/refresh")
    public Response refreshDashboard(@QueryParam("projectKey") String projectKey) {
        JiraAuthenticationContext authContext = ComponentAccessor.getJiraAuthenticationContext();
        ApplicationUser user = authContext.getLoggedInUser();
        
        if (user == null) {
            return Response.status(Response.Status.UNAUTHORIZED).build();
        }
        
        log.info("Dashboard refresh request for project: {}", projectKey);
        
        try {
            // Call backend API
            Map<String, Object> backendResponse = callBackendAPI("/api/dashboard/" + projectKey, "GET", null);
            
            // Transform response for frontend
            Map<String, Object> dashboard = new HashMap<>();
            dashboard.put("projectId", projectKey);
            dashboard.put("metrics", backendResponse.get("metrics"));
            dashboard.put("recommendations", backendResponse.get("recommendations"));
            dashboard.put("ticketsAnalyzed", backendResponse.get("tickets_analyzed"));
            
            return Response.ok(dashboard).build();
            
        } catch (Exception e) {
            log.error("Failed to call backend API for dashboard", e);
            
            // Return mock data as fallback
            return Response.ok(createMockDashboard(projectKey)).build();
        }
    }
    
    /**
     * Helper method to call backend API
     */
    private Map<String, Object> callBackendAPI(String endpoint, String method, Map<String, Object> payload) throws Exception {
        URL url = new URL(BACKEND_API_URL + endpoint);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        
        try {
            conn.setRequestMethod(method);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(180000);
            conn.setReadTimeout(180000);
            
            if ("POST".equals(method) && payload != null) {
                conn.setDoOutput(true);
                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = gson.toJson(payload).getBytes("utf-8");
                    os.write(input, 0, input.length);
                }
            }
            
            int responseCode = conn.getResponseCode();
            log.info("Backend API response code: {}", responseCode);
            
            // Read response
            StringBuilder response = new StringBuilder();
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(
                        responseCode >= 200 && responseCode < 300 ? 
                        conn.getInputStream() : conn.getErrorStream(), "utf-8"))) {
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
            }
            
            // Parse response
            return gson.fromJson(response.toString(), Map.class);
            
        } finally {
            conn.disconnect();
        }
    }
    
    private Map<String, Object> createMockDashboard(String projectKey) {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("projectId", projectKey);
        dashboard.put("metrics", createMockMetrics());
        dashboard.put("recommendations", Arrays.asList(
            "Consider implementing automated testing",
            "Review sprint capacity allocation",
            "Address technical debt in the backlog"
        ));
        dashboard.put("ticketsAnalyzed", 42);
        return dashboard;
    }
    
    private Map<String, Object> createMockMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("throughput", 42);
        metrics.put("cycle_time", 3.5);
        metrics.put("efficiency", 78);
        metrics.put("activeIssues", 23);
        return metrics;
    }
}