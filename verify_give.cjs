const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'constants', 'mastersettings.json');

try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    const giveButton = data.buttons.find(b => b.id === 'cat-obj-char-give');
    
    if (giveButton) {
        console.log('--- Give Button Found ---');
        console.log(JSON.stringify(giveButton, null, 2));
        
        if (giveButton.actionType === 'select-recipient') {
            console.log('✅ VERIFIED: actionType is "select-recipient"');
        } else {
            console.log('❌ ERROR: actionType is NOT "select-recipient". Current value:', giveButton.actionType);
        }
        
        const inInlineSet = data.buttons.filter(b => b.setId === 'inline-obj-char').map(b => b.id);
        console.log('Buttons in inline-obj-char set:', inInlineSet);
        
        if (inInlineSet.includes('cat-obj-char-give')) {
            console.log('✅ VERIFIED: Button is in "inline-obj-char" set');
        } else {
            console.log('❌ ERROR: Button is NOT in "inline-obj-char" set');
        }
    } else {
        console.log('❌ ERROR: cat-obj-char-give button NOT FOUND');
    }

} catch (err) {
    console.error('❌ FAILED to parse mastersettings.json:', err.message);
}
