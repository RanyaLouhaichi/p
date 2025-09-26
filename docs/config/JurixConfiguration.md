# JurixConfiguration

## Overview

`JurixConfiguration` provides configuration management for the JURIX AI plugin, including backend API URLs and other integration settings. It is designed for dependency injection and centralized configuration access.

## Key Responsibilities

- Stores and provides access to backend API URLs and other plugin settings.
- Supports injection into services and controllers for consistent configuration usage.
- Can be extended to support dynamic or user-configurable settings.

## Main Methods

- `getBackendUrl()`: Returns the base URL for the Python backend API.
- Additional getters/setters for other configuration properties as needed.

## Usage

Injected into services such as `ChatService` to provide backend connectivity details.

