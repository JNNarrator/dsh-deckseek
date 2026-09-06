import type * as Md from 'mdast';

/** Plain text of one inline mdast node (text and inlineCode carry content). */
export function cellText(node: Md.PhrasingContent): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  return '';
}

/** RFC 4180 CSV for one mdast table. */
export function tableToCsv(table: Md.Table): string {
  const rows = [table.children[0]?.children ?? [], ...table.children.slice(1).map(row => row.children)];
  return rows
    .map(row => row
      .map(cell => {
        const value = cell.children.map(cellText).join(' ').trim();
        return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
      })
      .join(','))
    .join('\r\n');
}
