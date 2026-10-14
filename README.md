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

## Tech stack
React 18 · TypeScript · Vite · Tailwind CSS · Lucide icons

## Run locally
    npm install
    npm run dev

## Build
    npm run build

## Demo admin login
The admin password is `1234` (demo only).
