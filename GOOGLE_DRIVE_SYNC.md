# Google Drive Sync Implementation

## Overview

This document describes the Google Drive synchronization implementation for the CAT-a-log application. The system uses the Google Drive `appDataFolder` to securely store and sync user data across devices.

## Features

- ✅ **OAuth 2.0 Authentication** - Securely connects to the user's Google account.
- ✅ **Application Data Folder** - Uses the hidden `appDataFolder` for private, app-specific data storage.
- ✅ **Automatic Sync** - Periodically syncs data in the background.
- ✅ **Manual Sync** - Allows users to trigger a sync manually.
- ✅ **Photo Synchronization** - Syncs encounter photos as individual files.
- ✅ **Soft Deletes** - Correctly propagates deletions across devices.
- ✅ **Conflict-Free Merging** - Merges encounters and custom preferences without data loss.

## Architecture

### Core Components

1.  **`GoogleDriveService.ts`**: Manages all direct interactions with the Google Drive API, including authentication and file operations within the `appDataFolder`.
2.  **`SyncService.ts`**: Orchestrates the entire sync process, handling data merging, photo uploads/downloads, and deletion propagation.
3.  **`useUser.ts`**: Manages user state, including the Google Drive service instance and authentication tokens.

### Data Flow

The synchronization process follows this general flow:

1.  **Authentication**: The user authenticates with their Google account, granting the app access to the `appDataFolder`.
2.  **Initialization**: The `GoogleDriveService` is initialized with the user's access token.
3.  **Sync Trigger**: A sync is triggered either automatically or manually.
4.  **Data Fetch**: The `SyncService` fetches local data from IndexedDB and remote data from the `appDataFolder`.
5.  **Data Merge**: The service merges encounters and preferences, resolving conflicts and handling deletions.
6.  **Photo Sync**: Photos are uploaded or downloaded as needed.
7.  **Data Upload**: The merged data is uploaded back to the `appDataFolder`.

## Google Drive Structure

All data is stored in the hidden `appDataFolder`, which is not visible to the user in their Google Drive. The structure is flat to comply with API limitations:

-   `app-data.json`: A single JSON file containing all encounter data and user preferences.
-   `<photo_id>.jpg`: Individual photo files, named with their unique IDs.

## Configuration

-   **Client ID**: Stored in an environment variable (`VITE_GOOGLE_CLIENT_ID`).
-   **Scope**: `https://www.googleapis.com/auth/drive.appdata`

## Security

-   **Token Storage**: Access tokens are stored in `localStorage` and are cleared on logout.
-   **Scope Limitation**: The app only requests access to the `appDataFolder`, ensuring it cannot access any other user files.
-   **Data Isolation**: All data is stored in the hidden `appDataFolder`, which is private to the application.