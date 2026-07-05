export type SlackTheme = {
  columnBg: string;
  menuBg: string;
  activeItem: string;
  activeItemText: string;
  hoverItem: string;
  textColor: string;
  activePresence: string;
  mentionBadge: string;
  topNavBg: string;
  topNavText: string;
};

export type MattermostTheme = {
  sidebarBg: string;
  sidebarText: string;
  sidebarUnreadText: string;
  sidebarTextHoverBg: string;
  sidebarTextActiveBorder: string;
  sidebarTextActiveColor: string;
  sidebarHeaderBg: string;
  sidebarHeaderTextColor: string;
  sidebarTeamBarBg: string;
  onlineIndicator: string;
  awayIndicator: string;
  dndIndicator: string;
  mentionBg: string;
  mentionBj: string;
  mentionColor: string;
  centerChannelBg: string;
  centerChannelColor: string;
  newMessageSeparator: string;
  linkColor: string;
  buttonBg: string;
  buttonColor: string;
  errorTextColor: string;
  mentionHighlightBg: string;
  mentionHighlightLink: string;
  codeTheme: "github" | "monokai";
};

const SLACK_KEYS: Array<keyof SlackTheme> = [
  "columnBg",
  "menuBg",
  "activeItem",
  "activeItemText",
  "hoverItem",
  "textColor",
  "activePresence",
  "mentionBadge",
  "topNavBg",
  "topNavText",
];

export function normalizeHex(value: string): string {
  const trimmed = value.trim();
  const withoutHash = trimmed.startsWith("#") ? trimmed.slice(1) : trimmed;

  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(withoutHash)) {
    throw new Error(`Invalid hex color: ${value}`);
  }

  const expanded =
    withoutHash.length === 3
      ? withoutHash
          .split("")
          .map((char) => char + char)
          .join("")
      : withoutHash;

  return `#${expanded.toLowerCase()}`;
}

export function parseSlackTheme(input: string): SlackTheme {
  const parts = input
    .trim()
    .replace(/^slack:\/\/theme\?/, "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 8 || parts.length > 10) {
    throw new Error("Slack themes must contain 8 to 10 comma-separated colors.");
  }

  const colors = parts.map(normalizeHex);
  const fallbackTopNavBg = colors[1];
  const fallbackTopNavText = colors[5];
  const completeColors = [...colors, fallbackTopNavBg, fallbackTopNavText].slice(0, 10);

  return SLACK_KEYS.reduce((theme, key, index) => {
    theme[key] = completeColors[index];
    return theme;
  }, {} as SlackTheme);
}

export function serializeSlackTheme(theme: SlackTheme): string {
  return SLACK_KEYS.map((key) => theme[key]).join(",");
}

export function convertSlackToMattermost(input: string | SlackTheme): MattermostTheme {
  const slack = typeof input === "string" ? parseSlackTheme(input) : input;
  const isDarkCenter = relativeLuminance(slack.menuBg) < 0.45;
  const mentionText = bestTextColor(slack.mentionBadge);
  const channelBg = isDarkCenter ? mix(slack.menuBg, "#000000", 0.08) : "#ffffff";
  const channelText = isDarkCenter ? bestTextColor(channelBg) : "#3f4350";
  const linkColor = bestAccent(slack.activeItem, isDarkCenter);

  return {
    sidebarBg: slack.menuBg,
    sidebarText: slack.textColor,
    sidebarUnreadText: slack.topNavText,
    sidebarTextHoverBg: slack.hoverItem,
    sidebarTextActiveBorder: slack.activeItem,
    sidebarTextActiveColor: slack.activeItemText,
    sidebarHeaderBg: slack.topNavBg,
    sidebarHeaderTextColor: slack.topNavText,
    sidebarTeamBarBg: slack.columnBg,
    onlineIndicator: slack.activePresence,
    awayIndicator: "#ffbc1f",
    dndIndicator: "#d24b4e",
    mentionBg: slack.mentionBadge,
    mentionBj: slack.mentionBadge,
    mentionColor: mentionText,
    centerChannelBg: channelBg,
    centerChannelColor: channelText,
    newMessageSeparator: slack.activeItem,
    linkColor,
    buttonBg: slack.activeItem,
    buttonColor: slack.activeItemText,
    errorTextColor: "#d24b4e",
    mentionHighlightBg: mix(slack.mentionBadge, channelBg, isDarkCenter ? 0.35 : 0.78),
    mentionHighlightLink: linkColor,
    codeTheme: isDarkCenter ? "monokai" : "github",
  };
}

export function formatMattermostTheme(theme: MattermostTheme): string {
  return JSON.stringify(theme);
}

export function prettifyMattermostTheme(theme: MattermostTheme): string {
  return JSON.stringify(theme, null, 2);
}

function bestAccent(color: string, darkMode: boolean): string {
  if (contrastRatio(color, darkMode ? "#1f2329" : "#ffffff") >= 3) {
    return color;
  }

  return darkMode ? mix(color, "#ffffff", 0.35) : mix(color, "#005cc5", 0.45);
}

function bestTextColor(background: string): string {
  return contrastRatio("#ffffff", background) >= contrastRatio("#1f2329", background)
    ? "#ffffff"
    : "#1f2329";
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const normalized = channel / 255;
    return normalized <= 0.03928
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const lighter = Math.max(relativeLuminance(a), relativeLuminance(b));
  const darker = Math.min(relativeLuminance(a), relativeLuminance(b));
  return (lighter + 0.05) / (darker + 0.05);
}

function mix(a: string, b: string, amountOfB: number): string {
  const rgbA = hexToRgb(a);
  const rgbB = hexToRgb(b);
  const mixed = rgbA.map((channel, index) =>
    Math.round(channel * (1 - amountOfB) + rgbB[index] * amountOfB),
  );

  return rgbToHex(mixed);
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = normalizeHex(hex).slice(1);
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
}

function rgbToHex(channels: number[]): string {
  return `#${channels
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, "0"))
    .join("")}`;
}
