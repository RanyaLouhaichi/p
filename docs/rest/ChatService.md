# ChatService

## Overview

`ChatService` is a service class responsible for communicating with the Python backend for chat-based AI interactions. It handles sending chat messages, parsing responses, and transforming backend data into plugin-specific response objects.

## Key Features

- Uses OkHttp for HTTP communication with configurable timeouts.
- Serializes and deserializes JSON payloads using Jackson's `ObjectMapper`.
- Handles error responses and transforms them into meaningful exceptions.
- Transforms backend responses into `ChatController.ChatResponse` objects for use in REST resources.

## Main Method

- `sendChatMessage(String query, String conversationId, String username)`: Sends a chat message to the backend and returns a structured response.

## Internal Structures

- **PythonBackendResponse**: Internal class representing the backend's JSON response.
- **transformResponse**: Converts backend response to the plugin's response format.

## Error Handling

- Logs and throws exceptions for backend errors.
- Attempts to parse error messages from backend responses.


