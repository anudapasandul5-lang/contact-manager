This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Supabase Setup

Create a Supabase project for this app, then add the local environment values in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=your-postgres-connection-string
```

Enable the `Email` provider in Supabase Auth if you want to keep email and password sign-in available.

## Google Sign-In Setup

This app supports Google login through Supabase Auth. Google sign-in is an additional login option and does not replace the existing email/password flow.

### 1. Create a Google OAuth client

In Google Cloud:

1. Open `APIs & Services` -> `Credentials`.
2. Create an `OAuth client ID` for `Web application`.
3. Add this authorized redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Copy the generated client ID and client secret.

### 2. Configure the Google provider in Supabase

In Supabase:

1. Go to `Authentication` -> `Providers` -> `Google`.
2. Enable Google sign-in.
3. Paste your Google `Client ID` into `Client IDs`.
4. Paste your Google `Client Secret` into `Client Secret (for OAuth)`.
5. Leave `Skip nonce checks` off unless you have a platform-specific reason to change it.
6. Save the provider settings.

The `Callback URL (for OAuth)` shown in Supabase should match the Google redirect URI above.

### 3. Configure Supabase redirect URLs for this app

In `Authentication` -> `URL Configuration`, make sure Supabase allows this app to receive the post-auth redirect:

- Local development: `http://localhost:3000/api/auth/google/callback`
- Production: `https://<your-app-domain>/api/auth/google/callback`

Set your local `Site URL` to `http://localhost:3000` during development, and set the production site URL when you deploy.

### 4. Understand the callback flow

The Google redirect URI and the app callback URL are different on purpose:

- Google redirects back to Supabase at `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Supabase then redirects back into this app at `/api/auth/google/callback`

That app callback exchanges the OAuth code for a session and stores the app session in HTTP-only cookies.

### 5. Security notes

- Google users are created automatically by Supabase the first time they sign in.
- The app still uses server-side session cookies after login, so protected data is not gated only by client state.
- The existing owner-based Row Level Security policies continue to isolate each user's data by `auth.uid()`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
