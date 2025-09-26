# ArticleGenerationService

## Overview

`ArticleGenerationService` manages the lifecycle and storage of AI-generated articles for Jira issues. It provides in-memory and cached storage, tracks generation progress, and supports notification hooks for article readiness.

## Responsibilities

- Stores and retrieves article data for issues using both in-memory and Atlassian cache.
- Tracks article generation progress to prevent duplicate generation.
- Handles error storage and notification creation.
- Provides methods for marking generation as in-progress or complete.

## Main Methods

- `isArticleGenerationInProgress(String cacheKey)`: Checks if generation is in progress for a given key.
- `markGenerationInProgress(String cacheKey)`: Marks generation as in progress and sets a timeout for cleanup.
- `markGenerationComplete(String cacheKey)`: Marks generation as complete.
- `storeArticleData(String issueKey, Map<String, Object> articleData)`: Stores article data in memory and cache.
- `storeGenerationError(String issueKey, String error)`: Stores error information for an article.
- `createNotification(String issueKey, String issueSummary)`: Logs a notification for article readiness.
- `getArticleData(String issueKey)`: Retrieves article data from memory or cache.

## Data Structure

- **ArticleData**: Contains issueKey, article content, status, error, and creation timestamp.

## Usage

Used by REST controllers and event listeners to manage article generation and storage.

