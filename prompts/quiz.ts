export function buildQuizPrompt(transcriptText: string): string {
  return `Generate an examination-quality practice quiz based exclusively on the provided lecture transcript.

REQUIREMENTS:
1. Ground every question strictly in the lecture text.
2. Include a balanced mix of question types:
   - "multiple_choice" (must provide exactly 4 plausible options)
   - "true_false" (must provide exactly ["True", "False"])
   - "short_answer" (must provide a single clear model answer with key grading keywords)
3. For multiple choice and true/false, ensure the options array contains the correct answer.
4. Provide a thorough "explanation" elucidating why the correct answer is right and why alternatives are wrong.
5. Return ONLY a valid JSON array of quiz question objects.

SCHEMA:
[
  {
    "question": "Clear problem or question statement",
    "questionType": "multiple_choice" | "true_false" | "short_answer",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": "Exact matching string of the correct option",
    "explanation": "Detailed explanation referring to lecture concepts",
    "difficulty": "easy" | "medium" | "hard",
    "topic": "Topic tested",
    "timestamp": 0.0
  }
]

LECTURE:
${transcriptText}
`;
}
