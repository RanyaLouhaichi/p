# ArticleTestController

## Overview

`ArticleTestController` is a REST resource for testing and manually triggering article generation and backend connectivity.

## Endpoints

- `GET /article-test/status`: Returns the status of the article service and HTTP client.
- `POST /article-test/trigger/{issueKey}`: Manually triggers article generation for a Jira issue.
- `GET /article-test/check-backend`: Checks the health of the Python backend.

## Features

- Uses OkHttp for backend communication.
- Integrates with `ArticleGenerationService` for state management and notifications.
- Provides detailed logging for diagnostics.

## Usage

Intended for internal testing and diagnostics.


