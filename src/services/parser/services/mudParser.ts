import { ParseResult, ParserStep } from '../types';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'some', 'at', 'to', 'please', 'with', 'from', 'on',
  'ugly', 'fat', 'big', 'small', 'large', 'mean', 'angry', 'old', 'young',
  'tall', 'short', 'red', 'blue', 'green', 'black', 'white', 'long', 'short',
  'heavy', 'light', 'dark', 'bright', 'dirty', 'clean', 'strong', 'weak',
  'what', 'am', 'i', 'me', 'my', 'is', 'are', 'do', 'does', 'can', 'could', 'would', 'should',
  'how', 'many', 'much'
]);

const MUME_COMMANDS = new Set([
  'climb', 'follow', 'lock', 'rent', 'teach', 'comment', 'forage', 'map', 'reply', 'throw',
  'compare', 'forward', 'mark', 'report', 'time', 'complain', 'get', 'metamorph', 'rescue', 'tie',
  'consider', 'give', 'mend', 'reset', 'track', 'assist', 'cook', 'group', 'merge', 'return',
  'train', 'abandon', 'cover', 'hide', 'mix', 'reveal', 'trophy', 'account', 'crush', 'hang',
  'milk', 'ride', 'typo', 'achievements', 'cut', 'help', 'herblores', 'north', 'south', 'unlock',
  'acts', 'decapitate', 'hints', 'narrate', 'say', 'uncover', 'alias', 'disengage', 'history', 'news',
  'saddle', 'unkeep', 'ask', 'dictionary', 'hit', 'open', 'score', 'unload', 'backstab', 'dim',
  'hold', 'offer', 'scalp', 'unmark', 'bandage', 'dismount', 'inventory', 'order', 'scout', 'unsaddle',
  'bansite', 'dismantle', 'idea', 'put', 'sell', 'use', 'bash', 'drink', 'ignore', 'pick',
  'search', 'value', 'beep', 'draw', 'info', 'pour', 'shoot', 'view', 'blow', 'drag',
  'justice', 'poison', 'sheathe', 'west', 'board', 'drain', 'kill', 'practice', 'shout', 'wake',
  'bribe', 'drop', 'keep', 'pray', 'sip', 'watch', 'buy', 'east', 'kick', 'protect',
  'sit', 'wear', 'bug', 'eat', 'knock', 'pull', 'sleep', 'weather', 'build', 'edit',
  'look', 'pursue', 'smoke', 'who', 'burn', 'emote', 'label', 'quaff', 'sneak', 'where',
  'burrow', 'embed', 'lag', 'quests', 'snuff', 'whet', 'bury', 'empty', 'lead', 'qui',
  'stand', 'whisper', 'butcher', 'enter', 'learn', 'quit', 'stat', 'whois', 'cast', 'equipment',
  'leave', 'rest', 'steal', 'wield', 'call', 'escape', 'levels', 'read', 'suggest', 'write',
  'camp', 'exits', 'list', 'reborn', 'swim', 'yell', 'catchup', 'examine', 'light', 'recite',
  'tell', 'change', 'flee', 'link', 'recover', 'taste', 'charge', 'fill', 'listen', 'remove',
  'tail', 'chop', 'flush', 'load', 'take', 'close'
]);

const INTENT_MAP: Record<string, string> = {
  // Movement
  'go': 'move',
  'walk': 'move',
  'run': 'move',
  'travel': 'move',
  'north': 'n',
  'south': 's',
  'east': 'e',
  'west': 'w',
  'up': 'u',
  'down': 'd',
  // Combat
  'attack': 'kill',
  'hit': 'hit',
  'bash': 'bash',
  'kill': 'kill',
  'smash': 'kill',
  'slay': 'kill',
  'murder': 'kill',
  'fight': 'kill',
  'destroy': 'kill',
  'backstab': 'backstab',
  'kick': 'kick',
  // Interaction
  'get': 'get',
  'take': 'get',
  'grab': 'get',
  'pick': 'get',
  'snatch': 'get',
  'drop': 'drop',
  'put': 'put',
  'place': 'put',
  'stow': 'put',
  'give': 'give',
  'hand': 'give',
  // Equipment
  'wear': 'wear',
  'don': 'wear',
  'remove': 'remove',
  'doff': 'remove',
  'wield': 'wield',
  'draw': 'wield',
  'sheathe': 'sheathe',
  // Information
  'look': 'look',
  'examine': 'examine',
  'inspect': 'examine',
  'read': 'read',
  'search': 'search',
  'inventory': 'inventory',
  'equipment': 'equipment',
  'wearing': 'equipment',
  'score': 'score',
  // Utility
  'open': 'open',
  'close': 'close',
  'unlock': 'unlock',
  'lock': 'lock',
  'eat': 'eat',
  'consume': 'eat',
  'drink': 'drink',
  'quaff': 'drink',
  'sip': 'drink',
  'rest': 'rest',
  'sit': 'sit',
  'sleep': 'sleep',
  'wake': 'wake',
  'stand': 'stand',
};

const DIRECTION_MAP: Record<string, string> = {
  'north': 'n',
  'south': 's',
  'east': 'e',
  'west': 'w',
  'up': 'u',
  'down': 'd',
  'n': 'n',
  's': 's',
  'e': 'e',
  'w': 'w',
  'u': 'u',
  'd': 'd',
};

export class SemanticMUDParser {
  private steps: ParserStep[] = [];

  private addStep(name: string, input: string, output: string) {
    this.steps.push({ name, input, output });
  }

  public parse(input: string, dryRun: boolean = false): ParseResult {
    this.steps = [];
    const originalInput = input;
    
    // 1. Multi-Action Splitting
    let rawCommands = this.splitCommands(input);
    this.addStep('Splitting', input, rawCommands.join(' | '));

    const finalCommands: string[] = [];
    let totalConfidence = 0;

    for (const rawCmd of rawCommands) {
      const { output, confidence } = this.processSingleCommand(rawCmd);
      finalCommands.push(output);
      totalConfidence += confidence;
    }

    const avgConfidence = rawCommands.length > 0 ? totalConfidence / rawCommands.length : 0;

    return {
      originalInput,
      steps: this.steps,
      finalOutput: finalCommands,
      confidenceScore: Math.round(avgConfidence * 100) / 100,
    };
  }

  private splitCommands(input: string): string[] {
    // Split by "and", "then", ",", "."
    return input
      .split(/\band\b|\bthen\b|[,.]/gi)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  private processSingleCommand(input: string): { output: string; confidence: number } {
    let current = input.toLowerCase().replace(/[?!]/g, '');
    let confidence = 0.8; // Default base confidence

    // Check for socials/pass-through
    if (current.startsWith('say ') || current.startsWith('tell ') || current.startsWith("'") || current.startsWith('"')) {
      return { output: input, confidence: 1.0 };
    }

    // 2. Noise Filter
    const words = current.split(/\s+/);
    const filteredWords = words.filter(w => !STOP_WORDS.has(w));
    current = filteredWords.join(' ');
    this.addStep('Noise Filter', input, current);

    // 3. Intent Mapping & Target Extraction
    const cmdWords = current.split(/\s+/).filter(w => w.length > 0);
    if (cmdWords.length === 0) return { output: input, confidence: 0.1 };

    // Special case: if "equipment" or "inventory" is anywhere in the filtered words
    if (cmdWords.includes('equipment')) return { output: 'equipment', confidence: 0.95 };
    if (cmdWords.includes('inventory')) return { output: 'inventory', confidence: 0.95 };

    let verb = cmdWords[0];
    let remaining = cmdWords.slice(1);

    // Handle "pick up" -> "get"
    if (verb === 'pick' && remaining[0] === 'up') {
      verb = 'get';
      remaining = remaining.slice(1);
    }

    const mappedVerb = INTENT_MAP[verb] || verb;
    
    let finalCmd = '';
    
    // Handle Movement
    if (mappedVerb === 'move' || DIRECTION_MAP[verb]) {
      const dir = remaining[0] || verb;
      const canonicalDir = DIRECTION_MAP[dir];
      if (canonicalDir) {
        finalCmd = canonicalDir;
        confidence = 0.95;
      } else {
        finalCmd = mappedVerb + (remaining.length > 0 ? ' ' + remaining.join(' ') : '');
      }
    } 
    // Handle Combat/Interaction
    else {
      // Target Extraction
      let target = '';
      if (remaining.length > 0) {
        const inIndex = remaining.indexOf('in');
        
        if (inIndex !== -1) {
          // Handle "in" preposition (e.g., "look in bag", "get sword in bag")
          const beforeIn = remaining.slice(0, inIndex);
          const afterIn = remaining.slice(inIndex + 1);
          
          const processPart = (parts: string[]) => {
            if (parts.length === 0) return '';
            const first = parts[0];
            const ordinalMatch = first.match(/^(\d+)(st|nd|rd|th)$/i);
            if (ordinalMatch) {
              const num = ordinalMatch[1];
              const noun = parts[parts.length - 1];
              return noun !== first ? `${num}.${noun}` : `${num}.${noun}`;
            }
            return parts[parts.length - 1];
          };

          const object = processPart(beforeIn);
          const container = processPart(afterIn);

          if (object) {
            // MUME: "get sword in bag" -> "get sword bag"
            // But "look in bag" is special and requires the "in" keyword
            if (mappedVerb === 'look') {
              target = `in ${container}`;
            } else {
              target = `${object} ${container}`;
            }
          } else {
            target = `in ${container}`;
          }
        } else {
          // Standard target extraction (no "in")
          const firstArg = remaining[0];
          const ordinalMatch = firstArg.match(/^(\d+)(st|nd|rd|th)$/i);
          if (ordinalMatch) {
            const num = ordinalMatch[1];
            const nounParts = remaining.slice(1);
            const noun = nounParts.length > 0 ? nounParts[nounParts.length - 1] : '';
            target = noun ? `${num}.${noun}` : firstArg;
          } else {
            // No ordinal, take the last word as the primary noun
            target = remaining[remaining.length - 1];
          }
        }
      }

      finalCmd = mappedVerb + (target ? ' ' + target : '');
      
      if (INTENT_MAP[verb] || MUME_COMMANDS.has(verb)) {
        confidence = 0.9;
      } else {
        confidence = 0.5; // Unrecognized verb
      }
    }

    // 4. Validation & Fallback
    const isValid = this.validate(finalCmd);
    const verbInMume = MUME_COMMANDS.has(finalCmd.split(' ')[0]);
    
    if (!isValid || finalCmd.trim() === '' || (INTENT_MAP[verb] && remaining.length === 0 && !DIRECTION_MAP[verb] && !MUME_COMMANDS.has(mappedVerb))) {
      this.addStep('Validation', finalCmd, `FAILED - Falling back to: ${input}`);
      return { output: input, confidence: 0.2 };
    }

    this.addStep('Final Mapping', input, finalCmd);
    return { output: finalCmd, confidence };
  }

  private validate(output: string): boolean {
    const words = output.split(/\s+/);
    // Check for remaining stop words
    for (const word of words) {
      if (STOP_WORDS.has(word)) return false;
    }
    // Check for illegal characters (MUDs usually only like alphanumeric and basic punctuation)
    if (/[@#$%^&*]/.test(output)) return false;
    
    return true;
  }
}

export const mudParser = new SemanticMUDParser();
