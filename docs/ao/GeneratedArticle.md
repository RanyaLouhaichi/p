# GeneratedArticle

## Overview

`GeneratedArticle` is an Active Objects (AO) interface representing an AI-generated article for a Jira issue.

## Fields

- `issueKey` (String): The Jira issue key this article is associated with.
- `title` (String): The article title.
- `content` (String, unlimited): The article content (Markdown or HTML).
- `status` (String): The article status (e.g., pending, approved, rejected).
- `createdAt` (Long): Timestamp when the article was created.
- `updatedAt` (Long): Timestamp when the article was last updated.

## Usage

Used to persist AI-generated articles for knowledge base and reporting.
