# 🌾 Krushi Seva Kendra – Agriculture Consultancy Web Application

A full-stack, responsive web application and consultancy management system designed specifically for **Krushi Seva Kendras**, agrochemical retailers, and agricultural consultants in India.

---

## 🌟 Key Modules & Features Implemented

### 1. 🏢 Admin Dashboard
- **Branding Header**: Displays Krushi Seva Kendra Logo, Shop Name, Owner Name, and Tagline.
- **Consultancy Metrics**:
  - **Active Farmers Count**: Live count of registered farmers.
  - **Active Plots Count**: Total supervised farm plots.
  - **Total Area Under Consultancy**: Real-time aggregated area accurately calculated and displayed in **Acre and Guntha** ($1\text{ Acre} = 40\text{ Guntha}$).
- **Today's Scheduled Sprays**: Automatic feed showing all sprays scheduled for today across all farmers' plots based on their planting/sowing dates, with **1-Click WhatsApp advisory dispatch**.

### 2. ⚙️ Side Menu 1: General Master
- **A. Company / Shop Name**: Manage shop name, tagline, mobile, official WhatsApp number, email, address, license number, and GSTIN.
- **B. Year Master**: Add and toggle active financial/agriculture years (e.g., `2026–27`, `2027–28`).
- **C. Unit Master**: Units for chemicals and fertilizers (`ml`, `ltr`, `gm`, `kg`, `bag`).
- **D. Login Settings**: Change Admin Email ID and Password.
- **E. Location Master**: Admins can manually add states, districts, talukas,
  and villages in order, and delete entries. Deleting a parent location also
  deletes its child locations. New farmer registration uses cascading
  dropdowns for the saved locations.

### 3. 💊 Side Menu 2: Medicine Master
- **A. Medicine Company**: Add and manage manufacturers (Syngenta, Bayer, UPL, Dhanuka, BASF, FMC, Sumitomo, etc.).
- **B. Medicine Categories**: Fungicide, Bactericides, Chemical Insecticides, Organic Insecticides, Acaricides, Nematicides, Organic Fungicides, Growth Hormones / Nutrients.
- **C. Medicine Master**: Add, edit, delete, and search medicines (Liquid / Powder / Granules, Company, Category, Unit).
- **D. Fertilizer Master**: Add, edit, delete, and search fertilizers (10:26:26, DAP, 12:61:00, 00:52:34, 13:00:45, Calcium Nitrate, Urea) with application methods.

### 4. 🚿 Side Menu 3: Spray Master / Schedule Master
- Standard crop-wise spray schedules (Tomato, Sugarcane, Ginger, Watermelon, etc.).
- Defines Day (e.g. Day 4, Day 10), Time (Morning/Evening), Medicine, Quantity, Unit, Water Required, and Notes.
- **Master Rule**: Edits made here update the standard master template only.

### 5. 🌾 Side Menu 4: Fertilizer Schedule Master
- Crop-wise fertilizer schedules.
- Defines Day, Growth Stage (Basal, Vegetative, Flowering, Fruit setting), Fertilizer, Quantity, Unit, Method (Drip, Broadcasting, Soil drenching), and Notes.

### 6. 👨‍🌾 Side Menu 5: Farmer Master & Multi-Plot Management
- **Add Farmer**:
  - Personal Info: Full Name, Mobile, WhatsApp, Opening Balance Type (Credit / Debit), Opening Balance (₹), Registration Date.
  - Location Info: State $\rightarrow$ District $\rightarrow$ Taluka $\rightarrow$ Village cascading selection.
  - Website Login: Username & Password for the farmer.
  - **Multiple Plots**: Add multiple plots per farmer (e.g. Plot 1: Sugarcane 2 Acre, Plot 2: Ginger 20 Guntha).
  - **Automatic Master Cloning**: Automatically initializes and clones the standard master spray and fertilizer schedules for each new plot based on the Sowing Date!

### 7. 🎯 Personalized Schedule Customization Logic (Core Feature)
- **The Golden Rule**: When the Admin edits or swaps a medicine/fertilizer for a specific farmer (e.g., changing Medicine A to Medicine B due to a field disease), **only that farmer's plot schedule is updated**.
- The Master Schedule remains completely unchanged for all other farmers.
- Admin can customize: Day, Medicine, Quantity, Water volume, Timing, or Add/Delete days.
- One-click **"Reset from Master Template"** button available if re-sync is ever required.

### 8. 💬 1-Click WhatsApp Advisory Integration
- "Send to WhatsApp" button on any scheduled day.
- Pre-fills professional, structured advisory text in regional language / English:
  - Farmer Name, Crop, Plot Area
  - Day & Time (Morning / Evening)
  - Medicine & Dosage Quantity
  - Water Required
  - Crucial Notes & Weather Warnings
  - Kendra Name & Helpline
- Uses zero-cost `wa.me` deep linking: opens WhatsApp Web or WhatsApp mobile app directly.

### 9. 🔔 Dated Schedule Reminders
- Admins assign an exact calendar date to personalized spray and fertilizer entries in the farmer's profile.
- The Farmer Panel shows activities on their scheduled date and lists upcoming activities with their dates.
- For a Marathi WhatsApp reminder, an admin can click **Send WhatsApp** beside a schedule. WhatsApp opens with a prepared message; the admin reviews and sends it manually.
- This simple mode does not require WhatsApp Business API credentials, templates, database setup, or a scheduled job.

### 10. 📱 Farmer Panel (Mobile-First)
- Secure, read-only login for farmers using their Username & Password.
- Strict data privacy: Farmers see **only their own plots and schedules**.
- **Today's Schedule Highlight**: Displays today's active spray or fertilizer requirement prominently.
- **Plot Switcher**: Easily toggle between Plot 1, Plot 2, etc.
- **Complete Timeline**: Browse past and upcoming sprays and fertigation stages.
- **Bilingual**: Toggle between **English** and **मराठी (Marathi)** with one click.

---

## 🔑 Demo Login Credentials

The app starts with fictional demo data. The local JSON database at
`src/data/krushi_db.json` is ignored by Git so farmer and shop records are not
uploaded with the source. Do not deploy with the demo passwords below; change
them and configure real shop details securely before deployment.

### Admin Dashboard (प्रशासक)
- **URL**: `/login` (Switch to "Admin" tab)
- **Email**: `admin@krushi.com`
- **Password**: `admin123`

### Farmer Panel (शेतकरी)
- **URL**: `/login` (Switch to "Farmer Login" tab)
- **Farmer 1**: Username: `ramesh` | Password: `1234` *(Plots: Sugarcane 2 Acre, Ginger 20 Guntha)*
- **Farmer 2**: Username: `suresh` | Password: `1234` *(Plot: Tomato 1 Acre 20 Guntha - has a spray scheduled today!)*

---

## 🚀 How to Run Locally

```bash
# 1. Install dependencies (if not already installed)
npm install

# 2. Run the development server
npm run dev

# 3. Open in your browser
http://localhost:3000
```

## ☁️ Vercel Deployment with Supabase

The app uses the local JSON file for development. Vercel deployments must use
Supabase because serverless deployments do not provide persistent writable
application files.

1. In the Supabase SQL Editor, create the private application-state table:

   ```sql
   create table if not exists public.krushi_app_state (
     id integer primary key check (id = 1),
     state jsonb not null
   );

   alter table public.krushi_app_state enable row level security;
   revoke all on table public.krushi_app_state from anon, authenticated;
   grant select, insert, update on table public.krushi_app_state to service_role;
   ```

2. In the Vercel project settings, add these environment variables for each
   deployment environment you use:
   - `SUPABASE_URL`: the Project URL from Supabase.
   - `SUPABASE_SERVICE_ROLE_KEY`: the service-role key from the Supabase API
     settings. Keep this secret; do not use a `NEXT_PUBLIC_` variable or commit
     it to source control.
3. On first access, the app initializes an empty application-state table with
   its built-in starter data.

If database-backed API routes return HTTP 500, inspect Vercel Function Logs for
`Supabase REST request failed` or `Supabase REST request did not receive a
response`. The logs include the HTTP status and Supabase error code/message
without logging the project URL or service-role key. Verify that the
`krushi_app_state` table exists and that the server-only
`SUPABASE_SERVICE_ROLE_KEY` has the documented table permissions.

The app does not automatically migrate existing records from a local JSON file
or an earlier deployment. Import any records you need to keep into Supabase
before switching production traffic.

---

## 🛠️ Technology Stack
- **Framework**: Next.js 16 (App Router, React 19, TypeScript)
- **Styling**: Tailwind CSS v4 with custom responsive design
- **Icons**: Lucide React
- **Storage / Database**: Local JSON file for development; Supabase JSONB storage for persistent Vercel deployments
- **WhatsApp Integration**: Manual `wa.me` links with prepared Marathi messages
