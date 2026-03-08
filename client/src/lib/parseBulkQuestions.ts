export interface ParsedQuestion {
  text: string;
  options: string[];
  correctAnswer: number;
}

// Expected format example:
//
// Q: What is 2 + 2?
// A) 3
// B) 4
// C) 5
// D) 6
// Answer: B
//
// (blank line between questions is optional but recommended)
//
export function parseBulkQuestions(raw: string): ParsedQuestion[] {
  if (!raw.trim()) return [];

  // Normalize line endings and trim trailing spaces
  const text = raw.replace(/\r\n/g, "\n").trim();

  // Split into blocks by blank lines or by lines starting with Q:
  const roughBlocks = text.split(/\n{2,}/).filter((b) => b.trim().length > 0);

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  roughBlocks.forEach((block, blockIndex) => {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    // Find question line (starts with Q: or Q.)
    const qLineIndex = lines.findIndex((l) => /^q[\.:]/i.test(l));
    if (qLineIndex === -1) {
      errors.push(`Block ${blockIndex + 1}: Missing question line starting with "Q:" or "Q."`);
      return;
    }

    const questionLine = lines[qLineIndex].replace(/^q[\.:]\s*/i, "");
    const optionLines = lines.filter((l) => /^[A-D][\)\.]/i.test(l));
    const answerLine = lines.find((l) => /^answer\s*:/i.test(l));

    if (!questionLine) {
      errors.push(`Block ${blockIndex + 1}: Question text is empty.`);
      return;
    }

    if (optionLines.length < 4) {
      errors.push(
        `Block ${blockIndex + 1}: Expected 4 options (A–D), found ${optionLines.length}.`
      );
      return;
    }

    if (!answerLine) {
      errors.push(`Block ${blockIndex + 1}: Missing "Answer: X" line.`);
      return;
    }

    const options = optionLines.slice(0, 4).map((line) =>
      line
        .replace(/^[A-D][\)\.]\s*/i, "")
        .trim()
    );

    const answerMatch = answerLine.match(/^answer\s*:\s*([A-D])/i);
    if (!answerMatch) {
      errors.push(`Block ${blockIndex + 1}: Could not parse "Answer: X".`);
      return;
    }

    const correctLetter = answerMatch[1].toUpperCase();
    const correctIndex = ["A", "B", "C", "D"].indexOf(correctLetter);

    if (correctIndex === -1) {
      errors.push(`Block ${blockIndex + 1}: Answer must be one of A, B, C, or D.`);
      return;
    }

    questions.push({
      text: questionLine,
      options,
      correctAnswer: correctIndex,
    });
  });

  if (errors.length) {
    const error = new Error(errors.join("\n"));
    (error as any).code = "BULK_PARSE_ERROR";
    throw error;
  }

  return questions;
}

