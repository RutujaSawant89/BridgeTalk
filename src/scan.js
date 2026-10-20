import { askAboutImage } from './api';

export const SCAN_MODES = [
  {
    id: 'medicine',
    icon: 'plus-square', // Feather
    emoji: '💊',
    label: 'Medicine',
    hint: 'Strip, bottle or prescription',
    instruction: `This is a medicine (strip, bottle, box, label or prescription).
- Say what the medicine is and what it is commonly used for, if the label makes that clear.
- Dose, timing and quantity: report them ONLY exactly as printed on the image. If no dose is printed, say clearly that the dose is not shown. NEVER guess, calculate or suggest a dose.
- Mention the expiry date if visible, and say if it looks expired.
- Put storage instructions, side-effect or allergy warnings and "keep away from children" notes in warnings.
- ALWAYS include in warnings a reminder to confirm with a doctor or pharmacist before taking it.`,
  },
  {
    id: 'bill',
    icon: 'file-text', // Feather
    emoji: '📄',
    label: 'Bill / Form',
    hint: 'Electricity bill, notice, application',
    instruction: `This is a bill, invoice, notice or form.
- State the total amount to pay and the due date / deadline, exactly as printed, if present.
- In what_to_do, give clear next steps (how and where to pay, which fields to fill, which documents to attach).
- In warnings, flag late fees, penalties or disconnection notices, and any signs of a scam (requests for OTP/PIN/passwords, urgent threats, unofficial payment links or phone numbers, spelling mistakes, too-good-to-be-true offers).`,
  },
  {
    id: 'sign',
    icon: 'map', // Feather
    emoji: '🪧',
    label: 'Sign / Menu',
    hint: 'Street sign, notice board, menu',
    instruction: `This is a sign, notice board, label or menu.
- Translate what it says and explain what it means for the reader.
- For a menu, list the dishes with a short description and price if shown, and note anything spicy, non-vegetarian or containing common allergens.
- Put any prohibitions, dangers or rules in warnings.`,
  },
  {
    id: 'anything',
    icon: 'search', // Feather
    emoji: '🔍',
    label: 'Anything',
    hint: 'Explain whatever is in the photo',
    instruction: `This can be anything. Read any text in the image and explain what it is and what it means for the reader.`,
  },
];

function buildPrompt(mode, language) {
  return `You help people understand photos of everyday documents and objects.
Write EVERYTHING in ${language}, in its native script, using very simple, everyday words a person with little schooling can understand. Short sentences. No jargon.

${mode.instruction}

General rules:
- Only state what you can actually see in the image. Never invent numbers, names, dates or amounts.
- If the image is too blurry, dark, cut off or has no readable content, set "readable" to false and use what_to_do to give simple tips for taking a better photo (more light, hold steady, fill the frame, avoid glare, keep text flat).
- read_aloud: a short, natural spoken version of the most important points (2-4 sentences).

Return exactly this JSON shape:
{
  "title": "short name of what this is",
  "summary": "1-2 sentence plain explanation",
  "key_points": ["..."],
  "what_to_do": ["..."],
  "warnings": ["..."],
  "read_aloud": "...",
  "readable": true
}`;
}

const toList = (v) =>
  (Array.isArray(v) ? v : v ? [v] : []).map((s) => String(s).trim()).filter(Boolean);

export async function explainImage(base64, modeId, language) {
  const mode = SCAN_MODES.find((m) => m.id === modeId) ?? SCAN_MODES[3];
  const data = await askAboutImage(base64, buildPrompt(mode, language));

  return {
    title: String(data.title ?? '').trim(),
    summary: String(data.summary ?? '').trim(),
    key_points: toList(data.key_points),
    what_to_do: toList(data.what_to_do),
    warnings: toList(data.warnings),
    read_aloud: String(data.read_aloud ?? data.summary ?? '').trim(),
    readable: data.readable !== false && data.readable !== 'false',
  };
}
