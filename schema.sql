export type Evaluation = {
  score: number;
  flags: string[];
  missing: string[];
  strengths: string[];
};

const REQUIRED_SECTIONS = ['KERNEL', 'CONSTRAINTS', 'MECHANISM', 'EPISTEMIC STATUS'];
const ANTI_PATTERNS = [
  /\bgreat question\b/i,
  /\bcertainly\b/i,
  /\bin conclusion\b/i,
  /\bi hope this helps\b/i,
  /\bit depends\b(?![\s\S]{0,120}\bdepends on\b)/i,
  /as an ai language model/i
];

export function evaluateResponse(text: string): Evaluation {
  const flags: string[] = [];
  const missing: string[] = [];
  const strengths: string[] = [];

  for (const section of REQUIRED_SECTIONS) {
    if (!text.includes(section)) missing.push(section);
  }

  for (const pattern of ANTI_PATTERNS) {
    if (pattern.test(text)) flags.push(`Anti-pattern detected: ${pattern.source}`);
  }

  if (/->/.test(text)) strengths.push('Mechanism chain present');
  if (/Known:|Believed:|Suspected:|Unknown:/.test(text)) strengths.push('Epistemic labels present');
  if (/```|┌|─|→|<-|\|/.test(text)) strengths.push('Visual/structural scaffold likely present');

  const score = Math.max(
    0,
    Math.min(100, 100 - missing.length * 15 - flags.length * 12 + Math.min(strengths.length * 3, 9))
  );

  return { score, flags, missing, strengths };
}
