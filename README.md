# LegalEase — AI-Powered Legal Intelligence & Lawyer Discovery Platform

![LegalEase Branding](public/logo-brand.svg)

> **"Legal Help. Made Easier."**  
> Democratizing access to Pakistani statutory law, verified legal practitioners, and automated legal workflows for citizens, advocates, and administrators.

---

## 📌 Executive Summary

**LegalEase** is a legal-tech platform tailored specifically to the legal framework of **Pakistan** (Pakistan Federal Code, Sindh Code, Bar Council regulations, and Active Taxpayer List / FBR integration). 

The platform bridges the gap between citizens navigating complex statutory systems and verified legal counsel by delivering:
1. **AI Legal Assistant (`/ai-assistant`)**: A statutory RAG agent citing Pakistan Penal Code (PPC), CrPC, Family Courts Act 1964, Rent Restriction Ordinances, and consumer protection acts with plain-language explanations and instant verified lawyer recommendations.
2. **Citizen Portal (`/citizen`)**: Direct lawyer search by city and practice area, real-time consultation booking, encrypted WebRTC/Jitsi video chambers, automated legal notice drafts, and matter progress tracking.
3. **Lawyer Practice Portal (`/lawyer`)**: Comprehensive practice management featuring Bar Council verification workflows, Chamber profile management, calendar & slot configuration, client consultation workspace, encrypted video appointments, case notes, document vaults, and fee ledgers.
4. **Administrative Governance Dashboard (`/admin`)**: 15 integrated modules for platform management including Bar Council credential audits, ATL/FBR tax verification, RAG knowledge-base indexing, AI model engine configuration, review moderation, and dispute management.

---

## 🎨 Brand Identity & Design System

The platform strictly adheres to a cohesive, high-contrast, professional design system:

| Token | Hex Code | Visual Role |
| :--- | :--- | :--- |
| **Deep Navy (Primary)** | `#0d2b43` | Primary brand color, headers, navigation bars, primary buttons, user message bubbles |
| **Emerald Green (Accent)** | `#0fa176` | Accent color, action triggers, verified badges, active states, AI highlights |
| **Pure White** | `#ffffff` | Clean surfaces, cards, modal backgrounds, light text on dark surfaces |
| **Deep Charcoal / Black** | `#050d15` | Dark mode surface background, high-contrast dark text, terminal badges |

### Typography Hierarchy

- **Headings & Logo Wordmark**: `Montserrat` (SemiBold 600, Bold 700)
- **Body & Information**: `Inter` (Regular 400)
- **Navigation, Buttons & Tagline**: `Inter` (Medium 500)
- **Brand Wordmark Styling**:
  - **Legal**: Montserrat SemiBold, `#0d2b43` (Deep Navy)
  - **Ease**: Montserrat SemiBold, `#0fa176` (Emerald Green)
  - **Tagline**: Inter Medium, `#0d2b43` ("Legal Help. Made Easier.")

---

## 🚀 Key Modules & Architecture

### 1. AI Legal Assistant (`/ai-assistant` & `/citizen/ai-assistant`)
- **Fast, Smooth Interaction**: Built with optimistic UI updates, auto-expanding textareas, quick-action prompt chips (Tenancy Dispute, Cheque Bounce § 489-F, Khula & Family Court, Consumer Protection), and graceful typing indicators.
- **Pakistani Statutory Citations**: Directly highlights relevant enactments (Pakistan Penal Code, CrPC, Specific Relief Act, Family Courts Act).
- **Proactive Lawyer Matching**: Suggests verified advocates practicing in the user's specific district and domain when statutory issues require immediate legal representation.
- **Statutory Disclaimer**: Explicit notice distinguishing informational legal education from formal client-attorney representation.

### 2. Lawyer Portal (`/lawyer`)
- **Overview Dashboard (`/lawyer`)**: Real-time stats (Active Matters, Total Consultations, Client Satisfaction Score, Monthly Revenue), upcoming client schedule with one-click Jitsi room entry, and pending verification alerts.
- **Appointments & Calendar (`/lawyer/appointments`)**: Dynamic weekly calendar with slot generation (Morning, Afternoon, Evening), duration controls (15, 30, 45, 60 mins), consultation mode toggles (Video / Audio / In-Person), and reschedule/cancel actions.
- **Client Consultations Workspace (`/lawyer/consultations/[id]`)**: Unified consultation screen featuring embedded Jitsi Meet video, live private case notes with auto-save, shared client documents, and post-session legal summary generation.
- **Chamber Profile (`/lawyer/profile`)**: Public-facing profile editor (Bio, Bar Council Registration SBC/PBC, High Court enrollment, practice specialties, consultation fee PKR, chamber address, office hours).
- **Document Vault (`/lawyer/documents`)**: Secure document repository categorized by client with tags (Pleading, Power of Attorney, Evidence, Affidavits).
- **Earnings & Ledger (`/lawyer/earnings`)**: Financial ledger detailing fee collections, platform commission breakdowns, payout withdrawal requests, and pending receipts.
- **Client Reviews (`/lawyer/reviews`)**: Client rating breakdown with reply capability and dispute flagging for administrative review.

### 3. Citizen Portal (`/citizen`)
- **Action Navigator**: Guided question flow to identify legal issues without knowing legal jargon.
- **Verified Lawyer Directory**: Filter by city (Karachi, Lahore, Islamabad, etc.), bar enrollment (District Court, High Court, Supreme Court), fee range, and gender.
- **Instant Consultation Booking**: Select date & slot, attach case summary, and receive instant video room credentials.
- **Legal Notice Generator**: Step-by-step drafting tool for tenancy notices, defamation warnings, and recovery demands.

### 4. Admin Governance Hub (`/admin`)
- **Lawyer Verification Queue**: Inspect uploaded Bar Council cards, CNIC, and ATL Filer status before granting verified advocate credentials.
- **RAG Knowledge-Base Management**: Upload statutory enactments, case precedent digests, and gazettes into pgvector embeddings.
- **AI Model Router**: Dynamically configure AI API keys, model fallbacks (Gemini 2.5 Flash, Gemini 1.5 Flash, Gemini 1.5 Pro), temperature, and system prompts.
- **Audit Logs & Dispute Center**: Monitor system events and mediate appointment refund requests or lawyer conduct reports.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org) (App Router, Server & Client Components)
- **Language**: [TypeScript](https://www.typescriptlang.org) (Strict type checking)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com) with CSS variables & customized brand tokens
- **UI Components**: [shadcn/ui](https://ui.shadcn.com) (Radix UI primitives)
- **Icons**: [Lucide React](https://lucide.dev)
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL, Row Level Security, Storage)
- **Video Chambers**: [Jitsi Meet External API](https://jitsi.github.io/handbook/docs/dev-guide/dev-guide-iframe/)
- **Fonts**: `@next/font/google` (`Montserrat` & `Inter`)

---

## 📂 Project Structure

```
FYP/
├── app/                           # Next.js App Router
│   ├── ai-assistant/              # Public AI Legal Assistant Route
│   ├── citizen/                   # Citizen Portal (Search, Book, Chat, Docs)
│   ├── lawyer/                    # Lawyer Practice Suite (Appointments, Room, Vault)
│   ├── admin/                     # Admin Governance Dashboard (15 sub-modules)
│   ├── globals.css                # Brand design tokens (#0d2b43, #0fa176) & utilities
│   ├── layout.tsx                 # Root layout with Montserrat & Inter font configs
│   └── page.tsx                   # Landing page
├── Branding/                      # Official Brand Assets
│   ├── SVG/                       # High-resolution vector logos
│   │   └── Asset 1.svg            # Official scales of justice emblem & wordmark
│   ├── Logo-01.svg
│   └── Logo-01.png
├── components/                    # Reusable UI & Feature Components
│   ├── legal-ai/                  # ChatInterface, Message, LegalNoticeGenerator
│   ├── lawyer/                    # ConsultationRoom, CalendarSlotPicker, etc.
│   ├── ui/                        # Button, Dialog, Card, Input, Table primitives
│   └── navigation/                # Header, Footer, Role-specific Sidebars
├── lib/                           # Utilities & Service Clients
│   ├── supabase/                  # Supabase browser & server clients
│   ├── ai/                        # Grounded AI & prompt construction
│   └── utils.ts                   # Class merging & formatters
├── public/                        # Static Assets
│   ├── favicon.svg                # Brand favicon (#0d2b43 / #0fa176)
│   ├── logo-brand.svg             # Main vector SVG logo
│   └── favicon.png
├── complete_plan.md               # Master Project Architectural Plan & Checklist
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript configuration
```

---

## ⚡ Getting Started

### Prerequisites
- **Node.js**: `v18.17.0` or higher
- **npm** or **pnpm** / **yarn**

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone <repository-url>
cd FYP
npm install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Google Gemini / AI Engine
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.5-flash

# Next Public Site URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 3. Running Locally
Start the local development server:
```bash
npm run dev
```

Visit the routes in your browser:
- **Landing Page**: [http://localhost:3000](http://localhost:3000)
- **AI Legal Assistant**: [http://localhost:3000/ai-assistant](http://localhost:3000/ai-assistant)
- **Citizen Portal**: [http://localhost:3000/citizen](http://localhost:3000/citizen)
- **Lawyer Dashboard**: [http://localhost:3000/lawyer](http://localhost:3000/lawyer)
- **Admin Dashboard**: [http://localhost:3000/admin](http://localhost:3000/admin)

### 4. Production Build & Validation
```bash
# Type check
npx tsc --noEmit

# Production build
npm run build
```

---

## 📜 Legal & Compliance Disclaimer

*LegalEase is an artificial intelligence-assisted legal resource and technology directory platform. Legal insights and document drafts provided by the AI assistant are intended for informational, organizational, and educational purposes under Pakistan statutory law and do not constitute formal legal representation or create an attorney-client relationship. Citizens are always encouraged to book a verified advocate via the platform for contentious court proceedings.*

---

## 📄 License
This project is proprietary and developed as part of the Final Year Project (FYP) for LegalEase. All rights reserved.
