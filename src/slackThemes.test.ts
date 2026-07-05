import { describe, expect, it } from "vitest";
import { parseSlackThemesHtml } from "./slackThemes";

describe("slackthemes.net parser", () => {
  it("extracts theme cards from the current data-colors markup", () => {
    const html = `
      <article id="aubergine" data-colors='{"column_bg":"#4D394B","menu_bg":"#3E313C","active_item":"#4C9689","active_item_text":"#FFFFFF","hover_item":"#3E313C","text_color":"#FFFFFF","active_presence":"#38978D","mention_badge":"#EB4D5C","top_nav_bg":"#350D36","top_nav_text":"#FFFFFF"}'>
        <h4>Aubergine</h4>
      </article>
      <article id="hoth" data-colors="#ffffff,#f8f8f8,#2d9ee0,#ffffff,#efefef,#383f45,#60d156,#dc5960">
        <h4>Hoth</h4>
      </article>
    `;

    const themes = parseSlackThemesHtml(html);

    expect(themes).toHaveLength(2);
    expect(themes[0]).toMatchObject({ id: "aubergine", name: "Aubergine" });
    expect(themes[1].colors.topNavBg).toBe("#f8f8f8");
  });
});
