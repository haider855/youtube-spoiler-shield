# YouTube Spoiler Shield

YouTube Spoiler Shield is a privacy-first Chrome extension that blurs YouTube videos, Shorts, search results, and recommendations when they match spoiler keywords chosen by the user.

## What It Does

The extension lets users add spoiler keywords such as character names, team names, movie titles, game titles, or event names. When YouTube content matches one of those keywords, the video card is blurred and covered with a spoiler warning.

Users can reveal blocked videos manually, pause individual keywords, organize keywords into groups, and back up their settings.

## Why I Built It

I built this project to solve a common problem: accidentally seeing spoilers on YouTube through titles, thumbnails, Shorts, and recommended videos.

YouTube loads content dynamically, so a simple static page filter is not enough. This project gave me a practical way to work with Chrome extension APIs, dynamic DOM updates, local browser storage, and real-world UI behavior.

## Key Features

- Blur YouTube videos that match saved spoiler keywords.
- Works across YouTube home, search results, watch-page recommendations, sidebar videos, and Shorts surfaces.
- Detects dynamically loaded videos while scrolling.
- Matches punctuation and spacing variants, such as `Spider-Man`, `Spider Man`, and `Spiderman`.
- Add, remove, pause, and resume individual keywords.
- Organize keywords into groups such as Anime, Sports, Movies, or custom groups.
- Pause or resume whole keyword groups.
- Bulk select keywords and move them between groups.
- Reveal blocked videos manually.
- Import and export a local backup of keywords and groups.
- Stores all settings locally in the browser.

## Screenshots

### Popup

| Keywords | Groups | Settings |
| --- | --- | --- |
| ![Keywords popup](docs/screenshots/popup-keywords.png) | ![Groups popup](docs/screenshots/popup-groups.png) | ![Settings popup](docs/screenshots/popup-settings.png) |

### YouTube Blocking

![Blocked YouTube search results](docs/screenshots/youtube-search-results.png)

![Blocked YouTube sidebar recommendations](docs/screenshots/youtube-sidebar.png)

## Tech Stack

- TypeScript
- Chrome Extension Manifest V3
- Chrome Storage API
- Chrome content scripts
- MutationObserver
- HTML
- CSS
- Node.js / npm

## How It Works

The extension injects a content script into YouTube pages. The content script scans video cards, Shorts, search results, and recommendation areas for text that could contain spoilers.

Saved keywords are loaded from Chrome local storage. Each video card is checked against the active keyword list. If a match is found, the extension applies a blur overlay and stores metadata on the card so it can update cleanly later.

YouTube updates pages dynamically without full reloads, so the extension also uses `MutationObserver` to watch for newly loaded content while scrolling or navigating between YouTube pages.

## Installation

### Option 1: Install From Release Zip

1. Go to the latest GitHub release:

   <https://github.com/haider855/youtube-spoiler-shield/releases/latest>

2. Download:

   ```text
   youtube-spoiler-shield-v0.1.0.zip
   ```

3. Extract the zip file.

4. Open Chrome and go to:

   ```text
   chrome://extensions
   ```

5. Turn on **Developer mode**.

6. Click **Load unpacked**.

7. Select the extracted folder that contains `manifest.json`.

8. Open or refresh YouTube.

### Option 2: Build From Source

1. Install dependencies:

   ```bash
   npm install
   ```

2. Build the extension:

   ```bash
   npm run build
   ```

3. Open Chrome and go to:

   ```text
   chrome://extensions
   ```

4. Turn on **Developer mode**.

5. Click **Load unpacked**.

6. Select the project folder.

7. Open or refresh YouTube.

## Usage

1. Click the YouTube Spoiler Shield extension icon.
2. Add spoiler keywords.
3. Choose a group for each keyword if needed.
4. Keep protection enabled.
5. Browse YouTube normally.

Matching videos will be blurred with a spoiler overlay. Users can reveal a blocked video manually if they choose.

## What I Learned

- How Chrome Extension Manifest V3 projects are structured.
- Used Chrome content scripts to detect and modify live YouTube page elements.
- How to store extension settings with the Chrome Storage API.
- Used `MutationObserver` to handle dynamically loaded YouTube content after scrolling and navigation.
- How to handle YouTube’s single-page navigation behavior.
- How to design a popup UI for extension settings.
- How to write matching logic that handles punctuation and spacing edge cases.
- How to package and release a browser extension manually through GitHub.

## Challenges

### Handling YouTube’s Dynamic UI

YouTube does not always reload the page when users search, navigate, or scroll. New videos can appear after the extension has already scanned the page.

To solve this, I added DOM observation so the extension can rescan new content as it appears.

### Matching Keyword Variants

Simple string matching was not enough because spoilers can appear with punctuation or spacing differences. For example, a user may save `Spiderman`, but YouTube titles may use `Spider-Man`.

I added normalized and compact matching so punctuation and spacing variants are detected more reliably.

### Supporting Different YouTube Surfaces

YouTube uses different markup for home videos, search results, Shorts, and sidebar recommendations. The extension needed card detection logic that could handle multiple layouts without blocking unrelated parts of the page.

### Keeping The Extension Privacy-First

The extension needed to work without accounts, analytics, or remote servers. All keyword data is stored locally, and matching happens in the browser.

## Privacy

YouTube Spoiler Shield does not collect, sell, transmit, or share user data.

Spoiler keywords, groups, and extension settings are stored locally using Chrome extension storage. They do not leave the user’s device.

The extension requests:

- `storage`: to save keywords, groups, and settings locally.
- `https://www.youtube.com/*`: to detect and blur matching YouTube content.

No analytics, tracking, remote servers, or user accounts are used.

## Development

Build the extension:

```bash
npm run build
```

Run tests:

```bash
npm run test
```

Watch TypeScript changes:

```bash
npm run watch
```

## Future Improvements

- Add an allowlist for trusted channels or videos.
- Add configurable blur strength.
- Add an option to hide only thumbnails or hide the full card.
- Add Chrome Web Store publishing.
- Add automated browser-based tests for YouTube page layouts.

## Status

This project is an MVP public release.

Current release: `v0.1.0`

## License

This project is licensed under the MIT License.

## Disclaimer

YouTube Spoiler Shield is not affiliated with, endorsed by, sponsored by, or associated with YouTube or Google.
