# IELTSHUB Project Log

## Setup Phase

- Created project folder: IELTSHUB
- Initialized Git repository
- Connected project to GitHub
- Created .gitignore (node_modules, .next, env)

## Environment Setup

- Installed Next.js
- Installed Tailwind + DaisyUI
- Installed Recharts
- Installed Heroicons
- Installed Firebase SDK

## Project Structure

Created folders:
- /app/admin
- /app/student
- /app/teacher
- /app/creator
- /app/login
- /lib/firebase
- /public/logos

## Firebase Setup

- Created Firebase project (IELTSLAB)
- Added web app
- Configured .env.local
- Connected Firebase to project

## Authentication System

- Enabled Firebase Auth (email/password)
- Created test users:
  - admin
  - student
  - teacher
  - creator

## Firestore Setup

- Created `users` collection
- Used UID as document ID
- Added role field for each user

## Security

- Updated Firestore rules:
  - Only authenticated users
  - Users can only read their own data

## Login System

- Built login page
- Connected Firebase Auth
- Fetch role from Firestore
- Redirect based on role

## UI

- Added DaisyUI login UI
- Added dark/light mode toggle

## Git Workflow

- Created main branch
- Created feature branch:
  - feature/student-dashboard
