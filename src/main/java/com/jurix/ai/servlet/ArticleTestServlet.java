package com.jurix.ai.servlet;

import com.jurix.ai.service.ArticleGenerationService;
import com.google.gson.Gson;

import javax.inject.Inject;
import javax.inject.Named;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.io.PrintWriter;

@Named("articleTestServlet")
public class ArticleTestServlet extends HttpServlet {
    
    private final ArticleGenerationService articleService;
    private final Gson gson = new Gson();
    
    @Inject
    public ArticleTestServlet(ArticleGenerationService articleService) {
        this.articleService = articleService;
    }
    
    @Override
    protected void doGet(HttpServletRequest req, HttpServletResponse resp) 
            throws ServletException, IOException {
        
        resp.setContentType("text/html");
        PrintWriter writer = resp.getWriter();
        
        writer.println("<html><body>");
        writer.println("<h1>Article Test</h1>");
        
        String issueKey = req.getParameter("issueKey");
        if (issueKey != null) {
            ArticleGenerationService.ArticleData article = articleService.getArticleData(issueKey);
            if (article != null) {
                writer.println("<p>Article found for " + issueKey + ":</p>");
                writer.println("<pre>" + gson.toJson(article) + "</pre>");
            } else {
                writer.println("<p>No article found for " + issueKey + "</p>");
            }
        } else {
            writer.println("<form>");
            writer.println("Issue Key: <input type='text' name='issueKey'/>");
            writer.println("<button type='submit'>Check Article</button>");
            writer.println("</form>");
        }
        
        writer.println("</body></html>");
    }
}