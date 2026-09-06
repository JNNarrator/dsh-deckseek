import type * as Md from 'mdast';
/** Plain text of one inline mdast node (text and inlineCode carry content). */
export declare function cellText(node: Md.PhrasingContent): string;
/** RFC 4180 CSV for one mdast table. */
export declare function tableToCsv(table: Md.Table): string;
//# sourceMappingURL=table-csv.d.ts.map