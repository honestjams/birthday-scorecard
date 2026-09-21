# The Bureau of Birthday Affairs

A party web app: photo bingo, a go-kart lap time leaderboard, and a random
knockout draw. Guests sign in with their mobile number and a name — no
password, no verification code — and everything they submit stays attached to
that number on whatever phone they pick up.

Mobile first. Built for one day, designed so the photos survive it.

---

## What it does

**Photo bingo** (`/bingo`) — a 5×5 card of challenges. Tap a square, take or
choose a photo, and it uploads with a thumbnail and a stamp. Completed rows,
columns and diagonals are highlighted. One photo per guest per square;
re-uploading replaces the old one and deletes it from storage.

**Lap times** (`/karts`) — guests declare their best lap in any sane format
(`52.418`, `1:02.418`, `1.02.418`). The board shows each person's personal
best, fastest first, with the gap to the leader. Updates live.

**The draw** (`/draw`) — the host picks entrants and the server shuffles them
into a single-elimination bracket. Byes are spread evenly and resolve
automatically. Every guest sees one thing at the top: who they're up against
next. Staff tap a name to record a winner and the bracket advances.

**Carspotting** (`/carspot`) — a rolling, weekend-long hunt. Guests upload
photos of the cars they spot (as many as they find). The host voids duplicates
— if two people file the same car, it's out — then convenes a single-
elimination bracket judged head-to-head, X vs Y, tap-to-pick, down to a winner,
a runner-up and a 3rd-place playoff. It seeds only from un-voided entries.

**The standing** (`/standings`) — the overall crown. Points from every
activity roll up into one live board. Karting and carspotting are weighted
about twice the game tournament; photo bingo contributes a little. Point values
and the recompute are driven from Bureau → Points.

**Personnel files** (`/u/[id]`) — every guest has a profile: their photo,
their carspot and bingo uploads, their points breakdown, and their win/loss
record across the judged brackets. You reach it by tapping any name or avatar.
Guests set their own display picture and name from their own file.

**The archive** (`/gallery`) — every photo submitted, filterable by person,
with a full-screen viewer.

**Bureau controls** (`/admin`, staff only) — open and close each activity
(bingo, karts, carspotting, tournament), edit the bingo squares, appoint
helpers, run the draw, tune point values and recompute the standings, award
discretionary bonuses, and export every photo as a zip sorted into one folder
per square for the recap edit. Carspot voiding and judging happen inline on
`/carspot` for staff.

---

## Stack

| Piece | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router), TypeScript | Server components keep the first paint fast on phone data |
| Styling | Tailwind CSS v4 | Design tokens live in `globals.css`, no config file |
| Motion | Framer Motion | Spring physics for tap states and the bracket |
| Database | Supabase Postgres (`ap-southeast-2`) | Sydney region — lowest latency for Brisbane phones |
| Auth | Supabase Auth via a custom edge function | See below |
| Storage | Supabase Storage, private bucket | Signed URLs only |
| Hosting | Vercel | `main` is production |

---

## How login works

Guests type a mobile number and a name. That's it. Behind the scenes:

1. The `guest-login` edge function normalises the number to E.164
   (`0412 345 678` → `+61412345678`, AU mobiles only; overseas numbers are
   accepted if plausible).
2. It finds or creates a real Supabase auth user for that number, using a
   password derived server-side with HMAC. The password never reaches the
   browser and is not stored anywhere.
3. It returns a session, which the app puts in cookies.

The point of the detour is that every request then carries a genuine
`auth.uid()`, so **row level security in the database decides who can touch
what** — not the front end. A guest can only write photos into their own
folder and can only insert lap times under their own id, enforced by Postgres.

The trade-off, chosen deliberately: there is no verification, so anyone with
the link can type any number. Two mitigations ship with it:

- **Invite list** — add guest numbers and flip `invite_only` on in Bureau
  controls. Only listed numbers can sign in.
- **Upgrade path** — swapping in real SMS codes means configuring an SMS
  provider in Supabase Auth and calling `signInWithOtp` instead of the edge
  function. The database and RLS do not change.

The first person ever to sign in becomes the host. That should be you.

---

## Photo storage

- Private bucket `bingo-photos`. Nothing is publicly readable; the app issues
  one-hour signed URLs, and the export issues seven-day ones.
- Path layout is `<guest_id>/<square_id>-<timestamp>.jpg`, and the storage
  policy checks that the first folder matches `auth.uid()`.
- Photos are compressed in the browser to 1920px on the long edge, ~0.9MB.
  That is comfortably above what a 1080p recap reel needs and keeps roughly
  750 photos inside Supabase's 1GB free tier. If the party is bigger than
  that, raise the quota or lower `COMPRESSION.maxSizeMB` in
  `src/components/BingoGrid.tsx`.
- Only the owner and staff can delete a photo.

---

## Local development

```bash
git clone <repo-url>
cd birthday-scoreboard
cp .env.example .env.local   # fill in the two values
npm install
npm run dev
```

Environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxx
```

Both are safe to expose — the publishable key grants nothing that RLS does not
already allow.

---

## Branching

- `main` — production, deploys to Vercel on merge
- `develop` — integration branch
- `feature/*`, `fix/*`, `chore/*` — branch from `develop`, PR back into it

```bash
git checkout develop && git pull
git checkout -b feature/my-thing
# build, commit, push
# open a PR into develop, then merge develop -> main to ship
```

---

## Database

Migrations live in Supabase and are numbered `01_…` to `11_…`. Key points:

- RLS is on for every table, with one permissive policy per role and action.
- `is_staff()` / `is_host()` are `SECURITY DEFINER` helpers so policies on
  `guests` do not recurse.
- Phone numbers are readable by nobody through the API. Column-level grants
  exclude `guests.phone`; staff read numbers through the `staff_guest_list()`
  RPC, which checks the caller's role first.
- `generate_draw()` and `advance_match()` run server-side and check
  `is_staff()` themselves, so the shuffle cannot be influenced from a browser.
- Realtime is enabled on `kart_times`, `matches`, `bingo_entries`,
  `tournament_entrants`, `carspot_entries`, `carspot_matches` and
  `point_awards`. Every live board also polls every 15 seconds, because venue
  wifi blocks WebSockets more often than you would like.
- Profile photos live in a separate **public** `avatars` bucket (they appear
  on every board, so signing each one would be painful); carspot photos live in
  a private `carspot-photos` bucket alongside `bingo-photos`, served by signed
  URLs. A guest may edit their own name and avatar but not their role or phone —
  a trigger enforces that even though the row is theirs to update.
- Points live in a `point_awards` ledger. `recompute_auto_awards()` regenerates
  the `source='auto'` rows from each activity's results using `scoring_config`;
  manual bonuses (`source='manual'`) are left alone. The `standings` view sums
  the ledger per guest.

---

## Things worth knowing before the day

- Open the app yourself first, so you become the host.
- Appoint two helpers in Bureau → Guests before the karting starts.
- Run the draw once everyone has arrived; re-drawing wipes recorded results.
- Export the photos the same night. Signed links expire; the zip does not.
