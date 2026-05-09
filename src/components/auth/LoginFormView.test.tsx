// Removed node:assert/strict - use vitest expect instead
import assert from 'node:assert';
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LoginFormView } from "@/components/auth/LoginFormView";

function renderView(props?: Partial<React.ComponentProps<typeof LoginFormView>>) {
  return renderToStaticMarkup(
    <LoginFormView
      mode="sign-in"
      email=""
      password=""
      isPending={false}
      error={null}
      success={null}
      oauthError={null}
      onEmailChange={() => {}}
      onPasswordChange={() => {}}
      onGoogleSignIn={() => {}}
      onModeChange={() => {}}
      onSubmit={() => {}}
      {...props}
    />,
  );
}

describe("LoginFormView renders the Google sign-in button", () => {
  const markup = renderView();

  assert.match(markup, /Continue with Google/);
});

describe("LoginFormView renders OAuth error copy when provided", () => {
  const markup = renderView({
    oauthError: "Google sign-in was not completed. Please try again.",
  });

  assert.match(markup, /Google sign-in was not completed\. Please try again\./);
});

describe("LoginFormView keeps sign-up email and password copy visible for create-account mode", () => {
  const markup = renderView({
    mode: "sign-up",
  });

  assert.match(markup, /Create Account/);
  assert.match(markup, /Create a Supabase Auth account for this workspace if you do not have one yet\./);
  assert.match(markup, /Email/);
  assert.match(markup, /Password/);
});
