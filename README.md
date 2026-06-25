# Mandisa Nailed It — Website + Admin Console

A full-stack website for a hair & beauty studio offering nails, lashes, hair
installation, and hair products — with a password-protected admin console
for managing services, products, prices, and limited-time discounts.

```
mandisa-nailed-it/
├── backend/              Node.js + Express API, MongoDB via Mongoose
│   ├── config/
│   │   ├── db.js         MongoDB connection
│   │   └── seed.js       Creates the first admin login
│   ├── models/            Admin, Service, Product, Discount, Review
│   ├── routes/            auth, services, products, discounts, reviews
│   ├── middleware/auth.js JWT route protection
│   ├── utils/             pricing.js (discount math), email.js (Nodemailer)
│   ├── server.js
│   ├── package.json
│   └── .env.example
└── frontend/              Static site, no build step required
    ├── index.html         Public site
    ├── admin.html          Admin console (login → dashboard)
    ├── css/
    └── js/
```

## 1. How it's organized

**Public website** (`index.html`)
- Hero, **Services** (grouped by category, live pricing pulled from the API),
  **Products**, **Reviews** (approved reviews + a submission form for new
  ones, which land as "pending" until the owner approves them), and
  **Find Us** with an embedded Google Map and studio details.

**Admin console** (`admin.html`)
- Email + password login, protected by JWT.
- "Forgot password?" → emails a reset link (Nodemailer) → reset screen.
- Dashboard tabs: **Services**, **Products**, **Discounts & Offers**,
  **Reviews**. Each is a full CRUD table with an add/edit modal.
- Discounts can apply to everything, all services, all products, or one
  specific item, with a start/end date — the public site automatically shows
  the discounted price (with a strikethrough on the original) while the
  offer is live, and reverts once it ends.

## 2. Setting up MongoDB

You don't need to manage a MongoDB server yourself — **MongoDB Atlas**
(the official hosted version) has a permanent free tier that's enough for a
small business site.

1. Create a free account at mongodb.com/cloud/atlas and create a new
   **free (M0) cluster**.
2. Under **Database Access**, create a database user with a username and
   password (not your Atlas login — a separate app user).
3. Under **Network Access**, add an IP entry. For development, "Allow
   access from anywhere" (0.0.0.0/0) is fine; for production, restrict it
   to your hosting provider's IP range if it's static.
4. Click **Connect** on your cluster → **Drivers** → copy the connection
   string. It looks like:
   ```
   mongodb+srv://<mandisa>:<rFDpRZlJ5LvA9SQu>@<cluster>.mongodb.net/?retryWrites=true&w=majority
   ```
5. Paste it into `backend/.env` as `MONGODB_URI`, adding a database name
   before the `?`, e.g. `.../mandisa-nailed-it?retryWrites=true...`.

Mongoose (already wired up in `config/db.js`) handles connecting, retries,
and creating collections automatically the first time you save a document —
you don't need to manually create tables or collections.

### MongoDB best practices used in this project (and worth keeping)

- **Schemas with validation** (`models/*.js`): every field has a type, and
  required/enum/min constraints, so bad data gets rejected before it's
  saved rather than causing bugs later.
- **Never store plaintext passwords**: `Admin.js` hashes passwords with
  bcrypt before saving (`setPassword`) and only ever compares hashes
  (`comparePassword`). The same pattern is used for password-reset tokens —
  only a SHA-256 hash of the token is stored, so a database leak alone
  can't be used to reset an account.
- **Indexes for things you look up often**: the admin `email` field is
  `unique`, which Mongoose backs with a unique index — this both enforces
  one account per email and makes login lookups fast.
- **Keep secrets out of the database and out of git**: connection strings,
  JWT secrets, and email credentials live in `.env` (gitignored), not in
  code or in MongoDB itself.
- **Separate "public" and "admin" reads**: public routes only ever query
  `{ active: true }` / `{ status: "approved" }`, so unpublished items or
  unmoderated reviews never leak to the website by accident — the
  filtering happens at the database query level, not just in the UI.
- **Computed fields stay computed, not stored**: the discounted price isn't
  saved on the Service/Product — it's calculated on read (`utils/pricing.js`)
  from whatever discounts are currently live. That way a discount's price
  is always correct and nothing needs a background job to "turn it off"
  when it ends.
- **Backups**: Atlas's free tier doesn't include automated backups — once
  you have real client/business data, it's worth turning on Atlas's paid
  backup tier or running a scheduled `mongodump` somewhere.

## 3. Running it locally

```bash
cd backend
cp .env.example .env     # then fill in MONGODB_URI, JWT_SECRET, email settings
npm install
npm run seed              # creates the first admin login from .env values
npm run dev                # starts the server on http://localhost:5000
```

Then open `http://localhost:5000` for the public site and
`http://localhost:5000/admin.html` for the admin console (the Express
server serves the `frontend` folder as static files, so one server handles
both — no separate frontend setup needed).

Log in with the `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` you set in
`.env`, then change the password from inside the studio once "forgot
password" is confirmed to be emailing correctly.

## 4. Setting up email (for password reset)

The `.env.example` is set up for Gmail SMTP:
1. Turn on 2-Step Verification on the Gmail account you want to send from.
2. Create an **App Password** (Google Account → Security → App passwords).
3. Use that 16-character app password as `EMAIL_PASS` — not the regular
   Gmail password.

Any SMTP provider works the same way (Outlook, Zoho, SendGrid, etc.) — just
change `EMAIL_HOST`/`EMAIL_PORT` to match their docs.

## 5. Deploying

You have two good options. Both work with the project exactly as it is —
nothing in `frontend/` needs to change either way.

### Option A: Netlify

Netlify hosts the frontend on its CDN and runs the backend as a
**Netlify Function** (a serverless function, not an always-on server) —
this project is already set up for that:

- `netlify.toml` (project root) tells Netlify where everything is.
- `backend/netlify/functions/api.js` wraps the same Express routes/models
  you already have, via `serverless-http`.
- `frontend/js/config.js` already calls `/api/...`, and the redirect in
  `netlify.toml` routes those calls to the function — no frontend changes.

To deploy:
1. Push this project to a GitHub/GitLab/Bitbucket repo.
2. In Netlify: **Add new site → Import an existing project** → pick the repo.
   Netlify will detect `netlify.toml` and fill in the build settings.
3. Under **Site configuration → Environment variables**, add the same
   values from `backend/.env` (`MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
   `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `EMAIL_FROM`).
   Set `CLIENT_URL` to your Netlify site URL once you know it (e.g.
   `https://mandisa-nailed-it.netlify.app`) — it's used to build the
   password-reset link.
4. Deploy. The site and the `/api/...` function ship together.
5. Run the seed script **once**, from your own machine, pointed at the same
   `MONGODB_URI` you set in Netlify, to create the first admin login:
   ```bash
   cd backend && cp .env.example .env   # fill in the same values as Netlify
   npm install && npm run seed
   ```

Worth knowing about the Netlify route:
- **Cold starts**: the function "sleeps" between requests and takes a beat
  to wake up after idle time. Fine for a small business site; not built for
  high constant traffic.
- **Login rate-limiting resets more often**: the brute-force limiter
  (`express-rate-limit`) keeps its counts in memory, and serverless function
  instances don't stay warm forever, so the 15-minute lockout window isn't
  as airtight as on an always-on server. Not a big deal at this traffic
  level, but worth knowing.
- Netlify's free tier function execution limits are generous enough for
  this app's simple CRUD/auth requests.

### Option B: Render, Railway, or a VPS (traditional always-on server)

Push the whole `mandisa-nailed-it` folder, set the same environment
variables from `.env` in the host's dashboard, and run `npm start` inside
`backend/`. Since `server.js` already serves the `frontend` folder itself,
this is a single service for both the site and the API — no separate
frontend deploy needed.

## 6. Customizing before launch

A few placeholders to swap out for the real business details:
- `frontend/index.html` → the **Find Us** section: real address, phone,
  email, hours, and the Google Maps embed URL (search the real address on
  Google Maps → Share → Embed a map → copy the `src` URL into the
  `<iframe>`).
- Add real services/products/photos through the admin console once it's
  running — there's no need to edit code for day-to-day content changes,
  that's the whole point of the admin console.
- Service/product `image` fields accept any image URL (e.g. an image
  uploaded to a free host like Cloudinary or Imgur, or hosted alongside the
  frontend in `frontend/img/`).

## 7. Security notes

- Admin login is rate-limited (10 attempts / 15 min) to slow down
  brute-force attempts.
- Review submission is rate-limited (5 / hour) to reduce spam.
- JWTs expire after 8 hours by default (`JWT_EXPIRES_IN`) — change as
  needed.
- Set a long, random `JWT_SECRET` in production — never reuse the example
  value.
