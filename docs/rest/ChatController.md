# ChatController

**Location:** `src/main/java/com/jurix/ai/rest/ChatController.java`

## Overview

`ChatController` is a REST resource that provides endpoints for AI chat interactions within Jira. It forwards user queries to the backend AI service and returns responses, recommendations, and related articles.

## Endpoints

- `POST /chat`: Sends a chat query to the backend and returns the AI response.

## Features

- Integrates with `ChatService` for backend communication.
- Returns structured responses including articles, recommendations, and predictions.

## Usage

Used by the frontend chat UI to provide AI-powered assistance to users.
