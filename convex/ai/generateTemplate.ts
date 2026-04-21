"use node";

/**
 * AI template generator — turns a one-line description into a ready-to-save
 * array of TemplateField objects for the custom test builder.
 *
 * Provider: Google Gemini via the @google/genai SDK. Configured with:
 *   • model = gemini-2.5-flash (fast, cheap, strong at JSON generation)
 *   • responseMimeType = "application/json" so the response is guaranteed
 *     valid JSON — Gemini's "JSON mode" rejects malformed output and retries
 *     server-side.
 *   • systemInstruction carries the full field-schema contract so we never
 *     rely on few-shot in the user turn.
 *
 * Why not a strict `responseSchema`? Our TemplateField is a deeply nested
 * discriminated union (kind + per-kind fields + recursive table columns).
 * Gemini's JSON-schema subset doesn't cleanly express discriminated unions
 * today; "JSON mode" + a precise system prompt gives us reliable output
 * without the schema-authoring overhead.
 *
 * Key check: if GEMINI_API_KEY isn't set, throw a clean error the UI surfaces.
 */

import { GoogleGenAI } from "@google/genai";
import { v, ConvexError } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

const SYSTEM_INSTRUCTION = `You design inspection forms for a Construction Materials Testing (CMT) SaaS called Bedrock. Your job: turn a short user description into a valid JSON array of field definitions that the in-app form builder will render immediately.

OUTPUT CONTRACT — absolutely mandatory:
Respond with a single JSON object of the shape {"fields": [...]} — nothing else. No markdown fences, no commentary, no wrapper keys beyond "fields". The array must contain between 1 and 25 TemplateField objects.

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
- Use "table" for repeating measurements (e.g. multiple density readings, multiple cylinder breaks). Columns should reflect what the tech records per reading.
- Add a "photo" field at the end for site documentation unless the description explicitly excludes it.

EXAMPLE — description: "quick slump + air content check on concrete pour with two photos required"
{"fields":[
  {"kind":"heading","id":"f_a12b34","text":"Concrete Placement","level":1},
  {"kind":"text","id":"f_b23c45","label":"Mix design #","required":true,"placeholder":"e.g. C-4000A"},
  {"kind":"number","id":"f_c34d56","label":"Slump","required":true,"unit":"in","min":0,"max":10},
  {"kind":"number","id":"f_d45e67","label":"Air content","required":true,"unit":"%","min":0,"max":12},
  {"kind":"number","id":"f_e56f78","label":"Concrete temp","unit":"°F"},
  {"kind":"passfail","id":"f_f67g89","label":"Slump within spec","passCriterion":"Slump ≤ 5 in"},
  {"kind":"photo","id":"f_g78h90","label":"Placement photos","required":true,"minCount":2}
]}

Return ONLY the JSON object.`;

export const generate = action({
  args: { description: v.string() },
  handler: async (ctx, { description }): Promise<{ fieldsJson: string }> => {
    // --- Permission check ---------------------------------------------------
    const me: any = await ctx.runQuery(api.users.me, {});
    if (!me || me.state !== "ok") {
      throw new ConvexError({ code: "UNAUTHENTICATED" });
    }
    const role = me.membership.role as string;
    const explicit = me.membership.canManageTestTemplates;
    const allowed =
      role === "admin" ||
      explicit === true ||
      (explicit !== false && role === "pm");
    if (!allowed) {
      throw new ConvexError({
        code: "FORBIDDEN",
        reason: "MISSING_PERMISSION",
        permission: "canManageTestTemplates",
      });
    }

    const trimmed = description.trim();
    if (!trimmed) throw new ConvexError({ code: "DESCRIPTION_REQUIRED" });
    if (trimmed.length > 2000) {
      throw new ConvexError({ code: "DESCRIPTION_TOO_LONG" });
    }

    // --- API key check ------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new ConvexError({
        code: "AI_NOT_CONFIGURED",
        message:
          "Set the GEMINI_API_KEY environment variable in your Convex deployment to enable AI template generation.",
      });
    }

    const ai = new GoogleGenAI({ apiKey });

    // --- Inference ----------------------------------------------------------
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Description: ${trimmed}\n\nReturn the JSON object now.`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        temperature: 0.4,
      },
    });

    // --- Parse --------------------------------------------------------------
    const text = (response.text ?? "").trim();
    if (!text) {
      throw new ConvexError({ code: "AI_EMPTY_RESULT" });
    }

    // JSON mode guarantees valid JSON, but we still defensively strip fences
    // and pluck the outermost object in case a future model version slips.
    const stripped = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const firstBrace = stripped.indexOf("{");
    const lastBrace = stripped.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1) {
      throw new ConvexError({ code: "AI_PARSE_FAILED", raw: text.slice(0, 500) });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stripped.slice(firstBrace, lastBrace + 1));
    } catch {
      throw new ConvexError({ code: "AI_PARSE_FAILED", raw: text.slice(0, 500) });
    }
    const fields = (parsed as { fields?: unknown }).fields;
    if (!Array.isArray(fields) || fields.length === 0) {
      throw new ConvexError({ code: "AI_EMPTY_RESULT" });
    }

    return { fieldsJson: JSON.stringify(fields) };
  },
});
