"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { UserDetailsModal } from "../user/UserDetailsModal";
import { firstQuizQuestions, secondQuizQuestions } from "./quizData";
import type { ContactDetails, FeedbackReaction, LeadStatus, QuizStage } from "./types";
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
  const [leadId, setLeadId] = useState<number | null>(null);
  const [firstRoundScore, setFirstRoundScore] = useState(0);
  const [feedbackReaction, setFeedbackReaction] = useState<FeedbackReaction>("");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState<LeadStatus>("idle");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const resultsRef = useRef<HTMLDivElement | null>(null);
  const questionCardRef = useRef<HTMLElement | null>(null);

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

  useEffect(() => {
    if (submitted && currentQuestion === activeQuestions.length - 1) {
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [submitted, currentQuestion, activeQuestions.length]);

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

  async function handleSubmit() {
    setSubmitted(true);
    setQuizMessage("");

    if (quizStage === "second" && leadId) {
      try {
        await fetch("/api/quiz-score", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            leadId,
            overallCorrectAnswers: firstRoundScore + score,
            phone: contact.phone
          })
        });
      } catch {
        // Don't block the quiz flow if score syncing fails.
      }
    }
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
    setLeadId(null);
    setFirstRoundScore(0);
    setFeedbackReaction("");
    setFeedbackComment("");
    setFeedbackStatus("idle");
    setFeedbackMessage("");
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
      let payload: { message?: string; leadId?: number } = {};

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

      setLeadId(payload.leadId ?? null);
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
    setFirstRoundScore(score);
    setQuizStage("second");
    setAnswers({});
    setSubmitted(false);
    setCurrentQuestion(0);
    setQuizMessage("");
    closeUserDetailsModal();
    requestAnimationFrame(() => {
      questionCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function handleFeedbackSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!feedbackReaction) {
      setFeedbackStatus("error");
      setFeedbackMessage("Please choose like or dislike before submitting.");
      return;
    }

    setFeedbackStatus("submitting");
    setFeedbackMessage("");

    try {
      const response = await fetch("/api/quiz-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          leadId,
          reaction: feedbackReaction,
          comments: feedbackComment,
          phone: contact.phone
        })
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(payload.message || "Unable to save feedback right now.");
      }

      setFeedbackStatus("success");
      setFeedbackMessage(payload.message || "Feedback saved successfully.");
      setFeedbackComment("");
      setFeedbackReaction("");
    } catch (error) {
      setFeedbackStatus("error");
      setFeedbackMessage(
        error instanceof Error ? error.message : "Unable to save feedback right now."
      );
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Do You Know Your Constituency?</p>
        <h1>
          {quizStage === "first"
            ? "How Well Do You Know Mannargudi 167?"
            : "How Well Do You Know Mannargudi 167? Round 2"}
        </h1>
        <p className="hero-copy">
          {quizStage === "first"
            ? "A simple awareness quiz to help young voters learn more about their own constituency before they vote."
            : "This round has interesting questions on the 2021 result and the current candidate lineup."}
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
        <article className="question-card" ref={questionCardRef}>
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

          <div className="question-nav">
            <button
              type="button"
              className="primary-button"
              onClick={() => setCurrentQuestion((current) => Math.max(current - 1, 0))}
              disabled={currentQuestion === 0}
            >
              Previous
            </button>
            {quizStage === "first" && currentQuestion < activeQuestions.length - 1 && !submitted && (
              <p className="guess-note">Not sure? Take a guess or move to the next question.</p>
            )}
            {quizStage === "first" &&
              currentQuestion === activeQuestions.length - 1 &&
              !submitted &&
              !quizMessage && (
                <p className="guess-note">
                  You can submit from here even if some questions are unanswered.
                </p>
              )}
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

          {submitted && currentQuestion === activeQuestions.length - 1 && (
            <div
              className={["result-panel", quizStage === "first" ? "result-panel-first" : ""]
                .filter(Boolean)
                .join(" ")}
              ref={resultsRef}
            >
              {quizStage === "first" ? (
                <h3 className="score-inline">
                  Your Score : {score} / {activeQuestions.length}
                </h3>
              ) : (
                <>
                  <p className="score-label">Your Score</p>
                  <h3>
                    {score} / {activeQuestions.length}
                  </h3>
                </>
              )}

              {quizStage === "second" && (
                <>
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
                            <strong>
                              {selectedAnswer ? `Answered: ${selectedAnswer}` : "Not answered"}
                            </strong>
                            <small>Correct answer: {question.answer}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              <div className={quizStage === "first" ? "action-row action-row-center" : "action-row"}>
                {quizStage === "first" ? (
                  <button
                    type="button"
                    className="primary-button cta-candidates-button"
                    onClick={openUserDetailsModal}
                  >
                    Want to know the answers? Continue to the next-level quiz on candidates
                  </button>
                ) : null}
                {quizStage === "second" && (
                  <button type="button" className="secondary-button" onClick={handleReset}>
                    Reset
                  </button>
                )}
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

      {quizStage === "second" && (
        <section className="footer-card">
          <div>
            <p className="eyebrow">Quick Feedback</p>
            <h3>Hope you found the quiz interesting....</h3>
            <p className="data-note">
              Share a quick like or dislike and comment. Also, if you want to promote your
              business through apps and attract more customers, you can mention that in the
              comments too.
            </p>
          </div>

          <form className="feedback-form" onSubmit={handleFeedbackSubmit}>
            <div className="feedback-reactions" role="group" aria-label="Feedback reaction">
              <button
                type="button"
                className={["reaction-button", feedbackReaction === "like" ? "active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setFeedbackReaction("like");
                  setFeedbackStatus("idle");
                  setFeedbackMessage("");
                }}
              >
                {feedbackReaction === "like" ? "Liked" : "Like"}
              </button>
              <button
                type="button"
                className={["reaction-button", feedbackReaction === "dislike" ? "active" : ""]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => {
                  setFeedbackReaction("dislike");
                  setFeedbackStatus("idle");
                  setFeedbackMessage("");
                }}
              >
                {feedbackReaction === "dislike" ? "Disliked" : "Dislike"}
              </button>
            </div>

            <label className="feedback-label">
              Comments
              <textarea
                value={feedbackComment}
                onChange={(event) => {
                  setFeedbackComment(event.target.value);
                  setFeedbackStatus("idle");
                  setFeedbackMessage("");
                }}
                maxLength={500}
                placeholder="Share your feedback, or leave a note if you want help building apps to attract more customers."
                rows={4}
              />
            </label>

            {feedbackMessage && (
              <p
                className={[
                  "inline-note",
                  feedbackStatus === "error" ? "error-note" : "success-note"
                ].join(" ")}
              >
                {feedbackMessage}
              </p>
            )}

            <div className="action-row">
              <button
                type="submit"
                className="primary-button"
                disabled={feedbackStatus === "submitting"}
              >
                {feedbackStatus === "submitting" ? "Saving..." : "Send Feedback"}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
