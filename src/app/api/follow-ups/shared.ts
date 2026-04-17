export const FOLLOW_UP_DUPLICATE_MESSAGE = "An open follow-up already exists for this contact.";

type ErrorLike =
  | string
  | Error
  | {
      code?: string;
      message?: string;
    }
  | null
  | undefined;

function getMessage(error: ErrorLike) {
  if (!error) {
    return "";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return error.message ?? "";
}

export function isFollowUpConflictError(error: ErrorLike) {
  if (typeof error === "object" && error && "code" in error && error.code === "23505") {
    return true;
  }

  const message = getMessage(error);
  return (
    message.includes("follow_ups_one_open_per_contact_idx") ||
    message.toLowerCase().includes("duplicate key")
  );
}

export function normalizeFollowUpError(error: ErrorLike) {
  const message = getMessage(error);

  if (isFollowUpConflictError(error)) {
    return FOLLOW_UP_DUPLICATE_MESSAGE;
  }

  if (message.includes("Could not find the table") || message.includes("follow_ups")) {
    return "Follow-up storage is not set up yet. Run setup-database.sql in Supabase, then try again.";
  }

  return message;
}
