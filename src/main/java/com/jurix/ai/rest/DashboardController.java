package com.jurix.ai.rest;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.atlassian.sal.api.user.UserManager;
import javax.ws.rs.Consumes;

@Named
@Path("/dashboard")
@Consumes({MediaType.APPLICATION_JSON})
@Produces({MediaType.APPLICATION_JSON})
public class DashboardController {
    private static final Logger log = LoggerFactory.getLogger(DashboardController.class);
    
    private final UserManager userManager;
    
    @Inject
    public DashboardController(UserManager userManager) {
        this.userManager = userManager;
    }
    
    @GET
    @Path("/{projectKey}")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response getDashboardData(@PathParam("projectKey") String projectKey) {
        try {
            log.info("Dashboard data requested for project: {}", projectKey);
            
            // Call Python backend
            String pythonUrl = "http://host.docker.internal:5001/api/dashboard/" + projectKey;
            URL url = new URL(pythonUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Accept", "application/json");
            conn.setConnectTimeout(30000);
            conn.setReadTimeout(120000);
            
            int responseCode = conn.getResponseCode();
            log.info("Python backend response code: {}", responseCode);
            
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
            
            conn.disconnect();
            
            // Return the Python backend response
            return Response.ok(response.toString())
                .header("Content-Type", "application/json")
                .build();
            
        } catch (Exception e) {
            log.error("Error getting dashboard data from Python backend", e);
            
            // Return error response
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("status", "error");
            errorResponse.put("error", e.getMessage());
            errorResponse.put("projectKey", projectKey);
            
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(errorResponse)
                .build();
        }
    }
    
    @GET
    @Path("/test")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response test() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "Dashboard controller is working");
        return Response.ok(response).build();
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", message);
        error.put("status", "error");
        return error;
    }
}