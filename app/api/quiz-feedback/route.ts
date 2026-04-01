import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import { normalizePhoneNumber, validatePhoneNumber } from "../../../lib/phoneValidation";

type QuizFeedbackPayload = {
  leadId?: number;
  reaction?: "like" | "dislike";
  comments?: string;
  phone?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuizFeedbackPayload;
    const leadId = Number.isFinite(body.leadId) ? Number(body.leadId) : null;
    const reaction = body.reaction;
    const comments = body.comments?.trim() || "";
    const phone = body.phone?.trim() ? normalizePhoneNumber(body.phone) : null;

    if (reaction !== "like" && reaction !== "dislike") {
      return NextResponse.json(
        { message: "Please choose like or dislike before submitting feedback." },
        { status: 400 }
      );
    }

    if (comments.length > 500) {
      return NextResponse.json(
        { message: "Comments should be 500 characters or less." },
        { status: 400 }
      );
    }

    if (phone) {
      const phoneValidationMessage = validatePhoneNumber(phone);

      if (phoneValidationMessage) {
        return NextResponse.json({ message: phoneValidationMessage }, { status: 400 });
      }
    }

    const pool = getPool();

    await pool.query(`
      ALTER TABLE quiz_leads
      ADD COLUMN IF NOT EXISTS like_dislike TEXT,
      ADD COLUMN IF NOT EXISTS comments TEXT
    `);

    const result = leadId
      ? await pool.query(
          `
            UPDATE quiz_leads
            SET like_dislike = $2, comments = $3
            WHERE id = $1
          `,
          [leadId, reaction, comments || null]
        )
      : await pool.query(
          `
            UPDATE quiz_leads
            SET like_dislike = $2, comments = $3
            WHERE id = (
              SELECT id
              FROM quiz_leads
              WHERE phone = $1
              ORDER BY created_at DESC
              LIMIT 1
            )
          `,
          [phone, reaction, comments || null]
        );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { message: "Unable to match this feedback to a saved user record." },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Thank you for your feedback!" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save feedback right now.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
