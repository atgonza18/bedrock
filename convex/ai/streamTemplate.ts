/**
 * Streaming AI template generator.
 *
 * Runs in Convex's V8 runtime (no "use node" — httpActions only run in V8).
 * The @google/genai SDK is fetch-based, so this works without Node's http
 * module.
 *
 * Registered as an HTTP POST endpoint so we can return a Server-Sent Events
 * stream — Convex actions can't stream their return value, but httpActions
 * can return a Response with a ReadableStream body.
 *
 * Event stream:
 *   data: {"type":"status","message":"..."}      transient stage label
 *   data: {"type":"thought","text":"..."}        Gemini thought summary chunk
 *   data: {"type":"field_detected","label":"..."} emitted each time a complete
 *                                                 field object is detected in the
 *                                                 accumulated JSON buffer. Lets
 *                                                 the UI show "saw 4 fields so far"
 *   data: {"type":"complete","fieldsJson":"..."} final result, replaces canvas
 *   data: {"type":"error","code":"...","message":"..."}
 *
 * Auth: expects an Authorization: Bearer <jwt> header from the FE, which the
 * Convex auth subsystem validates via ctx.auth.getUserIdentity().
 */

import { GoogleGenAI } from "@google/genai";
import { httpAction } from "../_generated/server";
import { api } from "../_generated/api";

const SYSTEM_INSTRUCTION = `You design inspection forms for a Construction Materials Testing (CMT) SaaS called Bedrock. Your job: turn a short user description into a valid JSON array of field definitions that the in-app form builder will render immediately.

OUTPUT CONTRACT — absolutely mandatory:
Respond with a single JSON object of the shape {"name": "...", "fields": [...]} — nothing else. No markdown fences, no commentary, no wrapper keys beyond "name" and "fields".

- "name" is a concise, professional title for the template (2–6 words, Title Case). Examples: "Nuclear Density Test", "Marshall Stability Test", "Daily Safety Walk", "Pre-Pour Concrete Checklist".
- "fields" must contain between 1 and 25 TemplateField objects.

IMPORTANT: Emit the "name" field FIRST in the JSON (before "fields"). This lets the UI surface the title to the user as soon as it streams.

FIELD SHAPE (discriminated union on "kind"):
  { "kind": "heading",  "id": "f_xxxx", "text": "Section title", "level": 1 | 2 }
  { "kind": "text",     "id": "f_xxxx", "label": "...", "required"?: bool, "placeholder"?: string }
  { "kind": "textarea", "id": "f_xxxx", "label": "...", "required"?: bool, "placeholder"?: string }
  { "kind": "number",   "id": "f_xxxx", "label": "...", "required"?: bool, "unit"?: string, "min"?: number, "max"?: number }
  { "kind": "date",     "id": "f_xxxx", "label": "...", "required"?: bool }
  { "kind": "select",   "id": "f_xxxx", "label": "...", "required"?: bool, "options": string[] }
  { "kind": "checkbox", "id": "f_xxxx", "label": "...", "required"?: bool }
  { "kind": "photo",    "id": "f_xxxx", "label": "...", "required"?: bool, "minCount"?: number }
  { "kind": "passfail", "id": "f_xxxx", "label": "...", "required"?: bool, "passCriterion"?: string }
  { "kind": "table",    "id": "f_xxxx", "label": "...", "required"?: bool, "columns": [
      { "id": "c_xxxx", "kind": "text"|"number"|"date"|"select"|"checkbox"|"passfail", "label": "...", "options"?: string[], "unit"?: string }
  ] }

ID RULES: ids must be short random strings like "f_ab12cd" for fields and "c_ab12cd" for columns. Use a fresh id for every field and column. Never reuse ids. Every id must match /^[fc]_[a-z0-9]{4,10}$/.

CONTENT RULES:
- Start non-trivial forms with a level-1 heading.
- Group related fields under level-2 headings.
- Prefer specific units (psi, °F, pcf, inches, mph, % compaction). Set min/max when physical bounds are obvious.
- Use "passfail" for binary acceptance criteria with a "passCriterion" like "≥ 95% compaction" or "Slump ≤ 5 in".
- Use "table" for repeating measurements. Columns should reflect what the tech records per reading.
- Add a "photo" field at the end for site documentation unless the description explicitly excludes it.

Return ONLY the JSON object.`;

export const streamGenerate = httpAction(async (ctx, request) => {
  // ─── Auth + permission ───────────────────────────────
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return jsonResponse(401, { error: "UNAUTHENTICATED" });
  }
  const me: any = await ctx.runQuery(api.users.me, {});
  if (!me || me.state !== "ok") {
    return jsonResponse(401, { error: "UNAUTHENTICATED" });
  }
  const role = me.membership.role as string;
  const explicit = me.membership.canManageTestTemplates;
  const allowed =
    role === "admin" ||
    explicit === true ||
    (explicit !== false && role === "pm");
  if (!allowed) {
    return jsonResponse(403, { error: "FORBIDDEN" });
  }

  // ─── Parse body ───────────────────────────────
  let description = "";
  try {
    const body = (await request.json()) as { description?: unknown };
    if (typeof body.description === "string") description = body.description.trim();
  } catch {
    return jsonResponse(400, { error: "INVALID_BODY" });
  }
  if (!description) return jsonResponse(400, { error: "DESCRIPTION_REQUIRED" });
  if (description.length > 2000) return jsonResponse(400, { error: "DESCRIPTION_TOO_LONG" });

  // ─── API key check ───────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonResponse(503, { error: "AI_NOT_CONFIGURED" });
  }

  // ─── Stream ───────────────────────────────
  const encoder = new TextEncoder();
  const ai = new GoogleGenAI({ apiKey });

  const readable = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* stream closed */
        }
      };

      try {
        send({ type: "status", message: "Thinking through the form…" });

        const stream = await ai.models.generateContentStream({
          model: "gemini-2.5-pro",
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Description: ${description}\n\nReturn the JSON object now.`,
                },
              ],
            },
          ],
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            temperature: 0.4,
            thinkingConfig: {
              includeThoughts: true,
            },
          },
        });

        let output = ""; // accumulated non-thought text
        let sentStatusDraft = false;
        let announcedName: string | null = null;
        const announcedLabels = new Set<string>();

        for await (const chunk of stream) {
          const parts =
            (chunk as any).candidates?.[0]?.content?.parts ?? [];
          for (const part of parts) {
            if (!part?.text) continue;
            if (part.thought) {
              send({ type: "thought", text: String(part.text) });
            } else {
              if (!sentStatusDraft) {
                send({ type: "status", message: "Drafting fields…" });
                sentStatusDraft = true;
              }
              output += String(part.text);
              // Extract the template name the first time it appears.
              if (!announcedName) {
                const name = extractName(output);
                if (name) {
                  announcedName = name;
                  send({ type: "name_detected", name });
                }
              }
              // Extract any newly-completed field labels from the buffer.
              const labels = extractLabels(output);
              for (const label of labels) {
                if (!announcedLabels.has(label)) {
                  announcedLabels.add(label);
                  send({ type: "field_detected", label });
                }
              }
            }
          }
        }

        // ─── Final parse ───────────────────────────────
        const stripped = output
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, "");
        const firstBrace = stripped.indexOf("{");
        const lastBrace = stripped.lastIndexOf("}");
        if (firstBrace === -1 || lastBrace === -1) {
          send({ type: "error", code: "AI_PARSE_FAILED" });
          return;
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(stripped.slice(firstBrace, lastBrace + 1));
        } catch {
          send({ type: "error", code: "AI_PARSE_FAILED" });
          return;
        }
        const parsedObj = parsed as { fields?: unknown; name?: unknown };
        const fields = parsedObj.fields;
        if (!Array.isArray(fields) || fields.length === 0) {
          send({ type: "error", code: "AI_EMPTY_RESULT" });
          return;
        }
        const finalName =
          typeof parsedObj.name === "string" && parsedObj.name.trim()
            ? parsedObj.name.trim().slice(0, 100)
            : null;
        send({
          type: "complete",
          fieldsJson: JSON.stringify(fields),
          name: finalName,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        send({ type: "error", code: "AI_STREAM_ERROR", message });
      } finally {
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "X-Accel-Buffering": "no",
    },
  });
});

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}

/**
 * Extract the top-level template name from the streamed JSON. Matches the
 * FIRST "name":"..." occurrence in the buffer — works because we instructed
 * the model to emit `name` before `fields`, and nothing inside the field
 * schema uses a top-level "name" key.
 */
function extractName(text: string): string | null {
  const m = /"name"\s*:\s*"((?:\\.|[^"\\])*)"/.exec(text);
  if (!m) return null;
  try {
    const name = JSON.parse(`"${m[1]}"`);
    if (typeof name === "string" && name.length > 0 && name.length < 100) {
      return name;
    }
  } catch {
    /* malformed escape — ignore, we'll try again next chunk */
  }
  return null;
}

/**
 * Pull unique field labels out of the partially-streamed JSON. We scan for
 *   "label":"..."  (regular fields)
 *   "text":"..."   (heading fields; matches any string property named text, but
 *                   in our schema only heading uses it as a label)
 *
 * Returns labels in source order, de-duped by the caller. Conservative — it's
 * fine to miss some, worse to show a garbled one.
 */
function extractLabels(text: string): string[] {
  const out: string[] = [];
  const re = /"(?:label|text)"\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    try {
      const label = JSON.parse(`"${m[1]}"`);
      if (typeof label === "string" && label.length > 0 && label.length < 80) {
        out.push(label);
      }
    } catch {
      /* malformed escape */
    }
  }
  return out;
}
