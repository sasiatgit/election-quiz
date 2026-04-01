"use client";

import { useMemo, useState } from "react";
import { UserDetailsModal } from "../user/UserDetailsModal";
import { firstQuizQuestions, secondQuizQuestions } from "./quizData";
import type { ContactDetails, LeadStatus, QuizStage } from "./types";
import { normalizePhoneNumber, validatePhoneNumber } from "../../../lib/phoneValidation";

const initialContact: ContactDetails = {
  name: "",
  place: "",
  phone: ""
};

export function QuizExperience() {
  const [quizStage, setQuizStage] = useState<QuizStage>("first");
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [showMoreQuizForm, setShowMoreQuizForm] = useState(false);
  const [quizMessage, setQuizMessage] = useState("");
  const [leadStatus, setLeadStatus] = useState<LeadStatus>("idle");
  const [leadMessage, setLeadMessage] = useState("");
  const [contact, setContact] = useState<ContactDetails>(initialContact);

  const activeQuestions = quizStage === "first" ? firstQuizQuestions : secondQuizQuestions;
  const activeQuestion = activeQuestions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const displayedQuestionCount =
    quizStage === "second" ? firstQuizQuestions.length + secondQuizQuestions.length : activeQuestions.length;
  const displayedAnsweredCount =
    quizStage === "second" ? firstQuizQuestions.length + answeredCount : answeredCount;
  const selected = answers[activeQuestion.id];
  const isCorrect = selected === activeQuestion.answer;

  const score = useMemo(() => {
    return activeQuestions.reduce((total, question) => {
      return total + (answers[question.id] === question.answer ? 1 : 0);
    }, 0);
  }, [activeQuestions, answers]);

  function openUserDetailsModal() {
    setShowMoreQuizForm(true);
    setLeadStatus("idle");
    setLeadMessage("");
  }

  function closeUserDetailsModal() {
    setShowMoreQuizForm(false);
    setLeadStatus("idle");
    setLeadMessage("");
  }

  function handleSelect(questionId: number, option: string) {
    setAnswers((current) => ({
      ...current,
      [questionId]: option
    }));
    setQuizMessage("");
  }

  function handleSubmit() {
    setSubmitted(true);
    setQuizMessage("");
  }

  function handleReset() {
    setQuizStage("first");
    setAnswers({});
    setSubmitted(false);
    setCurrentQuestion(0);
    setShowMoreQuizForm(false);
    setQuizMessage("");
    setLeadStatus("idle");
    setLeadMessage("");
    setContact(initialContact);
  }

  async function handleMoreQuizSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPhone = normalizePhoneNumber(contact.phone);
    const phoneValidationMessage = validatePhoneNumber(normalizedPhone);

    if (phoneValidationMessage) {
      setLeadStatus("error");
      setLeadMessage(phoneValidationMessage);
      return;
    }

    setLeadStatus("submitting");
    setLeadMessage("");

    try {
      const response = await fetch("/api/quiz-leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...contact,
          phone: normalizedPhone
        })
      });

      const contentType = response.headers.get("content-type") || "";
      let payload: { message?: string } = {};

      if (contentType.includes("application/json")) {
        payload = (await response.json()) as { message?: string };
      } else {
        const text = await response.text();

        if (text.includes("<!DOCTYPE") || text.includes("<html")) {
          throw new Error(
            "The save API is not responding yet. Please restart `npm run dev` once and try again."
          );
        }

        throw new Error(text || "Unable to save your details right now.");
      }

      if (!response.ok) {
        throw new Error(payload.message || "Unable to save your details right now.");
      }

      setLeadStatus("success");
      setLeadMessage(payload.message || "Your details were saved successfully.");
    } catch (error) {
      setLeadStatus("error");
      setLeadMessage(
        error instanceof Error ? error.message : "Unable to save your details right now."
      );
    }
  }

  function handleContactChange(field: keyof ContactDetails, value: string) {
    setContact((current) => ({
      ...current,
      [field]: field === "phone" ? normalizePhoneNumber(value) : value
    }));
  }

  function handleProceedNextQuiz() {
    setQuizStage("second");
    setAnswers({});
    setSubmitted(false);
    setCurrentQuestion(0);
    setQuizMessage("");
    closeUserDetailsModal();
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Tamil Nadu State Assembly Election Quiz</p>
        <h1>{quizStage === "first" ? "Mannargudi 167 Quiz" : "Mannargudi 167 Quiz Round 2"}</h1>
        <p className="hero-copy">
          {quizStage === "first"
            ? "A focused single-page quiz for your own constituency. This first version covers voter strength, booths, panchayats, villages, and municipal wards."
            : "Round 2 focuses on the 2021 result and the currently public 2026 candidate lineup for Mannargudi constituency 167."}
        </p>

        <div className="hero-grid">
          <div className="hero-stat">
            <span>Constituency</span>
            <strong>Mannargudi 167</strong>
          </div>
          <div className="hero-stat">
            <span>Questions</span>
            <strong>{displayedQuestionCount}</strong>
          </div>
          <div className="hero-stat">
            <span>Answered</span>
            <strong>
              {displayedAnsweredCount}/{displayedQuestionCount}
            </strong>
          </div>
        </div>
      </section>

      <section className="quiz-card">
        <article className="question-card">
          <div className="question-topline">
            <span>
              Question {activeQuestion.id} of {activeQuestions.length}
            </span>
            {submitted && (
              <span className={isCorrect ? "pill success" : "pill danger"}>
                {isCorrect ? "Correct" : "Check answer"}
              </span>
            )}
          </div>

          <div className="progress-track" aria-hidden="true">
            <span
              className="progress-bar"
              style={{
                width: `${((currentQuestion + 1) / activeQuestions.length) * 100}%`
              }}
            />
          </div>

          <h2>{activeQuestion.prompt}</h2>

          <div className="options-grid">
            {activeQuestion.options.map((option) => {
              const isPicked = selected === option;
              const shouldHighlightCorrect = submitted && option === activeQuestion.answer;
              const shouldHighlightWrong = submitted && isPicked && option !== activeQuestion.answer;

              return (
                <button
                  key={option}
                  type="button"
                  className={[
                    "option-button",
                    isPicked ? "selected" : "",
                    shouldHighlightCorrect ? "correct" : "",
                    shouldHighlightWrong ? "wrong" : ""
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleSelect(activeQuestion.id, option)}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {submitted && <p className="answer-detail">{activeQuestion.detail}</p>}

          <div className="question-nav">
            <button
              type="button"
              className="secondary-button"
              onClick={() => setCurrentQuestion((current) => Math.max(current - 1, 0))}
              disabled={currentQuestion === 0}
            >
              Previous
            </button>
            {currentQuestion < activeQuestions.length - 1 ? (
              <button
                type="button"
                className="primary-button"
                onClick={() =>
                  setCurrentQuestion((current) => Math.min(current + 1, activeQuestions.length - 1))
                }
              >
                Next
              </button>
            ) : (
              <button type="button" className="primary-button" onClick={handleSubmit}>
                Submit Quiz
              </button>
            )}
          </div>

          {quizMessage && <p className="inline-note error-note">{quizMessage}</p>}

          {currentQuestion === activeQuestions.length - 1 && !submitted && !quizMessage && (
            <p className="inline-note">
              You can submit from here even if some questions are unanswered.
            </p>
          )}

          {submitted && currentQuestion === activeQuestions.length - 1 && (
            <div className="result-panel">
              <p className="score-label">Your Score</p>
              <h3>
                {score} / {activeQuestions.length}
              </h3>

              <div className="answers-list">
                {activeQuestions.map((question) => {
                  const selectedAnswer = answers[question.id];
                  const answerState = !selectedAnswer
                    ? "empty-row"
                    : selectedAnswer === question.answer
                      ? "correct-row"
                      : "wrong-row";

                  return (
                    <div className={["answer-row", answerState].join(" ")} key={question.id}>
                      <span>Q{question.id}</span>
                      <div className="answer-copy">
                        <strong>Answered: {selectedAnswer || "Not answered"}</strong>
                        <small>Correct answer: {question.answer}</small>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="action-row">
                {quizStage === "first" ? (
                  <button
                    type="button"
                    className="primary-button"
                    onClick={openUserDetailsModal}
                  >
                    For answers and more quiz
                  </button>
                ) : (
                  <p className="quiz-finale-message">
                    Hope this helps you get some details on your constituency. Don&apos;t forget
                    to cast your vote on April 23. Happy voting.
                  </p>
                )}
                <button type="button" className="secondary-button" onClick={handleReset}>
                  Reset
                </button>
              </div>
            </div>
          )}
        </article>
      </section>

      <UserDetailsModal
        contact={contact}
        leadMessage={leadMessage}
        leadStatus={leadStatus}
        open={showMoreQuizForm}
        reviewAnswers={answers}
        reviewQuestions={firstQuizQuestions}
        onChange={handleContactChange}
        onClose={closeUserDetailsModal}
        onProceed={handleProceedNextQuiz}
        onSubmit={handleMoreQuizSubmit}
      />
    </main>
  );
}
