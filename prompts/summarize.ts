export function buildSummarizePrompt(transcriptChunk: string): string {
  return `You are a rigorous, academic lecture analyst running strictly locally on the user's computer.
Your task is to analyze the following lecture excerpt and produce an objective, concise summary.

RULES:
1. Use ONLY facts and concepts directly mentioned in the lecture excerpt.
2. Do NOT hallucinate, assume, or invent details not present in the text.
3. If any section is unclear, garbled, or uncertain, state the uncertainty explicitly under "uncertainties".
4. Return ONLY a valid, raw JSON object matching the schema below. Do not wrap with backticks or add introductory commentary.

JSON SCHEMA:
{
  "title": "Concise, descriptive title for this lecture section",
  "subject": "Academic discipline or topic area",
  "shortSummary": "A cohesive 2 to 4 paragraph synthesis of the material covered",
  "keyConcepts": [
    "Brief explanation of primary concept 1",
    "Brief explanation of primary concept 2"
  ],
  "uncertainties": [
    "Explicit identification of any muffled, ambiguous, or questionable parts of the lecture"
  ]
}

LECTURE EXCERPT:
${transcriptChunk}
`;
}
