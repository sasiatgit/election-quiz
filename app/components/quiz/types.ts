export type Question = {
  id: number;
  prompt: string;
  options: string[];
  answer: string;
  detail: string;
};

export type QuizStage = "first" | "second";

export type LeadStatus = "idle" | "submitting" | "success" | "error";

export type ContactDetails = {
  name: string;
  place: string;
  phone: string;
};
