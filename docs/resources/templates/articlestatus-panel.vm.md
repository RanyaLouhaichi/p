# articlestatus-panel.vm

**Location:** `src/main/resources/templates/articlestatus-panel.vm`

## Overview

`articlestatus-panel.vm` is a Velocity template used to render the article status panel in Jira issue views. It displays the current status, version, and approval state of AI-generated articles for the issue.

## Key Features

- Shows whether an AI-generated article exists for the issue.
- Displays article status (e.g., pending, approved, rejected), version, and approval status.
- Integrates with the `ArticleStatusPanelProvider` to receive context variables.
- Provides UI cues for users to review, approve, or request changes to articles.

## Usage

Rendered as a web panel in Jira issue views to inform users about the AI article lifecycle and actions.
