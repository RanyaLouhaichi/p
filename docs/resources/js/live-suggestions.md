# live-suggestions.js

## Overview

`live-suggestions.js` implements the JURIX Live Smart Suggestions panel, providing real-time, context-aware article suggestions as users type in Jira issue descriptions. It features advanced UI/UX with keyboard navigation and animated panels.

## Features

- Listens to input events and dynamically updates suggestions based on user text.
- Ranks and highlights suggestions using relevance scoring and keyword matching.
- Supports keyboard navigation (arrow keys, enter, escape) for suggestion selection.
- Provides animated, modern UI with glassmorphism and interactive elements.
- Integrates with both plain textareas and TinyMCE editors.
- Inserts selected article references into the issue description.

## Usage

The component is initialized automatically and is accessible as `window.JurixLiveSuggestions`.

