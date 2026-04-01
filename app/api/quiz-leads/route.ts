import { NextResponse } from "next/server";
import { getPool } from "../../../lib/db";
import { normalizePhoneNumber, validatePhoneNumber } from "../../../lib/phoneValidation";

type QuizLeadPayload = {
  name?: string;
  place?: string;
  phone?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as QuizLeadPayload;
    const name = body.name?.trim();
    const place = body.place?.trim();
    const phone = normalizePhoneNumber(body.phone?.trim() || "");

    if (!name || !place || !phone) {
      return NextResponse.json(
        { message: "Name, place, and phone number are all required." },
        { status: 400 }
      );
    }

    const phoneValidationMessage = validatePhoneNumber(phone);

    if (phoneValidationMessage) {
      return NextResponse.json({ message: phoneValidationMessage }, { status: 400 });
    }

    const pool = getPool();

    await pool.query(`
      CREATE TABLE IF NOT EXISTS quiz_leads (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        place TEXT NOT NULL,
        phone VARCHAR(10) NOT NULL,
        like_dislike TEXT,
        comments TEXT,
        overall_correct_answers INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      ALTER TABLE quiz_leads
      ADD COLUMN IF NOT EXISTS like_dislike TEXT,
      ADD COLUMN IF NOT EXISTS comments TEXT,
      ADD COLUMN IF NOT EXISTS overall_correct_answers INTEGER
    `);

    const result = await pool.query<{ id: number }>(
      `
        INSERT INTO quiz_leads (name, place, phone)
        VALUES ($1, $2, $3)
        RETURNING id
      `,
      [name, place, phone]
    );

    return NextResponse.json({
      message: "Details saved successfully. You can continue to the next quiz.",
      leadId: result.rows[0]?.id
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to connect to PostgreSQL right now.";

    return NextResponse.json({ message }, { status: 500 });
  }
}
