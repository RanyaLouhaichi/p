# ArticleController

## Overview

`ArticleController` is a REST resource for managing AI-generated articles for Jira issues. It provides endpoints for retrieving, generating, and submitting feedback on articles, and acts as a bridge between Jira, the plugin's local storage, and the Python backend.

## Endpoints

- `GET /article/{issueKey}`: Retrieve article for an issue.
- `POST /article/{issueKey}/generate`: Trigger article generation.
- `POST /article/{issueKey}/feedback`: Submit feedback for an article.
- `POST /article/test-feedback`: Test endpoint for feedback.
- `GET /article/test/{issueKey}`: Create a test article for development/testing.

## Features

- Integrates with `ArticleGenerationService` for local caching and notification management.
- Uses OkHttp for HTTP communication with the Python backend.
- Handles error scenarios gracefully.

## Usage

Used by the frontend and integrations to manage article lifecycle and feedback.
- Returns appropriate HTTP status codes and error messages for missing issues, backend unavailability, and invalid feedback.
- Updates local storage and notifications based on backend responses.


