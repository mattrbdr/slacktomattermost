# Slack to Mattermost Theme Converter

A lightweight static web app that converts Slack theme color strings into Mattermost custom theme JSON.

Live app: https://slacktomattermost.c.mrbdrs.fr/

## Features

- Parses Slack 8-color and 10-color theme strings.
- Loads presets from `slackthemes.net` when available.
- Falls back to bundled themes if the remote site cannot be reached.
- Generates Mattermost JSON for the Custom Theme import field.
- Includes a live Mattermost-style preview, copy, and download actions.

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm test
npm run build
```
