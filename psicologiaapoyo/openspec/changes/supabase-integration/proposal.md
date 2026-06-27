# Phase 1: Proposal — Supabase Integration for PsicologiaApoyo

## Problem Statement

PsicologiaApoyo needs a backend to manage users, sessions, and resources for psychological support in Venezuela. Currently the app is a fresh Angular scaffold with no data persistence, no authentication, and no real-time capabilities.

## Proposed Solution

Integrate **Supabase** as a full backend:
- **Auth**: email/password registration and login for patients and psychologists
- **Database**: PostgreSQL with Row Level Security
- **Real-time**: WebSocket subscriptions for session notifications
- **Storage**: For resource attachments (future phase)

## Users

| Role | Description |
|------|-------------|
| **Patient** | Person seeking psychological support. Can register, book sessions, chat with psychologist, access resources. |
| **Psychologist** | Professional providing support. Can set availability, manage sessions, chat with patients, upload resources. |
| **Admin** | Platform administrator. Can manage all users, view analytics. (Future phase) |

## MVP Scope

1. Email/password auth (sign up, sign in, sign out)
2. Role-based profiles (patient/psychologist)
3. Session scheduling and management
4. Basic dashboard per role
5. Resource library (read-only for MVP)

## Out of Scope (v1)

- Real-time chat/messaging (deferred)
- Video sessions
- Payment integration
- Admin dashboard
