/**
 * Convert Milvus filter syntax to LanceDB syntax.
 *
 * Milvus: `source == "file.md"`, `chunk_hash in ["a", "b"]`, `a == "1" and b == "2"`
 * LanceDB: `source = 'file.md'`, `chunk_hash IN ['a', 'b']`, `a = '1' AND b = '2'`
 */
export function convertFilter(milvusFilter: string): string {
  if (!milvusFilter || milvusFilter.trim() === '') {
    return milvusFilter;
  }

  let result = milvusFilter;
  const stringLiterals: string[] = [];
  const STRING_PLACEHOLDER = '\x00STR\x00';

  result = result.replace(/"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g, (match) => {
    stringLiterals.push(match);
    return `${STRING_PLACEHOLDER}${stringLiterals.length - 1}\x00`;
  });

  result = result.replace(/==/g, '=');
  result = result.replace(/\band\b/gi, 'AND');
  result = result.replace(/\bor\b/gi, 'OR');
  result = result.replace(/\bin\b/gi, 'IN');

  const placeholderRegex = new RegExp(
    `${STRING_PLACEHOLDER.replace(/\x00/g, '\\x00')}(\\d+)\\x00`,
    'g'
  );
  result = result.replace(placeholderRegex, (_, index: string) => {
    const original = stringLiterals[parseInt(index, 10)];
    if (!original) return '';
    if (original.startsWith('"')) {
      const inner = original.slice(1, -1);
      const unescaped = inner.replace(/\\"/g, '"').replace(/'/g, "\\'");
      return `'${unescaped}'`;
    }
    return original;
  });

  return result;
}
