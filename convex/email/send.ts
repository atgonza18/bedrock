"use node";

import { Resend } from "resend";

// Switch to your verified domain when ready (e.g. "reports@buildingandearth.com").
// Resend sandbox only delivers to the account owner's email.
const FROM_ADDRESS = "onboarding@resend.dev";
const FROM_NAME = "Bedrock by Building & Earth Sciences";

type SendReportEmailArgs = {
  to: string;
  contactName: string;
  reportNumber: string;
  projectName: string;
  orgName: string;
  portalUrl: string;
  pdfBytes: Uint8Array;
};

export async function sendReportEmail(args: SendReportEmailArgs): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    to: args.to,
    subject: `Report ${args.reportNumber} — ${args.projectName}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="margin: 0 0 8px; font-size: 20px; color: #1a1a1a;">Report Delivered</h2>
        <p style="margin: 0 0 24px; color: #666; font-size: 14px;">
          Hi ${args.contactName},
        </p>
        <p style="margin: 0 0 16px; color: #333; font-size: 14px; line-height: 1.6;">
          Report <strong>${args.reportNumber}</strong> for <strong>${args.projectName}</strong> has been
          approved and is attached as a PDF. You can also view it online:
        </p>
        <a href="${args.portalUrl}" style="display: inline-block; background: #c89340; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          View Report Online
        </a>
        <p style="margin: 24px 0 0; color: #999; font-size: 12px;">
          This link expires in 90 days. The PDF is also attached to this email.
        </p>
        <hr style="margin: 32px 0 16px; border: none; border-top: 1px solid #eee;" />
        <p style="margin: 0; color: #999; font-size: 11px;">
          ${args.orgName} &middot; Powered by Bedrock
        </p>
      </div>
    `,
    attachments: [
      {
        filename: `${args.reportNumber.replace(/\s+/g, "_")}.pdf`,
        content: Buffer.from(args.pdfBytes).toString("base64"),
      },
    ],
  });

  if (error) {
    throw new Error(`Resend error: ${error.message}`);
  }

  return { id: data!.id };
}
