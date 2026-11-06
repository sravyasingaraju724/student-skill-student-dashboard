# Student Skill Tracking Dashboard

A beginner-friendly full-stack web application for students to record technical and soft skills, set target proficiency levels, and review progress over time. It uses plain HTML, CSS, and JavaScript, a Node.js/Express API, and Supabase PostgreSQL with Supabase Auth.

## Part 1 — Project planning

### Problem and objectives
Students often learn skills across classes, projects, and self-study but do not keep one consistent record of current proficiency or next goals. SkillTrack makes that inventory visible and helps students decide what to practise next.

### Users and roles
- **Student (implemented):** creates an account, tracks their own skills, sets current and target levels, adds notes, searches/filters, and reviews progress snapshots.
- **Mentor (not in this MVP):** mentor review and shared learning plans are future improvements. There is no mentor role or privileged admin screen in this version.

### Implemented features
- Sign up and sign in with Supabase Auth.
- Dashboard totals for skills, targets reached, skills in progress, and skill areas.
- Add, view, update, and delete skill records.
- Categories for technical and soft skills.
- Five proficiency levels: Beginner, Elementary, Intermediate, Advanced, Expert.
- Search by skill/category and filter by category or target status.
- Database-generated progress history when a skill is created or its current level changes.
- Responsive layout, inline validation, toast feedback, empty states, and confirmation before deletion.

### Pages and main workflow
There are two main views in one responsive single-page interface: the authentication screen and the signed-in dashboard. The dashboard has Overview and My skills views. Typical workflow: register/sign in → add a skill → choose category/current/target levels → review summary → update current level after practice → inspect recent updates → delete a record only after confirmation.

### Architecture
`Browser (HTML/CSS/Vanilla JS) → fetch('/api/...') → Express → Supabase client with the signed-in access token → Supabase Auth/PostgreSQL (RLS policies)`.
The browser never receives a service-role key. The API verifies each bearer token with Supabase Auth and database queries carry that user's token so PostgreSQL RLS can enforce ownership.

## Part 2 — Folder structure

```text
student-skill-tracking-dashboard/
├── .gitignore
├── README.md
├── backend/
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── src/
│       ├── supabase.js
│       ├── middleware/
│       │   ├── auth.js
│       │   └── errors.js
│       └── routes/
│           ├── auth.js
│           ├── dashboard.js
│           └── skills.js
├── database/
│   └── schema.sql
└── frontend/
    ├── app.js
    ├── index.html
    └── styles.css
```

## Prerequisites

Install these first:
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js LTS](https://nodejs.org/) (npm is included; use Node.js 20 or newer)
- [Git](https://git-scm.com/downloads)
- A free [Supabase account](https://supabase.com/)

Verify in a new VS Code terminal:

```powershell
node --version
npm --version
git --version
```

Each command should print a version. If Windows says a command is not recognized, install the tool and restart VS Code/Terminal.

## Part 3 — Setup from the ZIP (Windows)

1. **Download and extract.** Extract `student-skill-tracking-dashboard.zip`. In VS Code choose **File → Open Folder** and open the extracted `student-skill-tracking-dashboard` folder (the one containing `README.md`).
2. **Confirm folders.** You should see `frontend`, `backend`, and `database`. Do not rename them unless you also update all matching paths.
3. **Open a terminal at the project root.** In VS Code choose **Terminal → New Terminal**. Check the current directory with `pwd` in PowerShell or `Get-Location`.
4. **Install packages.** Run:

   ```powershell
   cd backend
   npm install
   npm run check
   ```

   `npm install` downloads the packages listed in `package.json` and creates/updates `package-lock.json`. The check command asks Node to parse each backend JavaScript file. A successful check returns to the prompt without syntax errors. If installation fails, check internet access and your Node version, then retry `npm install`.
5. **Create a Supabase project.** Sign in at [Supabase](https://supabase.com/), choose **New project**, select an organization, name the project, set a strong database password, and choose a region. Wait until project setup finishes. Keep the database password private; this app does not need it.
6. **Run the schema.** In the Supabase project, open **SQL Editor → New query**. Open `database/schema.sql` in VS Code, copy its complete contents, paste into the SQL Editor, and click **Run**. It creates the three tables and security policies. To verify, open **Table Editor** and check for `profiles`, `skills`, and `skill_progress`. If you see a SQL error, read the highlighted statement and confirm the whole schema was pasted; do not run only a random fragment.
7. **Configure environment variables.** In Supabase open **Project Settings → API** (the exact menu wording may vary). Copy the Project URL and the publishable/anon public key. In VS Code open `backend/.env` and replace `https://YOUR-PROJECT-REF.supabase.co` and `YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY` with your own values. Keep the key on the backend in this project. `backend/.env.example` documents the variable names; `.env` holds local values and is ignored by Git. Do not use a service-role/secret key. Required variables are `PORT`, `NODE_ENV`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`.
8. **Check email confirmation settings.** Supabase Auth may require email confirmation. If registration says to check your email, confirm the address using the message Supabase sends, then sign in. For a classroom demo, configure confirmation behavior only within the options your instructor permits; never weaken a real deployment's security just for convenience.
9. **Start the app.** From the `backend` directory run:

   ```powershell
   npm start
   ```

   Expected terminal output: `Student Skill Tracking Dashboard running at http://localhost:3000`. Keep this terminal open. Open [http://localhost:3000](http://localhost:3000) in your browser. If port 3000 is busy, change `PORT` in `backend/.env` and visit that port instead.
10. **Try the main features.** Register or sign in, add a skill (for example JavaScript, category Web Development, current Beginner, target Intermediate), check the Overview totals, use search and filters, edit the current level, and delete a test record after reading the confirmation dialog. Refresh the page and sign in again to verify records are in the database.
11. **Common problems.** `Supabase is not configured` means the `.env` values are still placeholders or the server needs restarting. `Invalid API key` means the key was copied incorrectly. `Failed to fetch` usually means the server is stopped or the URL/port is wrong. Email confirmation means you need to confirm before signing in. If the schema was not run, database requests will fail; run the full `database/schema.sql`. Do not paste credentials into public issue reports.

### macOS/Linux differences
Use the same commands in Terminal, replacing PowerShell navigation with `cd /path/to/student-skill-tracking-dashboard/backend`. Node, npm, and Git commands are the same.

## Part 4 — Supabase database design

| Table | Purpose | Key relationships |
|---|---|---|
| `profiles` | Display name linked to the Supabase identity | `id` references `auth.users.id` |
| `skills` | One student's skill, category, current level, target level, notes | `user_id` references `auth.users.id`; unique `(user_id, name)` |
| `skill_progress` | Historical level snapshots | `skill_id` references `skills.id`; `user_id` references `auth.users.id` |

A trigger creates a profile when Supabase Auth creates a user. A second trigger updates timestamps. A third trigger records a progress row when a skill is created and whenever its current level changes. Deleting a skill cascades to its progress rows. Database constraints validate categories and levels; indexes support ownership, category, and history lookups.

### RLS and authentication notes
Row Level Security is enabled for all three app tables. Policies restrict profile access to the matching `auth.uid()`, skill access to `user_id = auth.uid()`, and progress reads/inserts to the owner's identity. The backend verifies the access token through Supabase Auth and sends it with database queries. The service-role key is not used. The browser stores the short-lived access token in `sessionStorage`, so it is cleared when the browser tab session ends; never deploy this beginner demo without a security review. For production, consider a server-managed secure, HttpOnly cookie and additional CSRF protections.

## Part 5 — REST API reference

All routes return JSON. Protected routes require `Authorization: Bearer <Supabase access token>`.

| Method and path | Purpose | Body/query | Auth | Success | Common errors |
|---|---|---|---|---|---|
| `GET /api/health` | Check server process | None | Public | `200 {"status":"ok",...}` | — |
| `POST /api/auth/register` | Create Supabase Auth account | `{ "name": "Aanya Sharma", "email": "a@example.com", "password": "at least 8 chars" }` | Public; rate limited | `201` with access token when immediate session is allowed, otherwise message asking to confirm email | `400` invalid input / registration issue, `503` configuration issue, `429` too many attempts |
| `POST /api/auth/login` | Sign in | `{ "email": "a@example.com", "password": "..." }` | Public; rate limited | `200 {message, accessToken, user}` | `400` missing input, `401` invalid credentials, `429` rate limit |
| `GET /api/auth/me` | Get current user's profile | None | Student | `200 {user}` | `401` invalid/expired token |
| `GET /api/dashboard` | Dashboard totals and recent skills | None | Student | `200 {summary, recentSkills, categoryCounts}` | `401`, generic `500` |
| `GET /api/skills` | List/search/filter own skills | Optional `search`, `category`, `status=in-progress\|on-track` | Student | `200 {skills, categories, levels}` | `401`, generic `500` |
| `GET /api/skills/:id` | Get one owned skill and its progress history | UUID skill id | Student | `200 {skill, levels, categories}` | `401`, `404` if absent/not owned |
| `POST /api/skills` | Create skill | `{ "name": "JavaScript", "category": "Web Development", "current_level": "Beginner", "target_level": "Intermediate", "notes": "Practise DOM events" }` | Student | `201 {message, skill}` | `400` validation, `409` duplicate name, `401` |
| `PUT /api/skills/:id` | Update owned skill | Same fields as create | Student | `200 {message, skill}` | `400`, `404`, `409`, `401` |
| `DELETE /api/skills/:id` | Delete owned skill and its history | None | Student | `200 {message}` | `404`, `401` |

The `user_id` is never accepted from the browser; Supabase policies and the authenticated token determine ownership. Invalid request fields are rejected by the backend. Internal database details are not returned to the client.

## Part 6 — Testing checklist

Use a test account and test data. Do not use important personal records for destructive tests.

| Test | Steps | Expected result |
|---|---|---|
| Server health | Visit `/api/health` | JSON status is `ok` |
| Register | Create an account with valid name/email/password | Account is created or app asks you to confirm email |
| Invalid registration | Use a one-character name, invalid email, or short password | Friendly validation message; no app profile/skill is created |
| Sign in | Enter correct credentials | Dashboard opens |
| Invalid sign in | Enter incorrect credentials | Generic credentials message; no token is saved |
| Create skill | Add a skill with valid category and levels | It appears in My skills and dashboard totals increase |
| Duplicate skill | Add same skill name again for the same account | Friendly duplicate-name error; existing skill remains |
| Update skill | Change current level | Skill updates and a progress snapshot is created in `skill_progress` |
| Search/filter | Search a partial skill name; filter by category/status | Only matching skills remain; reset filters to see all |
| Delete | Delete a test skill and confirm | Skill disappears and linked progress rows are deleted |
| Cancel delete | Open delete dialog and choose Keep skill | Skill remains |
| Empty state | Use a new account with no skills | Dashboard and list show helpful empty-state text |
| Backend validation | Send a malformed body to `POST /api/skills` using an API client | `400` JSON error; invalid data is not stored |
| Missing/expired auth | Call a protected endpoint without a token | `401` JSON response |
| Cross-user access | Create two accounts; try account A's skill ID while signed in as B | B cannot read/update/delete A's skill; RLS returns no owned row |
| Persistence | Refresh and sign back in | Saved records remain in Supabase |
| Responsive layout | Test desktop and a narrow mobile viewport | Navigation, cards, forms, and filters remain usable |
| Rate limit | Repeatedly submit auth attempts in a short time | API eventually returns `429`; wait for the window to reset |

No automated test suite is included in this MVP. `npm run check` checks backend JavaScript syntax only; it does not test a live Supabase project or browser interactions.

## Part 7 — Git and GitHub upload

Create a new **empty** repository on [GitHub](https://github.com/new). Do not add a README/license there because this project already has a README. From the project root (the folder containing the root `.gitignore` and `README.md`) open a VS Code terminal and run:

```powershell
git init
git status
git add .
git status
git commit -m "Build project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the repository URL shown by GitHub, for example the HTTPS URL for your own repository. What each command does:
- `git init`: starts version control in this folder.
- `git status`: lists tracked/untracked/changed files.
- `git add .`: stages project files for the next commit.
- Run `git status` again to review what will be committed.
- `git commit`: saves a named snapshot locally.
- `git branch -M main`: names the current branch `main`.
- `git remote add origin ...`: connects this local repository to GitHub.
- `git push -u origin main`: uploads the branch and sets its upstream.

**Before `git add .` and before committing:** check that `backend/.env` and `node_modules/` do not appear as staged files, `backend/.env.example` is included, and no credentials occur in any file. The root and backend `.gitignore` files exclude local secrets and installed dependencies. A `.gitignore` entry does not remove a secret already committed. If you accidentally publish a credential, rotate/revoke it immediately in Supabase and remove it from repository history as appropriate. After pushing, refresh the GitHub repository page and confirm the README, frontend, backend, and schema are visible while `.env` is not.

## Security considerations, limitations, and future improvements

- This is a student learning MVP, not a security-audited production service. The bearer token is held in `sessionStorage`; an XSS vulnerability could expose it. The UI escapes user-generated text before rendering, and Helmet adds security headers, but external font import is only decorative and the app remains usable if it is unavailable.
- Use only the Supabase publishable/anon key in backend configuration, never the service-role key. RLS is a second line of defense; keep it enabled.
- Supabase email confirmation behavior depends on your project Auth settings. Password reset and email-change flows are not included.
- Mentors, shared goal plans, exports, charts of long-term progress, and role-based administration are intentionally excluded from the MVP.
- `skill_progress` stores snapshots of current proficiency when created/changed; it is not a journal of every practice session. Notes are stored on the skill and copied into the snapshot only when the current level changes.
- No external AI, paid API, or third-party app integration is required. Google Fonts is an optional visual enhancement; the system falls back to sans-serif fonts.

## Troubleshooting summary

- **`Supabase is not configured`:** update the placeholders in `backend/.env`, save, and restart the server.
- **`Invalid API key`:** re-copy the project's URL and publishable/anon key; do not include extra quotes or spaces.
- **Email confirmation prompt:** confirm the email, then sign in.
- **Missing relation/table errors:** run the complete `database/schema.sql` in the correct Supabase project.
- **`Failed to fetch`:** confirm `npm start` is running and visit the matching localhost port.
- **Port already in use:** set another numeric `PORT` in `.env` and restart.
- **A skill is not visible:** check that you are signed into the correct account and that filters are cleared.
