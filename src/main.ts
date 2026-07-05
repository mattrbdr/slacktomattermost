import {
  convertSlackToMattermost,
  formatMattermostTheme,
  parseSlackTheme,
  prettifyMattermostTheme,
  serializeSlackTheme,
  type MattermostTheme,
  type SlackTheme,
} from "./converter";
import { fallbackThemes, loadSlackThemes, type SlackThemePreset } from "./slackThemes";
import "./styles.css";

type State = {
  presets: SlackThemePreset[];
  selectedPresetId: string;
  input: string;
  compactOutput: boolean;
  status: string;
  error: string;
  sourceLabel: string;
};

const initialTheme = fallbackThemes()[0];
const state: State = {
  presets: fallbackThemes(),
  selectedPresetId: initialTheme.id,
  input: serializeSlackTheme(initialTheme.colors),
  compactOutput: true,
  status: "Fallback themes ready",
  error: "",
  sourceLabel: "local fallback",
};

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Missing #app root");
}

const root = app;

render();
void hydratePresets();

async function hydratePresets() {
  try {
    setState({ status: "Loading slackthemes.net...", error: "" });
    const presets = await loadSlackThemes();
    const current = presets.find((preset) => preset.id === state.selectedPresetId) ?? presets[0];
    setState({
      presets,
      selectedPresetId: current.id,
      input: serializeSlackTheme(current.colors),
      status: `${presets.length} themes loaded`,
      sourceLabel: "slackthemes.net",
    });
  } catch (error) {
    setState({
      status: "Using bundled fallback themes",
      error: error instanceof Error ? error.message : "Unable to load slackthemes.net",
      sourceLabel: "local fallback",
    });
  }
}

function setState(next: Partial<State>) {
  Object.assign(state, next);
  render();
}

function render() {
  const conversion = readConversion();
  const selectedTheme = state.presets.find((preset) => preset.id === state.selectedPresetId);
  const output = conversion
    ? state.compactOutput
      ? formatMattermostTheme(conversion.mattermost)
      : prettifyMattermostTheme(conversion.mattermost)
    : "";

  root.innerHTML = `
    <section class="shell">
      <header class="masthead">
        <div>
          <p class="eyebrow">Slack to Mattermost</p>
          <h1>Theme Converter</h1>
        </div>
        <div class="status" data-tone="${state.error ? "warn" : "ok"}">
          <span>${escapeHtml(state.status)}</span>
          <small>${escapeHtml(state.sourceLabel)}</small>
        </div>
      </header>

      <section class="workspace">
        <aside class="panel controls">
          <div class="panel-title">
            <span>Input</span>
            <small>Slack palette</small>
          </div>
          <label class="field">
            <span>Preset</span>
            <select id="preset">
              ${state.presets
                .map(
                  (preset) =>
                    `<option value="${escapeHtml(preset.id)}" ${preset.id === state.selectedPresetId ? "selected" : ""}>${escapeHtml(preset.name)}</option>`,
                )
                .join("")}
            </select>
          </label>

          <label class="field">
            <span>Slack colors</span>
            <textarea id="input" spellcheck="false">${escapeHtml(state.input)}</textarea>
          </label>

          <div class="swatches" aria-label="Slack theme colors">
            ${(conversion ? Object.entries(conversion.slack) : [])
              .map(
                ([key, color]) => `
                  <div class="swatch" title="${key}: ${color}">
                    <span style="background: ${color}"></span>
                    <small>${labelize(key)}</small>
                  </div>
                `,
              )
              .join("")}
          </div>

          <div class="actions">
            <button id="reload" type="button" class="secondary">Reload</button>
            <button id="sample" type="button" class="secondary">Reset</button>
          </div>
          ${state.error ? `<p class="notice">${escapeHtml(state.error)}</p>` : ""}
        </aside>

        <section class="panel preview" aria-label="Mattermost preview">
          ${conversion ? renderPreview(conversion.mattermost, selectedTheme?.name ?? "Custom theme") : renderError()}
        </section>

        <section class="panel output">
          <div class="output-header">
            <div class="panel-title">
              <span>Mattermost JSON</span>
              <small>Paste into Mattermost custom theme</small>
            </div>
            <label class="toggle">
              <input id="compact" type="checkbox" ${state.compactOutput ? "checked" : ""} />
              <span>Compact</span>
            </label>
          </div>
          <textarea id="output" spellcheck="false" readonly>${escapeHtml(output)}</textarea>
          <div class="actions">
            <button id="copy" type="button">Copy</button>
            <button id="download" type="button" class="secondary">Download</button>
          </div>
        </section>
      </section>
    </section>
  `;

  bindEvents(output);
}

function readConversion(): { slack: SlackTheme; mattermost: MattermostTheme } | null {
  try {
    const slack = parseSlackTheme(state.input);
    return {
      slack,
      mattermost: convertSlackToMattermost(slack),
    };
  } catch {
    return null;
  }
}

function renderPreview(theme: MattermostTheme, name: string) {
  return `
    <div class="mattermost-preview" style="
      --team: ${theme.sidebarTeamBarBg};
      --side: ${theme.sidebarBg};
      --side-text: ${theme.sidebarText};
      --side-hover: ${theme.sidebarTextHoverBg};
      --active: ${theme.sidebarTextActiveBorder};
      --active-text: ${theme.sidebarTextActiveColor};
      --header: ${theme.sidebarHeaderBg};
      --header-text: ${theme.sidebarHeaderTextColor};
      --center: ${theme.centerChannelBg};
      --center-text: ${theme.centerChannelColor};
      --button: ${theme.buttonBg};
      --button-text: ${theme.buttonColor};
      --mention: ${theme.mentionBg};
      --mention-text: ${theme.mentionColor};
      --link: ${theme.linkColor};
      --online: ${theme.onlineIndicator};
    ">
      <div class="team-rail">
        <span>SM</span>
        <span>MM</span>
      </div>
      <div class="sidebar">
        <div class="sidebar-head">${escapeHtml(name)}</div>
        <div class="sidebar-item active">town-square</div>
        <div class="sidebar-item">release-room <b>3</b></div>
        <div class="sidebar-item muted"><i></i> matteo</div>
      </div>
      <div class="channel">
        <div class="channel-head">town-square</div>
        <div class="message">
          <strong>Theme Bot</strong>
          <p>Converted from a Slack palette into Mattermost theme keys.</p>
          <a>Review imported colors</a>
        </div>
        <div class="message mention">
          <strong>@you</strong>
          <p>This mention badge uses the Slack mention color with readable text.</p>
        </div>
        <button>Save theme</button>
      </div>
    </div>
  `;
}

function renderError() {
  return `
    <div class="empty-state">
      <h2>Invalid Slack theme</h2>
      <p>Use 8 to 10 comma-separated hex colors.</p>
    </div>
  `;
}

function bindEvents(output: string) {
  document.querySelector<HTMLSelectElement>("#preset")?.addEventListener("change", (event) => {
    const id = (event.currentTarget as HTMLSelectElement).value;
    const preset = state.presets.find((candidate) => candidate.id === id);
    if (!preset) {
      return;
    }

    setState({ selectedPresetId: id, input: serializeSlackTheme(preset.colors), error: "" });
  });

  document.querySelector<HTMLTextAreaElement>("#input")?.addEventListener("input", (event) => {
    setState({
      input: (event.currentTarget as HTMLTextAreaElement).value,
      selectedPresetId: "custom",
      error: "",
    });
  });

  document.querySelector<HTMLInputElement>("#compact")?.addEventListener("change", (event) => {
    setState({ compactOutput: (event.currentTarget as HTMLInputElement).checked });
  });

  document.querySelector<HTMLButtonElement>("#reload")?.addEventListener("click", () => {
    void hydratePresets();
  });

  document.querySelector<HTMLButtonElement>("#sample")?.addEventListener("click", () => {
    const [first] = fallbackThemes();
    setState({ selectedPresetId: first.id, input: serializeSlackTheme(first.colors), error: "" });
  });

  document.querySelector<HTMLButtonElement>("#copy")?.addEventListener("click", async () => {
    await navigator.clipboard.writeText(output);
    setState({ status: "Mattermost JSON copied" });
  });

  document.querySelector<HTMLButtonElement>("#download")?.addEventListener("click", () => {
    const blob = new Blob([output], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mattermost-theme.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
}

function labelize(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
