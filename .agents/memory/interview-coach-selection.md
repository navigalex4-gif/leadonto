---
name: Interview Ace interviewer auto-selection
description: How the mock-interview interviewer (coach) is chosen from the candidate's filters, and the B2B lock rule.
---

# Interview Ace — interviewer (coach) auto-selection

The interviewer shown on the Interview Ace setup screen is **auto-matched to the
interview TYPE** the candidate picks, via `recommendedCoachFor(type)` in
`lib/tutors.ts` (a type→coach-id map over `INTERVIEW_COACHES`, fallback `"raj"`).
The selected interview type (and any matching specific preferred role) is
authoritative: the interviewer is auto-matched to the domain and non-matching
cards are not selectable. The matched card gets a "Recommended" badge.

## Decisions
- **Type-driven, not experience-driven.** The coach is picked from the interview
  type only. Experience level already drives question difficulty/calibration and
  the scorecard; duration never affects the coach. **Why:** each coach is a domain
  specialist (HR, technical, sales/marketing, BFSI, freshers), so type is the
  signal that maps to "who should run this". Keep it predictable.
- **Re-match happens in the type dropdown's `onValueChange`** (calls
  `setCoach(recommendedCoachFor(v))`), NOT a `useEffect`. Setup must never reset
  the type-matched coach back to a landing-page default. **Why:** an old setup
  effect could replace the correct specialist after a candidate changed role,
  making the face/persona inconsistent with the interview.

## B2B lock — enforce at EVERY mutation point
A recruiter invite carries `b2bCoach` (query param); when present the interviewer
is **locked** to the recruiter's choice (`coachLocked = !!b2bParams.coach`). The
candidate must not be able to swap it.

**Lesson:** a "locked" flag must be checked at *every* place that writes the state
— here that is BOTH the interview-type dropdown handler AND the coach grid
buttons. For normal sessions, only the role-matched specialist can be selected.
For B2B sessions, the recruiter-selected coach remains locked. In both cases,
non-selectable cards are `disabled` + dimmed (`opacity-40 cursor-not-allowed`).

## Note
`profile.preferredInterviewer` (DB `preferred_interviewer`, default `"raj"`, no
user-facing setter) is no longer read for the default coach — the default is now
filter-driven. No schema change was made.
