
import { Tokenizer, TokenizerContext } from '../services/parser/Tokenizer';
import { EntityToken } from '../types';

const mockContext: TokenizerContext = {
    target: 'Orc',
    currentOccupants: [],
    roomNpcs: [
        { name: 'a green orc', isNpc: true }
    ],
    activeGroupMembers: [
        { name: 'Ciltor', id: 1 }
    ],
    roomItems: [{ name: 'a heavy sword' }],
    discoveredItems: [],
    inlineCategories: [],
    buttons: [],
    selectedObjectIds: new Set(),
    onlinePlayers: []
};

function test(text: string) {
    console.log(`\nTesting: "${text.replace(/\x1b/g, 'ESC')}"`);
    const tokens = Tokenizer.tokenize(text, mockContext);
    console.log('Resulting Tokens:');
    tokens.forEach((t, i) => {
        if (t.type === 'ansi') {
            console.log(`  ${i}: [ansi] "${t.content}" (Color: ${t.style?.color}, Bold: ${t.style?.fontWeight})`);
        } else if (t.type === 'entity') {
            const et = t as EntityToken;
            console.log(`  ${i}: [entity] "${et.content}" (ID: ${et.entityId}, Category: ${et.metadata.category})`);
        } else {
            console.log(`  ${i}: [${t.type}] "${(t as any).content || (t as any).text}"`);
        }
    });
}

// Test case matching MUME room item format
test('[ 5] a heavy sword is here.');
test('Ciltor is standing here.');
