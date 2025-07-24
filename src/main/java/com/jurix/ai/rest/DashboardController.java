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

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.atlassian.plugins.rest.common.security.AnonymousAllowed;
import com.atlassian.sal.api.user.UserManager;
import javax.ws.rs.Consumes;

/**
 * REST endpoint for dashboard data
 */
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
    @AnonymousAllowed // Remove this in production and use proper auth
    public Response getDashboardData(@PathParam("projectKey") String projectKey) {
        try {
            log.info("Dashboard data requested for project: {}", projectKey);
            
            // For now, return mock data to test the endpoint
            Map<String, Object> dashboardData = new HashMap<>();
            dashboardData.put("projectKey", projectKey);
            dashboardData.put("status", "success");
            dashboardData.put("message", "Dashboard endpoint is working");
            
            // Add mock metrics
            Map<String, Object> metrics = new HashMap<>();
            metrics.put("velocity", 45);
            metrics.put("cycleTime", 3.2);
            metrics.put("efficiency", 78);
            metrics.put("activeIssues", 23);
            dashboardData.put("metrics", metrics);
            
            return Response.ok(dashboardData).build();
            
        } catch (Exception e) {
            log.error("Error getting dashboard data", e);
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(createErrorResponse("Failed to get dashboard data: " + e.getMessage()))
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