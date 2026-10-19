import type { CausalGraph, GraphNode } from '../data/types';
import { escapeHtml } from './format';

const BOX_WIDTH = 170;
const BOX_HEIGHT = 54;
/** Paths carrying at least this share are drawn in the accent colour. */
const MAIN_PATH_SHARE = 50;

/**
 * Left-to-right causal graph. Edge width encodes each path's share of the
 * deviation; links with share 0 are dashed (correlated, not causal).
 */
export function buildCausalGraph(graph: CausalGraph): string {
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const outcome = graph.nodes.find((node) => node.isOutcome);

  const defs =
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="userSpaceOnUse" ' +
    'markerWidth="10" markerHeight="10" orient="auto-start-reverse">' +
    '<path d="M0,0 L10,5 L0,10 z" fill="var(--muted)"/></marker></defs>';

  const edges = graph.edges.map(([fromId, toId, share]) => {
    const from = byId.get(fromId);
    const to = byId.get(toId);
    if (!from || !to) throw new Error(`Unknown node in edge ${fromId} → ${toId}`);
    return edgeMarkup(from, to, share, to !== outcome);
  });

  return defs + edges.join('') + graph.nodes.map(nodeMarkup).join('');
}

function edgeMarkup(from: GraphNode, to: GraphNode, share: number, labelled: boolean): string {
  const x1 = from.x + BOX_WIDTH;
  const y1 = from.y + BOX_HEIGHT / 2;
  const x2 = to.x - 4;
  const y2 = to.y + BOX_HEIGHT / 2;
  const mid = (x1 + x2) / 2;

  const isCausal = share > 0;
  const width = isCausal ? Math.min(6, 1.5 + share / 14) : 1.5;
  const colour = share >= MAIN_PATH_SHARE ? 'var(--accent)' : 'var(--muted)';
  const dash = isCausal ? '' : ' stroke-dasharray="4 4"';

  let markup =
    `<path class="edge" d="M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}" fill="none" ` +
    `stroke="${colour}" stroke-width="${width}"${dash} marker-end="url(#arrow)" opacity="${isCausal ? 1 : 0.7}"/>`;

  if (isCausal && labelled) {
    const labelY = y2 > y1 ? y1 - 8 : y1 + 19;
    markup += `<text x="${x1 + 10}" y="${labelY}" font-size="12" font-weight="500" fill="var(--fg)" font-family="IBM Plex Mono, monospace">${share} %</text>`;
  }
  return markup;
}

function nodeMarkup(node: GraphNode): string {
  const fill = node.isOutcome ? 'var(--crit-soft)' : 'var(--surface)';
  const stroke = node.isOutcome ? 'var(--crit)' : node.isSymptom ? 'var(--line)' : 'var(--muted)';
  const dash = node.isSymptom ? ' stroke-dasharray="4 3"' : '';
  return (
    `<rect class="node" x="${node.x}" y="${node.y}" width="${BOX_WIDTH}" height="${BOX_HEIGHT}" rx="8" fill="${fill}" stroke="${stroke}"${dash}/>` +
    `<text x="${node.x + 12}" y="${node.y + 22}" font-size="13" font-weight="600" fill="var(--fg)" font-family="Public Sans, Arial, sans-serif">${escapeHtml(node.title)}</text>` +
    `<text x="${node.x + 12}" y="${node.y + 41}" font-size="11" fill="var(--muted)" font-family="IBM Plex Mono, monospace">${escapeHtml(node.value)}</text>`
  );
}
