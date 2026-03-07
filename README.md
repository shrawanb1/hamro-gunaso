# Hamro Gunaso 🇳🇵

Hamro Gunaso is a transparent community platform designed for Nepalese citizens to report civic problems and share actionable suggestions. Built with a focus on transparency and community engagement, it empowers voices that shape the nation.

## Features

- **Civic Reporting**: Post problems or suggestions related to your locality.
- **Anonymous Posting**: Option to hide your identity for safety and privacy.
- **Community Interaction**: Agree or disagree with posts and provide feedback through comments.
- **Admin Verification**: Official admin responses and pinned posts for high-priority issues.
- **Bilingual Support**: Full support for both English (EN) and Nepali (ने) languages.
- **Location Filtering**: Filter feed by Province and District.

## Tech Stack

- **Frontend**: Vanilla HTML5, CSS3, JavaScript.
- **Animations**: GSAP (GreenSock Animation Platform) for smooth UI transitions and preloader.
- **Backend/Database**: Supabase (PostgreSQL with Real-time capabilities).
- **Authentication**: Supabase Auth (Email/Password and Google OAuth).
- **Security**: Cloudflare Turnstile for bot protection.

## Deployment

### Deploy to Vercel

This project is optimized for [Vercel](https://vercel.com). To deploy:

1. Push this repository to your GitHub.
2. Go to the [Vercel Dashboard](https://vercel.com/dashboard).
3. Click **"Add New..."** -> **"Project"**.
4. Import this repository.
5. Vercel will automatically detect the static project and deploy it.

### Supabase Setup

To run this project, you need a Supabase project.
1. Create a project at [Supabase](https://supabase.com).
2. Configure your `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `app.js`.
3. Set up your database schema (Posts, Profiles, Comments, Votes, Reports).

---
Developed with ❤️ for Nepal.
