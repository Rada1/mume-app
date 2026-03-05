export class AnsiDecoder {
    /**
     * Strips all ANSI escape sequences from a string.
     */
    static strip(text: string): string {
        // Broad regex to catch common ANSI sequences
        return text.replace(/\x1b\[[0-9;]*m/g, '').trim();
    }

    /**
     * Extracts a clean name from MUME's GMCP name format.
     */
    static cleanName(rawName: string): string {
        let name = rawName.trim();
        if (name.startsWith('"') && name.endsWith('"')) {
            name = name.substring(1, name.length - 1);
        } else if (name.startsWith('{')) {
            try {
                const parsed = JSON.parse(name);
                name = parsed.name || parsed.fullname || name;
            } catch (e) { }
        }
        return this.strip(name);
    }
}
