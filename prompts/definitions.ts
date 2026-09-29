export function buildDefinitionsPrompt(transcriptText: string): string {
  return `Extract all key terms, jargon, symbols, and explicit definitions introduced in this lecture.

RULES:
1. Extract only terms defined or clearly contextualized in the lecture.
2. Formulate concise, accurate definitions.
3. Return ONLY a valid JSON array of objects.

SCHEMA:
[
  {
    "term": "Term or Symbol",
    "definition": "Definition or mathematical representation",
    "context": "How it was used in the lecture"
  }
]

LECTURE:
${transcriptText}
`;
}
