
/**
 * Utility functions for handling JSON
 */

/**
 * Tries to parse JSON that might be malformed (e.g. from LLM output).
 * Specifically handles:
 * - Unescaped newlines within strings
 * - Trailing commas
 * - Markdown code blocks wrapping the JSON
 */
export function parsePartialJson(input: string): any {
  let cleanInput = input.trim();

  // 1. Extract from Markdown code blocks if present
  const match = cleanInput.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (match) {
    cleanInput = match[1];
  } else {
    // Try to find the first '{' and last '}'
    const start = cleanInput.indexOf('{');
    const end = cleanInput.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleanInput = cleanInput.substring(start, end + 1);
    }
  }

  try {
    return JSON.parse(cleanInput);
  } catch (e) {
    // If simple parse fails, try to repair
    const repaired = repairJson(cleanInput);
    return JSON.parse(repaired);
  }
}

/**
 * Repairs common JSON errors found in LLM outputs
 */
function repairJson(jsonString: string): string {
  let repaired = jsonString;

  // 1. Fix unescaped newlines within strings
  // This is tricky with regex alone. We'll iterate.
  // A simple heuristic: if we are inside quotes, escape control characters.
  
  let inString = false;
  let escaped = false;
  let result = '';
  
  for (let i = 0; i < repaired.length; i++) {
    const char = repaired[i];
    
    if (char === '"' && !escaped) {
      inString = !inString;
      result += char;
    } else if (inString) {
      if (char === '\\') {
        escaped = !escaped;
        result += char;
      } else {
        escaped = false;
        // Check for control characters
        if (char === '\n') {
          result += '\\n';
        } else if (char === '\r') {
          // ignore CR
        } else if (char === '\t') {
          result += '\\t';
        } else {
          result += char;
        }
      }
    } else {
      // Outside string
      result += char;
    }
  }
  
  repaired = result;

  // 2. Remove trailing commas before closing braces/brackets
  repaired = repaired.replace(/,(\s*[}\]])/g, '$1');

  return repaired;
}
