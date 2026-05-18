# OrgNote Agenda

Agenda extension for OrgNote providing task management, habit tracking, and focus sessions built on top of org-mode file semantics.

## Language

**Pomo Session**:
A countdown focus interval with a user-configured duration (default 25 min); ends by writing a CLOCK entry to the linked task's logbook.
_Avoid_: pomodoro timer, focus timer

**Stopwatch Session**:
An open-ended count-up focus interval; ends when the user stops it manually, writing a CLOCK entry with the actual elapsed time.
_Avoid_: stopwatch timer, free timer

**Focus Session**:
Either a Pomo Session or a Stopwatch Session. The general term when the distinction does not matter.
_Avoid_: timer session, pomo

**Active Session**:
A Focus Session that is currently running or was running when the app was closed; persisted in KV under `org-agenda:pomodoro:active`.
_Avoid_: current session, running session

**Focus Record**:
The historical log of completed Focus Sessions, derived from CLOCK entries across all agenda tasks (duration > 0).
_Avoid_: history, clock log

**Linked Task**:
The org-mode headline (TODO keyword required) that a Focus Session is associated with; its logbook receives the CLOCK entry on session completion.
_Avoid_: selected task, focus task, timer task

**Pomo Command**:
The single registered command (`org-agenda:start-pomodoro`) that starts a Focus Session for a given task; the canonical entry point invoked from context menu, completion menu, and Pomodoro buffer UI.
_Avoid_: start pomodoro action, pomodoro trigger

## Relationships

- A **Focus Session** must have exactly one **Linked Task**
- A **Focus Session** writes exactly one CLOCK entry to the **Linked Task**'s logbook on completion
- An **Active Session** is persisted in KV; at most one **Active Session** exists at a time
- The **Pomo Command** always presents a task completion menu before starting
- The **Pomo Command** is the only way to start a **Focus Session**
- The **Focus Record** aggregates all CLOCK entries with duration > 0 from all agenda files (including habit tasks)

## Flagged ambiguities

- "pomodoro" was used to mean both the buffer view and the session type — resolved: buffer = "Pomodoro Buffer", session type = "Pomo Session" or "Focus Session"
