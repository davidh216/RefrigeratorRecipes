// Menus as the app receives them (GET /v1/content/menus).

export type MenuWindow = { from: string; to: string };
export type Menu = { id: string; draft?: boolean; window?: MenuWindow; windows?: MenuWindow[] } & Record<string, unknown>;
export type MenuContent = { rotation: string[]; menus: Menu[] } & Record<string, unknown>;

/**
 * The menus to send on `day` (YYYY-MM-DD, UTC): drafts left out (they wait for review), and the
 * file's notes ("about", "reviewNotes") stripped. A holiday whose date moves lists one window per
 * year in `windows`; builds from before that read only `window`, so it's set to the current or next
 * occurrence (or the last one, once they've all passed).
 */
export function servedMenus(content: MenuContent, day: string): { rotation: string[]; menus: Menu[] } {
  const menus = content.menus
    .filter((m) => !m.draft)
    .map(({ reviewNotes: _notes, ...m }) => {
      const menu = m as Menu;
      if (!menu.windows?.length) return menu;
      const current = menu.windows.find((w) => w.to >= day) ?? menu.windows[menu.windows.length - 1];
      return { ...menu, window: current };
    });
  return { rotation: content.rotation, menus };
}
