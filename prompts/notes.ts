export function buildNotesPrompt(transcriptText: string): string {
  return `You are a university teaching assistant generating comprehensive, structured study notes from a lecture transcript.

CRITICAL INSTRUCTIONS:
1. Ground every point strictly in the provided lecture.
2. Structure the notes into logical main topics with clear explanations, examples, and terminology.
3. Identify uncertainty when audio or lecturer phrasing is ambiguous.
4. Extract important facts that matter for examinations.
5. Generate thoughtful study questions the student should be able to answer.
6. Return ONLY valid raw JSON matching the schema below. No markdown fences.

SCHEMA:
{
  "title": "Clear lecture title",
  "summary": "Detailed overview summary",
  "topics": [
    {
      "topicName": "Name of major topic",
      "explanation": "Clear explanation of the topic as presented in lecture",
      "examples": "Any examples, analogies, or experiments discussed",
      "terminology": "Key terms and equations introduced",
      "approximateTimestamp": 0.0
    }
  ],
  "keyConcepts": [
    "High-yield core concept explanation"
  ],
  "definitions": [
    {
      "term": "Scientific/academic term",
      "definition": "Precise definition given in the lecture"
    }
  ],
  "importantFacts": [
    "High-yield factual statement likely to appear on exams"
  ],
  "uncertainties": [
    "Potentially unclear: The lecturer appears to say X, but the audio/transcript is uncertain."
  ],
  "studyQuestions": [
    "Self-assessment question based on lecture content"
  ]
}

LECTURE TRANSCRIPT:
${transcriptText}
`;
}
