import { describe, expect, it } from "vitest";
import {
  convertSlackToMattermost,
  formatMattermostTheme,
  normalizeHex,
  parseSlackTheme,
} from "./converter";

describe("Slack theme parsing", () => {
  it("normalizes the 10-color Slack theme format used by slackthemes.net", () => {
    const theme = parseSlackTheme(
      "4D394B,3E313C,4C9689,FFFFFF,3E313C,FFFFFF,38978D,EB4D5C,350D36,FFFFFF",
    );

    expect(theme).toEqual({
      columnBg: "#4d394b",
      menuBg: "#3e313c",
      activeItem: "#4c9689",
      activeItemText: "#ffffff",
      hoverItem: "#3e313c",
      textColor: "#ffffff",
      activePresence: "#38978d",
      mentionBadge: "#eb4d5c",
      topNavBg: "#350d36",
      topNavText: "#ffffff",
    });
  });

  it("supports old 8-color Slack themes by falling back to menu and text colors", () => {
    const theme = parseSlackTheme(
      "#1d1c1d,#222529,#1264a3,#ffffff,#2c2d30,#d1d2d3,#2bac76,#e01e5a",
    );

    expect(theme.topNavBg).toBe("#222529");
    expect(theme.topNavText).toBe("#d1d2d3");
  });

  it("rejects malformed colors", () => {
    expect(() => normalizeHex("nope")).toThrow("Invalid hex color");
  });
});

describe("Mattermost conversion", () => {
  it("maps Slack sidebar colors to the documented Mattermost JSON keys", () => {
    const mattermost = convertSlackToMattermost(
      "#4d394b,#3e313c,#4c9689,#ffffff,#3e313c,#ffffff,#38978d,#eb4d5c,#350d36,#ffffff",
    );

    expect(mattermost.sidebarTeamBarBg).toBe("#4d394b");
    expect(mattermost.sidebarBg).toBe("#3e313c");
    expect(mattermost.sidebarTextActiveBorder).toBe("#4c9689");
    expect(mattermost.sidebarTextActiveColor).toBe("#ffffff");
    expect(mattermost.onlineIndicator).toBe("#38978d");
    expect(mattermost.mentionBg).toBe("#eb4d5c");
    expect(mattermost.mentionBj).toBe("#eb4d5c");
  });

  it("returns a JSON string Mattermost can import", () => {
    const mattermost = convertSlackToMattermost(
      "#ffffff,#f8f8f8,#1264a3,#ffffff,#efefef,#1d1c1d,#2bac76,#e01e5a",
    );

    expect(() => JSON.parse(formatMattermostTheme(mattermost))).not.toThrow();
    expect(formatMattermostTheme(mattermost)).toContain('"codeTheme":"github"');
  });
});
