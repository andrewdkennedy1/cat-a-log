# Requirements Document

## Introduction

CAT-a-log is a lightweight, personal Progressive Web App (PWA) designed for tracking cat encounters. The application serves as a digital diary for cat enthusiasts to log, map, and manage their feline encounters. It operates entirely in-browser with offline-first capabilities, installable on both desktop and mobile devices, and includes optional cloud backup functionality through Google Drive integration.

## Requirements

### Requirement 1

**User Story:** As a cat enthusiast, I want to quickly log cat encounters with location data, so that I can maintain a personal diary of my feline interactions.

#### Acceptance Criteria

1. WHEN the user taps "➕ Log Cat" or long-presses on the map THEN the system SHALL display a paw-pin at the tapped location
2. WHEN the user interacts with the logging interface THEN the system SHALL present a modal form with auto-populated date/time that is editable
3. WHEN the user fills out encounter details THEN the system SHALL require cat color, cat type, and behavior selection
4. WHEN the user saves an encounter THEN the system SHALL persist the data to IndexedDB immediately
5. IF Google authentication is present THEN the system SHALL queue a Drive sync job in the background

### Requirement 2

**User Story:** As a user, I want to categorize my cat encounters with standardized options, so that I can maintain consistent and searchable records.

#### Acceptance Criteria

1. WHEN selecting cat color THEN the system SHALL provide a dropdown with predefined color options
2. WHEN selecting cat type THEN the system SHALL provide a dropdown with predefined type categories
3. WHEN selecting behavior THEN the system SHALL offer preset options: Friendly, Playful, Shy, Sleepy, Hungry, Curious
4. WHEN the user needs a custom behavior THEN the system SHALL provide a "Custom..." option for free text input
5. WHEN the user selects a cat color THEN the system SHALL display a matching colored pin on the map

### Requirement 3

**User Story:** As a user, I want to add photos and comments to my cat encounters, so that I can create rich, memorable records of each interaction.

#### Acceptance Criteria

1. WHEN logging an encounter THEN the system SHALL provide an optional photo capture/upload field
2. WHEN the user adds a photo THEN the system SHALL accept images from camera or gallery
3. WHEN a photo exceeds 5MB THEN the system SHALL automatically resize it to ~1600px longest edge using Canvas
4. WHEN the user adds a photo THEN the system SHALL store it as a Blob in IndexedDB with a unique photoBlobId
5. WHEN logging an encounter THEN the system SHALL provide an optional comment field for free text

### Requirement 4

**User Story:** As a user, I want to view my cat encounters on an interactive map, so that I can visualize the locations and patterns of my encounters.

#### Acceptance Criteria

1. WHEN the user opens the map THEN the system SHALL center it on the last viewed location
2. WHEN multiple encounters are in close proximity THEN the system SHALL cluster pins while zoomed out
3. WHEN the user taps a pin THEN the system SHALL expand an info card showing encounter details
4. IF an encounter has a photo THEN the system SHALL display a thumbnail in the info card
5. WHEN viewing an encounter THEN the system SHALL provide inline edit and delete actions

### Requirement 5

**User Story:** As a user, I want to edit and delete my cat encounters, so that I can maintain accurate and up-to-date records.

#### Acceptance Criteria

1. WHEN the user taps the edit button on an encounter THEN the system SHALL open the encounter form pre-populated with existing data
2. WHEN the user saves edited encounter data THEN the system SHALL update the record in IndexedDB
3. WHEN the user taps the delete button THEN the system SHALL remove the encounter from IndexedDB
4. WHEN an encounter is modified or deleted THEN the system SHALL update the map display immediately
5. IF Google Drive sync is enabled THEN the system SHALL queue sync operations for any data changes

### Requirement 6

**User Story:** As a user, I want the app to work offline, so that I can log cat encounters regardless of internet connectivity.

#### Acceptance Criteria

1. WHEN the app is offline THEN the system SHALL continue to function for all core logging features
2. WHEN offline THEN the system SHALL store all data locally in IndexedDB
3. WHEN the user goes back online THEN the system SHALL automatically sync queued changes to Google Drive if authenticated
4. WHEN offline THEN the system SHALL cache map tiles using StaleWhileRevalidate strategy
5. WHEN offline THEN the system SHALL cache static assets using CacheFirst strategy

### Requirement 7

**User Story:** As a user, I want to backup my data to Google Drive, so that I can preserve my cat encounter history and access it across devices.

#### Acceptance Criteria

1. WHEN the user chooses to connect Google Drive THEN the system SHALL initiate OAuth 2 PKCE authentication
2. WHEN Google authentication succeeds THEN the system SHALL export full data as JSON to Drive App Data Folder
3. WHEN any data changes occur THEN the system SHALL debounce and sync updates to cat-a-log/data.json
4. WHEN the user first signs in THEN the system SHALL check if Drive data is newer than local data
5. IF Drive data is newer THEN the system SHALL prompt the user to import/merge the data

### Requirement 8

**User Story:** As a user, I want manual export and import capabilities, so that I can have full control over my data backup and migration.

#### Acceptance Criteria

1. WHEN the user accesses settings THEN the system SHALL provide "Export JSON" and "Import JSON" buttons
2. WHEN the user exports data THEN the system SHALL generate a complete JSON file of all encounters and photos
3. WHEN the user imports data THEN the system SHALL validate the JSON format before processing
4. WHEN importing data THEN the system SHALL handle conflicts by using timestamp-based resolution
5. WHEN data conflicts cannot be auto-resolved THEN the system SHALL surface them in a modal for user decision

### Requirement 9

**User Story:** As a user, I want the app to be installable as a PWA, so that I can access it like a native app on my device.

#### Acceptance Criteria

1. WHEN the user visits the app THEN the system SHALL provide PWA installation prompts
2. WHEN installed THEN the system SHALL function as a standalone app with proper icons and manifest
3. WHEN the app is installed THEN the system SHALL work offline with full functionality
4. WHEN deployed THEN the system SHALL be accessible via Cloudflare Pages
5. WHEN the service worker is active THEN the system SHALL handle caching strategies appropriately

### Requirement 10

**User Story:** As a user, I want proper error handling and feedback, so that I understand what's happening when issues occur.

#### Acceptance Criteria

1. WHEN IndexedDB storage approaches quota limits THEN the system SHALL show a snackbar warning about storage space
2. WHEN Google Drive authentication fails or expires THEN the system SHALL attempt silent refresh and show reconnection prompt on failure
3. WHEN Drive write conflicts occur from simultaneous devices THEN the system SHALL use timestamp-based resolution and surface non-mergeable conflicts
4. WHEN network requests fail THEN the system SHALL provide appropriate user feedback
5. WHEN critical errors occur THEN the system SHALL maintain app stability and provide recovery options