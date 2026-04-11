/**
 * Log capture helper.
 *
 * The app installs a pino logger that writes NDJSON to stdout. For test
 * assertions we want a structured array of log objects rather than a
 * concatenated string, so this helper redirects `process.stdout.write` to an
 * in-memory buffer and parses each line as JSON.
 *
 * Usage:
 *   const capture = captureLogs();
 *   // ...run test...
 *   const entries = capture.stop();
 *   expect(entries.find(e => e.event === 'phi.read')).toBeDefined();
 */
function captureLogs() {
    const lines = [];
    const originalStdoutWrite = process.stdout.write.bind(process.stdout);

    process.stdout.write = (chunk, encoding, cb) => {
        const str = typeof chunk === 'string' ? chunk : chunk.toString();
        for (const line of str.split('\n')) {
            if (!line.trim()) continue;
            try {
                lines.push(JSON.parse(line));
            } catch (_) {
                // non-JSON stdout (e.g. jest output) is ignored
            }
        }
        return originalStdoutWrite(chunk, encoding, cb);
    };

    return {
        entries() {
            return lines.slice();
        },
        raw() {
            return lines
                .map((l) => JSON.stringify(l))
                .join('\n');
        },
        stop() {
            process.stdout.write = originalStdoutWrite;
            return lines.slice();
        },
    };
}

module.exports = { captureLogs };
