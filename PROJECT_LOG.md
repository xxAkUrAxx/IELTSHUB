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

## Creator Dashboard Work - 2026-04-24

- Restored Creator Dashboard sidebar navigation for:
  - Mock Exams
  - Practice Activity
- Added expandable/collapsible submenu behavior with one open section at a time
- Added section-based main content header with custom Creator `Create New` button styling
- Kept Creator auth/role protection while removing old Firestore-driven card/test dashboard logic

- Built Writing Test creator flow in Creator Dashboard
- Added full-page in-dashboard Writing test editor instead of modal overlay
- Added Task 1 editor with:
  - fixed IELTS instructions
  - editable task prompt
  - image upload
  - image preview
- Added Task 2 editor with:
  - fixed IELTS instructions
  - editable task prompt
- Added difficulty selector color logic:
  - Easy = green
  - Medium = yellow
  - Hard = red

- Connected Writing test save flow to Firebase
- Saved Writing tests to grouped Firestore collection:
  - `writingTests`
- Uploaded Task 1 images to Firebase Storage using test-linked identifiers
- Added Writing test cards in Creator Dashboard
- Added:
  - create test
  - edit test
  - delete test
- Added delete confirmation prompt
- Added temporary delete success message with auto-dismiss

- Refactored shared test conventions into:
  - `lib/tests/test-conventions.js`
- Extracted Writing test persistence logic into:
  - `lib/tests/writing-tests.js`
- Switched image uploads to resumable Firebase Storage uploads with progress/status handling
