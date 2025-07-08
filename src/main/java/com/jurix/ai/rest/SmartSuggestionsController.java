package com.jurix.ai.rest;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType; // JAX-RS MediaType for javax.ws.rs annotations
import javax.ws.rs.core.Response;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.atlassian.jira.component.ComponentAccessor;
import com.atlassian.jira.issue.IssueManager;
import com.atlassian.jira.issue.MutableIssue;
import okhttp3.*; // OkHttp classes
import com.google.gson.Gson;

@Named
@Path("/suggestions")
public class SmartSuggestionsController {
    private static final Logger log = LoggerFactory.getLogger(SmartSuggestionsController.class);
    private final Gson gson = new Gson();
    private final OkHttpClient httpClient;
    
    @Inject
    public SmartSuggestionsController() {
        this.httpClient = new OkHttpClient.Builder().build();
    }
    
    @GET
    @Path("/issue/{issueKey}")
    @Produces(MediaType.APPLICATION_JSON) // Use JAX-RS MediaType
    @AnonymousAllowed
    public Response getSuggestions(@PathParam("issueKey") String issueKey) {
        try {
            log.info("Getting suggestions for issue: {}", issueKey);
            
            // Get issue details
            IssueManager issueManager = ComponentAccessor.getIssueManager();
            MutableIssue issue = issueManager.getIssueObject(issueKey);
            
            if (issue == null) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(createErrorResponse("Issue not found"))
                    .build();
            }
            
            // Prepare request to Python backend
            Map<String, Object> requestData = new HashMap<>();
            requestData.put("issue_key", issueKey);
            requestData.put("issue_summary", issue.getSummary());
            requestData.put("issue_description", issue.getDescription() != null ? issue.getDescription() : "");
            requestData.put("issue_type", issue.getIssueType().getName());
            requestData.put("issue_status", issue.getStatus().getName());
            
            // Call Python backend
            RequestBody body = RequestBody.create(
                okhttp3.MediaType.parse("application/json"), // Use OkHttp MediaType
                gson.toJson(requestData)
            );
            
            Request request = new Request.Builder()
                .url("http://localhost:5001/api/suggest-articles")
                .post(body)
                .build();
            
            try (okhttp3.Response backendResponse = httpClient.newCall(request).execute()) {
                String responseBody = backendResponse.body().string();
                
                if (backendResponse.isSuccessful()) {
                    return Response.ok(responseBody).build();
                } else {
                    log.error("Backend error: {}", responseBody);
                    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(createErrorResponse("Failed to get suggestions"))
                        .build();
                }
            }
            
        } catch (Exception e) {
            log.error("Error getting suggestions", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse(e.getMessage()))
                .build();
        }
    }
    
    @POST
    @Path("/feedback")
    @Consumes(MediaType.APPLICATION_JSON) // Use JAX-RS MediaType
    @Produces(MediaType.APPLICATION_JSON) // Use JAX-RS MediaType
    @AnonymousAllowed
    public Response recordFeedback(Map<String, Object> feedbackData) {
        try {
            log.info("Recording feedback: {}", feedbackData);
            
            // Forward to Python backend
            RequestBody body = RequestBody.create(
                okhttp3.MediaType.parse("application/json"), // Use OkHttp MediaType
                gson.toJson(feedbackData)
            );
            
            Request request = new Request.Builder()
                .url("http://localhost:5001/api/article-feedback")
                .post(body)
                .build();
            
            try (okhttp3.Response backendResponse = httpClient.newCall(request).execute()) {
                if (backendResponse.isSuccessful()) {
                    return Response.ok("{\"status\":\"success\"}").build();
                } else {
                    return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                        .entity(createErrorResponse("Failed to record feedback"))
                        .build();
                }
            }
            
        } catch (Exception e) {
            log.error("Error recording feedback", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse(e.getMessage()))
                .build();
        }
    }
    
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("status", "error");
        error.put("error", message);
        return error;
    }
}