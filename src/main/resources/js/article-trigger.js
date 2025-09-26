console.log('JURIX Article Trigger Script Loaded');

AJS.toInit(function() {
    if (JIRA.Issue && JIRA.Issue.getIssueKey) {
        var issueKey = JIRA.Issue.getIssueKey();
        console.log('On issue page:', issueKey);
        
        var headerActions = AJS.$('.issue-header-content .aui-buttons').first();
        if (headerActions.length === 0) {
            headerActions = AJS.$('.ops-bar .aui-buttons').first();
        }
        
        if (headerActions.length > 0 && !AJS.$('#generate-article-btn').length) {
            var button = AJS.$('<button id="generate-article-btn" class="aui-button">Generate AI Article</button>');
            headerActions.append(button);
            
            button.on('click', function() {
                console.log('Generate article clicked for:', issueKey);
                
                button.prop('disabled', true).text('Generating...');
                
                AJS.$.ajax({
                    url: AJS.contextPath() + '/rest/jurix/1.0/trigger-article/' + issueKey,
                    type: 'POST',
                    contentType: 'application/json',
                    success: function(data) {
                        console.log('Article generation response:', data);
                        
                        if (data.status === 'success') {
                            AJS.flag({
                                type: 'success',
                                title: 'Article Generation Started',
                                body: 'AI article is being generated for ' + issueKey,
                                close: 'auto'
                            });
                        } else {
                            AJS.flag({
                                type: 'error',
                                title: 'Generation Failed',
                                body: data.error || 'Failed to generate article',
                                close: 'manual'
                            });
                        }
                        
                        button.prop('disabled', false).text('Generate AI Article');
                    },
                    error: function(xhr, status, error) {
                        console.error('Article generation error:', error);
                        console.error('Response:', xhr.responseText);
                        
                        AJS.flag({
                            type: 'error',
                            title: 'Error',
                            body: 'Failed to trigger article generation: ' + error,
                            close: 'manual'
                        });
                        
                        button.prop('disabled', false).text('Generate AI Article');
                    }
                });
            });
        }
    }
});