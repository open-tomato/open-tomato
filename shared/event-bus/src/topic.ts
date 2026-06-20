/**
 * Determines whether a subscription pattern matches a given topic string.
 *
 * Supported pattern types:
 *
 * - **Exact**: `"build.done"` — matches only `"build.done"`.
 * - **Global wildcard**: `"*"` — matches any topic string.
 * - **Suffix wildcard**: `"impl.*"` — matches any topic that starts with `"impl."`,
 *   e.g. `"impl.done"`, `"impl.started"`.
 * - **Prefix wildcard**: `"*.done"` — matches any topic that ends with `".done"`,
 *   e.g. `"build.done"`, `"review.done"`.
 *
 * @param pattern - The subscription pattern to test.
 * @param topic   - The event topic to match against.
 * @returns `true` if the pattern matches the topic, `false` otherwise.
 *
 * @example
 * matchTopic('build.done', 'build.done')  // true
 * matchTopic('build.done', 'build.start') // false
 * matchTopic('*', 'anything')             // true
 * matchTopic('impl.*', 'impl.done')       // true
 * matchTopic('impl.*', 'build.done')      // false
 * matchTopic('*.done', 'build.done')      // true
 * matchTopic('*.done', 'build.started')   // false
 */
export function matchTopic(pattern: string, topic: string): boolean {
  if (pattern === '*') {
    return true;
  }

  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return topic.startsWith(prefix + '.');
  }

  if (pattern.startsWith('*.')) {
    const suffix = pattern.slice(2);
    return topic.endsWith('.' + suffix);
  }

  return pattern === topic;
}

/**
 * Returns `true` if the pattern contains a wildcard (`*`).
 *
 * @param pattern - The subscription pattern to inspect.
 * @returns `true` for wildcard patterns such as `"*"`, `"impl.*"`, `"*.done"`.
 *
 * @example
 * isWildcardPattern('*')         // true
 * isWildcardPattern('impl.*')    // true
 * isWildcardPattern('*.done')    // true
 * isWildcardPattern('build.done') // false
 */
export function isWildcardPattern(pattern: string): boolean {
  return pattern.includes('*');
}
