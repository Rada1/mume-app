const fs = require('fs');
const path = 'src/constants/mastersettings.json';

try {
    const data = JSON.parse(fs.readFileSync(path, 'utf8'));
    const b = data.buttons.find(x => x.id === 'spit-follow');
    
    if (b) {
        // This regex finds the capitalized word immediately preceding the beckon sentence.
        // It's robust against prefixes like "A Dûnadan ".
        b.trigger.pattern = "\\b([A-Z\\u00C0-\\u017F][A-Za-z\\u00C0-\\u017F]*) beckons for you to follow h(?:im|er)";
        b.trigger.isRegex = true;
        fs.writeFileSync(path, JSON.stringify(data));
        console.log('Updated spit-follow pattern to be keyword-focused');
    }
} catch (e) {
    console.error(e);
    process.exit(1);
}
