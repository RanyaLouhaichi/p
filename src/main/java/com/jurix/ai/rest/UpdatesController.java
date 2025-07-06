package com.jurix.ai.rest;

import javax.inject.Inject;
import javax.inject.Named;
import javax.ws.rs.*;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.jurix.ai.service.DashboardUpdateService;
import com.jurix.ai.api.JurixApiClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.*;

@Named
@Path("/updates")
public class UpdatesController {
    private static final Logger log = LoggerFactory.getLogger(UpdatesController.class);
    
    private final DashboardUpdateService updateService;
    private final JurixApiClient apiClient;
    
    @Inject
    public UpdatesController(DashboardUpdateService updateService) {
        this.updateService = updateService;
        this.apiClient = JurixApiClient.getInstance();
    }
    
    @GET
    @Path("/{projectKey}")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed // Add proper security in production
    public Response getUpdates(
            @PathParam("projectKey") String projectKey,
            @QueryParam("since") Long sinceTimestamp) {
        
        try {
            // Default to last 5 minutes if not specified
            if (sinceTimestamp == null) {
                sinceTimestamp = System.currentTimeMillis() - (5 * 60 * 1000);
            }
            
            // Get updates from service
            Map<String, Object> updates = updateService.getUpdatesSince(projectKey, sinceTimestamp);
            
            // If there are updates, fetch fresh dashboard data
            if ((Boolean) updates.get("hasUpdates")) {
                log.info("Updates detected for project {} - fetching fresh dashboard data", projectKey);
                
                // Get fresh dashboard data from Python backend
                JurixApiClient.DashboardResponse dashboardData = apiClient.getDashboard(projectKey);
                updates.put("dashboardData", dashboardData);
            }
            
            return Response.ok(updates).build();
            
        } catch (Exception e) {
            log.error("Error getting updates for project " + projectKey, e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Collections.singletonMap("error", e.getMessage()))
                .build();
        }
    }
    
    @GET
    @Path("/{projectKey}/summary")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response getUpdateSummary(@PathParam("projectKey") String projectKey) {
        try {
            // Get project update info
            var updateInfo = updateService.getProjectUpdateInfo(projectKey);
            
            Map<String, Object> summary = new HashMap<>();
            summary.put("projectKey", projectKey);
            summary.put("lastUpdate", updateInfo.getLastUpdateTimestamp());
            summary.put("updateCount", updateInfo.getUpdateCount());
            summary.put("recentUpdates", updateInfo.getRecentUpdates());
            
            return Response.ok(summary).build();
            
        } catch (Exception e) {
            log.error("Error getting update summary", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Collections.singletonMap("error", e.getMessage()))
                .build();
        }
    }

    @GET
    @Path("/test-update/{projectKey}")
    @Produces(MediaType.APPLICATION_JSON)
    @AnonymousAllowed
    public Response testUpdate(@PathParam("projectKey") String projectKey) {
        try {
            // Create a test update
            DashboardUpdateService.UpdateEvent testEvent = new DashboardUpdateService.UpdateEvent(
                "TEST-123",
                "In Progress",
                "test_update",
                System.currentTimeMillis()
            );
            
            updateService.recordUpdate(projectKey, testEvent);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Test update recorded");
            response.put("projectKey", projectKey);
            response.put("timestamp", System.currentTimeMillis());
            
            return Response.ok(response).build();
        } catch (Exception e) {
            log.error("Error in test update", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(Collections.singletonMap("error", e.getMessage()))
                .build();
        }
    }
}