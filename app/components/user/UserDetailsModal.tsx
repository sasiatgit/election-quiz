"use client";

import type { FormEvent } from "react";
import type { ContactDetails, LeadStatus, Question } from "../quiz/types";

type UserDetailsModalProps = {
  contact: ContactDetails;
  leadMessage: string;
  leadStatus: LeadStatus;
  open: boolean;
  reviewAnswers: Record<number, string>;
  reviewQuestions: Question[];
  onChange: (field: keyof ContactDetails, value: string) => void;
  onClose: () => void;
  onProceed: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>;
};

export function UserDetailsModal({
  contact,
  leadMessage,
  leadStatus,
  open,
  reviewAnswers,
  reviewQuestions,
  onChange,
  onClose,
  onProceed,
  onSubmit
}: UserDetailsModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="more-quiz-card modal-card" onClick={(event) => event.stopPropagation()}>
        {leadStatus !== "success" ? (
          <form className="lead-form" onSubmit={onSubmit}>
            <h3>Enter your details to see answers</h3>
            <label>
              Name
              <input
                type="text"
                value={contact.name}
                onChange={(event) => onChange("name", event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
            <label>
              Place
              <input
                type="text"
                value={contact.place}
                onChange={(event) => onChange("place", event.target.value)}
                placeholder="Your place"
                required
              />
            </label>
            <label>
              Phone Number
              <input
                type="tel"
                value={contact.phone}
                onChange={(event) => onChange("phone", event.target.value)}
                onInvalid={(event) =>
                  event.currentTarget.setCustomValidity("Please enter 10 digit mobile number")
                }
                onInput={(event) => event.currentTarget.setCustomValidity("")}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                pattern="[0-9]{10}"
                maxLength={10}
                required
              />
            </label>

            {leadMessage && <p className="inline-note error-note">{leadMessage}</p>}

            <div className="action-row">
              <button
                type="submit"
                className="primary-button"
                disabled={leadStatus === "submitting"}
              >
                {leadStatus === "submitting" ? "Saving..." : "Continue"}
              </button>
              <button type="button" className="secondary-button" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div className="review-panel">
            <h3>Last 10 Questions And Answers</h3>

            <div className="review-list">
              {reviewQuestions.map((question) => {
                return (
                  <article className="review-item" key={question.id}>
                    <span>Question {question.id}</span>
                    <strong>{question.prompt}</strong>
                    <p>
                      Answered:{" "}
                      <b>{reviewAnswers[question.id] ? reviewAnswers[question.id] : "Not answered"}</b>
                    </p>
                    <p>
                      Correct answer: <b>{question.answer}</b>
                    </p>
                  </article>
                );
              })}
            </div>

            <div className="action-row">
              <button
                type="button"
                className="primary-button cta-candidates-button"
                onClick={onProceed}
              >
                Try quiz about Mannargudi candidates
              </button>
              <button type="button" className="secondary-button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
