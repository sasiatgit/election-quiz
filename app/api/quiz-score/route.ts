import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";

type QuizScorePayload = {
  leadId?: number;
  overallCorrectAnswers?: number;
  phone?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuizScorePayload;
    const leadId = Number.isFinite(body.leadId) ? Number(body.leadId) : null;
    const overallCorrectAnswers = Number.isFinite(body.overallCorrectAnswers)
      ? Number(body.overallCorrectAnswers)
      : null;
    const phone = body.phone?.trim() || null;

    if ((!leadId && !phone) || overallCorrectAnswers === null) {
      return NextResponse.json(
        { message: "Lead id or phone, and overall correct answers are required." },
        { status: 400 }
      );
    }

    const pool = getPool();

    await pool.query(`
      ALTER TABLE quiz_leads
      ADD COLUMN IF NOT EXISTS overall_correct_answers INTEGER
    `);

    const result = leadId
      ? await pool.query(
          `
            UPDATE quiz_leads
            SET overall_correct_answers = $2
            WHERE id = $1
          `,
          [leadId, overallCorrectAnswers]
        )
      : await pool.query(
          `
            UPDATE quiz_leads
            SET overall_correct_answers = $2
            WHERE id = (
              SELECT id
              FROM quiz_leads
              WHERE phone = $1
              ORDER BY created_at DESC
              LIMIT 1
            )
          `,
          [phone, overallCorrectAnswers]
        );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { message: "Unable to match this score to a saved user record." },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Overall score saved successfully." });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to save overall score right now.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
