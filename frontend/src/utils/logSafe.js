/**
 * Make a value safe to put in a log line: strips CR/LF and other control characters
 * (prevents forged log entries) and truncates.
 * @param {unknown} value
 * @param {number} [maxLength=200]
 * @returns {string}
 */
export function sanitizeForLog(value, maxLength = 200) {
  // eslint-disable-next-line no-control-regex
  return (value == null ? '' : String(value)).replaceAll(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ').slice(0, maxLength);
}
