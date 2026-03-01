/**
 * Convert standard Markdown to Slack mrkdwn format.
 *
 * Handles:
 * - **bold** -> *bold*
 * - *italic* -> _italic_
 * - [text](url) -> <url|text>
 * - # headers -> *headers*
 */
export const markdownToMrkdwn = (markdown: string): string => {
  let result = markdown;

  // Convert **bold** to *bold*
  result = result.replace(/\*\*(.+?)\*\*/g, "*$1*");

  // Convert *italic* to _italic_ (but not **bold**)
  // Match single * not preceded or followed by *
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "_$1_");

  // Convert [text](url) to <url|text>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "<$2|$1>");

  // Convert headers (# ## ###) to bold
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "*$1*");

  return result;
};
