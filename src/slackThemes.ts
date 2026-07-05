import { parseSlackTheme, serializeSlackTheme, type SlackTheme } from "./converter";

export type SlackThemePreset = {
  id: string;
  name: string;
  colors: SlackTheme;
  source: "slackthemes.net" | "fallback";
};

const FALLBACK_THEMES: Array<{ id: string; name: string; theme: string }> = [
  {
    id: "aubergine",
    name: "Aubergine",
    theme: "#4d394b,#3e313c,#4c9689,#ffffff,#3e313c,#ffffff,#38978d,#eb4d5c,#350d36,#ffffff",
  },
  {
    id: "hoth",
    name: "Hoth",
    theme: "#ffffff,#f8f8f8,#2d9ee0,#ffffff,#efefef,#383f45,#60d156,#dc5960,#f8f8f8,#383f45",
  },
  {
    id: "monument",
    name: "Monument",
    theme: "#0f1720,#182533,#3f8cff,#ffffff,#213247,#dbe6f3,#2ec27e,#ff5b78,#111b26,#e6edf6",
  },
  {
    id: "solarized-dark",
    name: "Solarized Dark",
    theme: "#073642,#002b36,#268bd2,#fdf6e3,#073642,#eee8d5,#2aa198,#dc322f,#073642,#eee8d5",
  },
  {
    id: "ochin",
    name: "Ochin",
    theme: "#303e4d,#3f5366,#6698c8,#ffffff,#4f6377,#dbe5ef,#9ec46f,#d86f72,#2b3948,#ffffff",
  },
];

export function fallbackThemes(): SlackThemePreset[] {
  return FALLBACK_THEMES.map((theme) => ({
    id: theme.id,
    name: theme.name,
    colors: parseSlackTheme(theme.theme),
    source: "fallback",
  }));
}

export async function loadSlackThemes(): Promise<SlackThemePreset[]> {
  const response = await fetch("https://slackthemes.net/", {
    headers: { Accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`slackthemes.net responded with ${response.status}`);
  }

  const html = await response.text();
  const themes = parseSlackThemesHtml(html);

  if (themes.length === 0) {
    throw new Error("No themes found on slackthemes.net");
  }

  return themes;
}

export function parseSlackThemesHtml(html: string): SlackThemePreset[] {
  return Array.from(readThemeElements(html))
    .map((element): SlackThemePreset | null => {
      try {
        const colors = parseSlackThemeValue(element.colors);
        const name = element.name || titleize(element.id);

        return {
          id: element.id,
          name,
          colors,
          source: "slackthemes.net" as const,
        };
      } catch {
        return null;
      }
    })
    .filter((theme): theme is SlackThemePreset => theme !== null)
    .filter(dedupeByColorString);
}

function* readThemeElements(html: string): Generator<{ id: string; name: string; colors: string }> {
  const tagPattern = /<(?<tag>[a-z0-9-]+)\b(?<attrs>[^>]*\bdata-colors=(["'])(?<colors>[\s\S]*?)\3[^>]*)>(?<body>[\s\S]*?)<\/\1>/gi;

  for (const match of html.matchAll(tagPattern)) {
    const groups = match.groups;
    const id = groups?.attrs ? readAttribute(groups.attrs, "id") : "";
    if (!id || !groups?.colors) {
      continue;
    }

    yield {
      id: decodeHtml(id),
      colors: decodeHtml(groups.colors),
      name: readName(groups.body),
    };
  }
}

function parseSlackThemeValue(value: string): SlackTheme {
  const trimmed = value.trim();

  if (trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as Partial<Record<SlackThemeSiteKey, string>>;
    return parseSlackTheme(
      [
        parsed.column_bg,
        parsed.menu_bg,
        parsed.active_item,
        parsed.active_item_text,
        parsed.hover_item,
        parsed.text_color,
        parsed.active_presence,
        parsed.mention_badge,
        parsed.top_nav_bg ?? parsed.menu_bg,
        parsed.top_nav_text ?? parsed.text_color,
      ].join(","),
    );
  }

  return parseSlackTheme(trimmed);
}

type SlackThemeSiteKey =
  | "column_bg"
  | "menu_bg"
  | "active_item"
  | "active_item_text"
  | "hover_item"
  | "text_color"
  | "active_presence"
  | "mention_badge"
  | "top_nav_bg"
  | "top_nav_text";

function readName(body: string): string {
  const title = body.match(/<[^>]+class=(["'])[^"']*\bp-prefs_modal__radio__title\b[^"']*\1[^>]*>(?<text>[\s\S]*?)<\/[^>]+>/i);
  const heading =
    title ?? body.match(/<(?:h2|h3|h4|strong|button)\b[^>]*>(?<text>[\s\S]*?)<\/(?:h2|h3|h4|strong|button)>/i);
  return heading?.groups?.text ? cleanText(heading.groups.text) : "";
}

function cleanText(value: string): string {
  return decodeHtml(value.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readAttribute(attrs: string, name: string): string {
  const match = attrs.match(new RegExp(`\\b${name}=(["'])(?<value>[^"']+)\\1`, "i"));
  return match?.groups?.value ?? "";
}

function dedupeByColorString(theme: SlackThemePreset, index: number, themes: SlackThemePreset[]) {
  return (
    themes.findIndex((candidate) => serializeSlackTheme(candidate.colors) === serializeSlackTheme(theme.colors)) ===
    index
  );
}

function titleize(id: string): string {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
