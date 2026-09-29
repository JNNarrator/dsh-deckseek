import { createContext, useContext } from 'react';
import type { MarkdownFileMentions } from './markdown/render.js';

/**
 * The produced-file resolver for the turn currently being rendered.
 *
 * A context rather than a prop because the resolver is needed six components
 * deep — turn → answer → blocks → reading text → markdown — and every one of
 * those is memoized on its own props. Threading a value that only changes once
 * per turn through all of them would invalidate each memo on the way.
 */
export const ProducedFilesContext = createContext<MarkdownFileMentions | undefined>(undefined);

export function useProducedFileMentions(): MarkdownFileMentions | undefined {
  return useContext(ProducedFilesContext);
}
