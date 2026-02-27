export interface ParserStep {
  name: string;
  input: string;
  output: string;
}

export interface ParseResult {
  originalInput: string;
  steps: ParserStep[];
  finalOutput: string[];
  confidenceScore: number;
}

export interface CommandMapping {
  synonyms: string[];
  canonical: string;
}
