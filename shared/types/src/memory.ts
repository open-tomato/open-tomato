/**
 * A discrete unit of memory content with its token cost pre-calculated.
 */
export interface MemoryBlock {
  /** Unique identifier for this block. */
  id: string;

  /** Raw text content to be injected into the prompt. */
  content: string;

  /** Pre-calculated token count for the content field. */
  tokenCount: number;

  /** Optional classification tags for filtering or ordering. */
  tags?: string[];
}
