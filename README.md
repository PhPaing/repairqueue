# Repair Queue

A condo maintenance request app. Residents report problems (air con, door lock,
water pipe, electrical, plumbing, other) and see where they are in the queue.
Admins log in to assign technicians and update ticket status.

**Live demo:** https://repairqueue.netlify.app/

## Features
- Resident view with a live queue position for each ticket
- Repair request form with room and issue type
- Admin panel for assigning technicians and updating status
- English / Thai language toggle
- Data saved in the browser's localStorage

## Resident permission model
A ticket is **assigned** when `status === 'assigned' || technicianName != null`.

| | Before assigned | After assigned |
|---|---|---|
| Buttons | Edit, Cancel Queue | Add Note, Contact Juristic to Cancel |
| Resident can | edit title, details, photos, add note; cancel with required reason | add timestamped notes only |
| Locked | issue type, date created, priority, queue order | everything except notes |

- Cancel Queue deletes the entry, renumbers the queue and logs the reason for juristic (`/admin`).
- Contact Juristic opens LINE (or phone) with a prefilled message and never cancels directly.
- Set `JURISTIC_LINE_OA_ID` / `JURISTIC_PHONE` in `src/lib/constants.ts`.
- Admin (`/#admin`) can drag-drop reorder (arrows on mobile), and use **Edit core** to change issue type, priority and scheduled date.
  Changing the date requires a "Reason for change". Every core change is written to the ticket's audit log
  ("Changed by Admin - Reason - timestamp - Requested via resident note"), visible to the resident and admin.
- Residents can only *request* a date change by adding a note.
- Rules are enforced in `AppContext` (`updateTicketDetails`, `addNote`, `cancelQueue`), not only in the UI.

## Date-based queue, duplicate block, dual-confirm complete
- **Q is per repair date.** The resident picks a repair date when booking; `Q1, Q2...` count only tickets for that date.
  `ticketId` (`DDMM-ROOM-SEQ`, e.g. `1810-1201-1`) is permanent. `displayQ` is the booking order for that date, and
  `queueOrder` is the dynamic position inside that date (admin reorder / urgent).
- **Admin `/#admin`** shows one date's queue at a time (date chips + date picker). Reorder never crosses dates;
  moving a ticket to another date needs a reason and is audit-logged (ticketId unchanged, Q recalculated on both dates).
- **Duplicate block:** one active ticket per room per issue type (Pending / Assigned / In Progress / Waiting Confirm).
- **Dual confirm (app is the source of truth, LINE only notifies):**
  1. Juristic in `/admin` taps **Mark as Fixed** -> needs a fixed photo + the checkbox **Simulate LINE push to resident**
     -> status *Waiting Resident Confirm*, LINE notification 1 is logged and previewed, toast "LINE simulated".
  2. The resident sees a banner "LINE notification sent at ..." and a full-screen card: fixed photo, technician, time and two
     big buttons. **Yes, Fixed** -> Completed + thank-you + LINE notification 2 to juristic (the room may book that issue type
     again). **No, Still Broken** needs a note **and** a photo -> back to In Progress + LINE notification 3 to juristic.
  3. There is no direct Complete button. Every step is written to the ticket audit log (status, technician, edits, LINE sends).
- **LINE (demo mode):** `LINE_CHANNEL_ACCESS_TOKEN` in `src/lib/constants.ts` is empty, so every push is simulated: it is saved as
  `lineLog {sent: true, sentAt, type, simulated: true}` on the ticket and shown with an amber **Simulated** badge.
  Message texts live in `src/lib/line.ts`. A real token is a secret and must be used from a server function (e.g. a Netlify
  function), not from this browser bundle - `pushLine()` in `src/lib/line.ts` is the place to call it.
- `/admin` and `/#admin` both open the admin panel (the LINE messages link to `/admin`).
- **Urgent** priority requires a reason and shows a red banner with that reason.

## Tech stack
React 18 · TypeScript · Vite · Tailwind CSS · Lucide icons

## Run locally
    npm install
    npm run dev

## Build
    npm run build

## Demo admin login
The admin password is `1234` (demo only).
