# ArticleStatusPanelProvider

## Overview

`ArticleStatusPanelProvider` is a Jira context provider that supplies context data for displaying the status of AI-generated articles in issue panels.

## Responsibilities

- Supplies context variables for issue panels, including article status, version, and approval status.
- Checks if an article exists for the current issue using `ArticleGenerationService`.

## Main Method

- `getContextMap(ApplicationUser applicationUser, JiraHelper jiraHelper)`: Returns a map of context variables for the panel.

## Usage

Used in Jira web panels to display article status and actions for the current issue.
