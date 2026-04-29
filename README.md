# Contact Manager

Contact Manager is a private Next.js app for mapping people, companies, vendors, projects, relationships, follow-ups, and profile identity in a visual network.

## Stack

- Next.js App Router
- React 19
- TypeScript
- Supabase Auth, Postgres, Row Level Security, and Storage
- Drizzle migrations
- React Flow for the mind map
- Tailwind CSS and local UI components

## Local Setup

Create `contact-manager/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=your-postgres-connection-string
```

Install dependencies and run the app:

```bash
npm install
npm run dev
```

The app redirects `/` to `/mind-map`. Protected pages require a valid app session.

## Database

Migrations live in `drizzle/migrations`. Apply them to Supabase before using the app:

```bash
npx drizzle-kit push
```

Important app tables are owner-scoped with Supabase RLS. Profile photos use the `network-media` Supabase Storage bucket and `user_profiles.avatar_path`.

## Auth

The app supports email/password and Google sign-in. For Google OAuth:

1. Create a Google OAuth client for a web application.
2. Add this Google redirect URI:
   `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Enable the Google provider in Supabase Auth.
4. Allow these Supabase redirect URLs:
   - Local: `http://localhost:3000/api/auth/google/callback`
   - Production: `https://<your-app-domain>/api/auth/google/callback`

The app callback exchanges the OAuth code for a Supabase session and stores HTTP-only session cookies.

## Useful Commands

```bash
npm run lint
npm run build
```

One-off imports, logs, generated build output, and old planning docs are intentionally kept out of the active app tree.
