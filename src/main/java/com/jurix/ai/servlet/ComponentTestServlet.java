package com.jurix.ai.servlet;

import com.jurix.ai.service.DashboardUpdateService;
import com.jurix.ai.service.ArticleGenerationService;
import com.atlassian.plugin.spring.scanner.annotation.imports.ComponentImport;
import com.atlassian.event.api.EventPublisher;

import javax.inject.Inject;
import javax.inject.Named;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

@Named("componentTestServlet")
public class ComponentTestServlet extends HttpServlet {
    
    @ComponentImport
    private final EventPublisher eventPublisher;
    private final DashboardUpdateService dashboardUpdateService;
    private final ArticleGenerationService articleGenerationService;
    
    @Inject
    public ComponentTestServlet(@ComponentImport EventPublisher eventPublisher,
                               DashboardUpdateService dashboardUpdateService,
                               ArticleGenerationService articleGenerationService) {
        this.eventPublisher = eventPublisher;
        this.dashboardUpdateService = dashboardUpdateService;
        this.articleGenerationService = articleGenerationService;
    }
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        resp.setContentType("text/html");
        PrintWriter writer = resp.getWriter();
        
        writer.println("<html>");
        writer.println("<head><title>JURIX Component Test</title></head>");
        writer.println("<body>");
        writer.println("<h1>JURIX AI Plugin Component Status</h1>");
        
        writer.println("<h2>Component Injection Status:</h2>");
        writer.println("<ul>");
        writer.println("<li>EventPublisher: " + (eventPublisher != null ? "✅ INJECTED" : "❌ NULL") + "</li>");
        writer.println("<li>DashboardUpdateService: " + (dashboardUpdateService != null ? "✅ INJECTED" : "❌ NULL") + "</li>");
        writer.println("<li>ArticleGenerationService: " + (articleGenerationService != null ? "✅ INJECTED" : "❌ NULL") + "</li>");
        writer.println("</ul>");
        
        if (eventPublisher != null) {
            writer.println("<h3>EventPublisher Details:</h3>");
            writer.println("<ul>");
            writer.println("<li>Class: " + eventPublisher.getClass().getName() + "</li>");
            writer.println("<li>Hash: " + eventPublisher.hashCode() + "</li>");
            writer.println("</ul>");
        }
        
        writer.println("<h2>Plugin Info:</h2>");
        writer.println("<ul>");
        writer.println("<li>Servlet loaded at: " + new java.util.Date() + "</li>");
        writer.println("<li>Context Path: " + req.getContextPath() + "</li>");
        writer.println("</ul>");
        
        writer.println("</body>");
        writer.println("</html>");
    }
}