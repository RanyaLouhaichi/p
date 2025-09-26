# smart-suggestions.js

## Overview

`smart-suggestions.js` provides AI-powered article suggestions in Jira issue views. It detects the current issue, fetches relevant suggestions from the backend, and displays them in a modern, interactive sidebar panel.

## Features

- Detects issue key using multiple strategies for reliability.
- Fetches suggestions from the backend via REST API with retry and caching logic.
- Displays suggestions in a styled sidebar panel with relevance indicators and feedback buttons.
- Handles loading, error, and empty states gracefully.
- Supports dynamic content updates via event listeners and MutationObserver.
- Allows users to provide feedback on suggestions (helpful/not helpful).

## Usage

The component is initialized automatically and is accessible as `window.SmartSuggestions`.
- Communicates with the plugin's REST endpoints for suggestions.

## Usage

The component is initialized automatically and is accessible as `window.SmartSuggestions`.
