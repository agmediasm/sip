# S I P - Setup Guide

## 🚀 Quick Start (15 minute setup)

### PASUL 1: Creează cont Supabase (2 min)

1. Mergi la **https://supabase.com**
2. Click **Start your project**
3. Loghează-te cu GitHub sau email
4. Click **New Project**
5. Completează:
   - **Name:** `sip-app`
   - **Database Password:** (salvează-l!)
   - **Region:** `EU West`
6. Așteaptă ~2 minute să se creeze

---

### PASUL 2: Configurează baza de date (3 min)

1. În Supabase, mergi la **SQL Editor** (în meniul din stânga)
2. Click **+ New query**
3. Copiază ÎNTREG conținutul din fișierul `DATABASE_SCHEMA.sql`
4. Paste în editor
5. Click **Run** (butonul verde)
6. Ar trebui să vezi "Success. No rows returned" - asta e bine!

---

### PASUL 3: Obține cheile API (1 min)

1. În Supabase, mergi la **Settings** > **API** (în meniul din stânga)
2. Copiază și salvează:
   - **Project URL** (ex: `https://abcdefgh.supabase.co`)
   - **anon public** key (cheia lungă)

---

### PASUL 4: Creează cont Vercel (2 min)

1. Mergi la **https://vercel.com**
2. Click **Sign Up**
3. Alege **Continue with GitHub**
4. Autorizează Vercel

---

### PASUL 5: Încarcă proiectul pe GitHub (3 min)

**Opțiunea A - Cu GitHub Desktop (mai ușor):**

1. Descarcă GitHub Desktop: https://desktop.github.com
2. Creează un nou repository
3. Copiază toate fișierele din acest folder în repository
4. Commit & Push

**Opțiunea B - Cu linia de comandă:**

```bash
# Creează repo nou pe github.com, apoi:
cd sip-app
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/USERNAME/sip-app.git
git push -u origin main
```

---

### PASUL 6: Deploy pe Vercel (3 min)

1. În Vercel, click **Add New...** > **Project**
2. Importă repository-ul `sip-app` din GitHub
3. **IMPORTANT!** Înainte de deploy, adaugă Environment Variables:
   - Click **Environment Variables**
   - Adaugă:
     - `NEXT_PUBLIC_SUPABASE_URL` = URL-ul tău de la Pasul 3
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = Cheia anon de la Pasul 3
4. Click **Deploy**
5. Așteaptă 1-2 minute

---

### PASUL 7: Testează! 🎉

După deploy, Vercel îți dă un URL (ex: `sip-app.vercel.app`)

Testează:
- `https://sip-app.vercel.app` - Landing page
- `https://sip-app.vercel.app/menu/SIP-VIP1` - Client app (masa VIP 1)
- `https://sip-app.vercel.app/staff` - Staff dashboard
- `https://sip-app.vercel.app/manager` - Manager dashboard

---

## 📱 QR Codes pentru mese

Creează QR codes care duc la:
- Masa VIP 1: `https://YOUR-APP.vercel.app/menu/SIP-VIP1`
- Masa VIP 2: `https://YOUR-APP.vercel.app/menu/SIP-VIP2`
- Masa M1: `https://YOUR-APP.vercel.app/menu/SIP-M1`
- etc.

Generator QR gratuit: https://www.qr-code-generator.com

---

## 🔧 Dezvoltare locală (opțional)

```bash
# Instalează dependențele
npm install

# Creează fișierul .env.local
cp .env.local.example .env.local
# Editează .env.local și adaugă cheile tale

# Pornește serverul de dezvoltare
npm run dev

# Deschide http://localhost:3000
```

---

## 📁 Structura proiectului

```
sip-app/
├── lib/
│   └── supabase.js      # Configurare Supabase
├── pages/
│   ├── index.js          # Landing page
│   ├── staff.js          # Staff dashboard
│   ├── manager.js        # Manager dashboard
│   └── menu/
│       └── [table].js    # Client app (scanare QR)
├── styles/
│   └── globals.css       # Stiluri globale
├── DATABASE_SCHEMA.sql   # Schema bazei de date
├── package.json
└── README.md
```

---

## 🚀 Următorii pași (după validare)

1. **Plăți Stripe** - Integrare plăți reale
2. **Domeniu custom** - ex: sip.club sau app.sip.ro
3. **Notificări push** - Cu OneSignal
4. **SMS-uri** - Cu Twilio
5. **Integrare POS** - Cu sistemul clubului

---

## ❓ Probleme frecvente

**"Cannot read properties of undefined"**
- Verifică că ai rulat schema SQL în Supabase
- Verifică că environment variables sunt setate în Vercel

**Pagina nu se încarcă**
- Verifică URL-ul Supabase (să fie corect)
- Verifică cheia anon (să fie completă)

**Comenzile nu apar în Staff Dashboard**
- Plasează o comandă din Client app
- Refresh Staff Dashboard
- Verifică că Realtime e activat în Supabase

---

## 📞 Suport

Dacă ai probleme, verifică:
1. Supabase Dashboard > Logs
2. Vercel Dashboard > Deployments > Logs
3. Browser Console (F12 > Console)

---

Made with ♠ by S I P
