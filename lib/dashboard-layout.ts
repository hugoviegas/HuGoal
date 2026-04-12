import type { WidgetConfig, WidgetRowItem } from '@/types/dashboard';

/**
 * Pure function: converts a flat WidgetConfig[] into WidgetRowItem[] for DraggableFlatList.
 * Consecutive compact widgets are paired into a single row.
 */
export function buildRowItems(widgets: WidgetConfig[]): WidgetRowItem[] {
  const enabled = widgets.filter((w) => w.enabled);
  const rows: WidgetRowItem[] = [];
  let i = 0;

  while (i < enabled.length) {
    const cur = enabled[i];

    if (cur.size === 'full') {
      rows.push({ kind: 'full', id: cur.id, widget: cur });
      i++;
      continue;
    }

    const nxt = enabled[i + 1];
    if (nxt?.size === 'compact') {
      rows.push({ kind: 'pair', id: `${cur.id}:${nxt.id}`, left: cur, right: nxt });
      i += 2;
    } else {
      rows.push({ kind: 'single', id: cur.id, widget: cur });
      i++;
    }
  }

  return rows;
}

/**
 * After a drag reorder in edit mode (flat list of enabled widgets),
 * merge the new enabled order back into the full widgets array
 * (which may include disabled widgets at their original relative positions).
 */
export function rebuildFullList(
  reorderedEnabled: WidgetConfig[],
  allWidgets: WidgetConfig[]
): WidgetConfig[] {
  const disabled = allWidgets.filter((w) => !w.enabled);
  // Disabled widgets append at the end, maintaining relative order among themselves
  return [...reorderedEnabled, ...disabled];
}
