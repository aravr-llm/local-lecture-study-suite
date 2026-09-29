export function buildFlashcardsPrompt(transcriptText: string): string {
  return `Generate rigorous, high-yield study flashcards based on this lecture.

CRITICAL GUIDELINES:
1. Avoid meaningless or excessively obvious cards (e.g. "What subject was discussed? Physics.").
2. Focus on conceptual understanding, mechanisms, relationships, and applications (e.g. "What relationship does Newton's Second Law describe? It relates force, mass, and acceleration through F = ma.").
3. Support diverse card types:
   - "definition"
   - "question_answer"
   - "concept_explanation"
   - "compare_contrast"
   - "example_based"
   - "application_based"
4. Assign appropriate difficulty: "easy", "medium", or "hard".
5. Ground questions strictly in the lecture text.
6. Return ONLY a valid JSON array of flashcard objects.

SCHEMA:
[
  {
    "question": "Clear, direct test question or prompt",
    "answer": "Accurate, concise explanation or solution",
    "topic": "Specific lecture topic this card tests",
    "difficulty": "easy" | "medium" | "hard",
    "cardType": "definition" | "question_answer" | "concept_explanation" | "compare_contrast" | "example_based" | "application_based",
    "timestamp": 0.0
  }
]

LECTURE:
${transcriptText}
`;
}
