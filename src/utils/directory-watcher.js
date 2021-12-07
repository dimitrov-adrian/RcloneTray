import nsfw from 'vscode-nsfw';

/**
 * Watches a directory for changes.
 * @param {string} directory The directory to watch.
 * @param {(events: import('vscode-nsfw').FileChangeEvent[]) => void} onChange The callback to call when a change is detected.
 * @returns {Promise<() => Promise<void>>}
 */
export async function watchDirectory(directory, onChange) {
	const watcher = await nsfw(directory, onChange, {
		debounceMS: 3000,
	});

	return () => watcher.stop();
}
