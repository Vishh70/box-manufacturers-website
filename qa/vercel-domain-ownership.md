# Vercel Domain Ownership Report

**Date:** 2026-09-04  
**Investigator:** Automated Vercel CLI + API inspection  
**Target:** `https://arti-enterprises.vercel.app`  
**Current production:** `https://arti-enterprises-delta.vercel.app`

---

## Result: CASE B — Another Account Owns It

The alias `arti-enterprises.vercel.app` is **NOT** owned by your current Vercel team. It belongs to a different Vercel account/project that you do not control from your current CLI login.

---

## Evidence

### 1. Your Vercel Identity
```
Account: vishnuaware70-2124
Team: vishnuaware70-2124s-projects (team_Lrz0bdYveeHcTbOkhaWgrPU2)
```
This is the **only** team on the account. No other teams exist.

### 2. Your Projects
| Project | Production URL |
|---|---|
| `arti-enterprises` | `https://arti-enterprises-delta.vercel.app` |
| `frontend` | `https://grievanceiq-app.vercel.app` |
| `smartnivad` | `https://smartnivad.vercel.app` |

`arti-enterprises.vercel.app` is **not** listed as a production URL for any of these.

### 3. Your Aliases (vercel alias ls)
| Alias | Owner |
|---|---|
| `arti-enterprises-delta.vercel.app` | ✅ Your team |
| `arti-enterprises-git-main-...vercel.app` | ✅ Your team |
| `arti-enterprises-vishnuaware70-...vercel.app` | ✅ Your team |
| `arti-enterprises.vercel.app` | ❌ **NOT listed** |

### 4. Domain Add Attempt
```
vercel domains add arti-enterprises.vercel.app
→ Error: The chosen alias "arti-enterprises.vercel.app" is already in use. (403)
```

### 5. Inspect Attempt
```
vercel inspect arti-enterprises.vercel.app
→ Error: Can't find the deployment "arti-enterprises.vercel.app"
   under the context "vishnuaware70-2124s-projects"
```

This confirms the alias exists but belongs to a **different** Vercel project/team.

---

## What This Means

The URL `https://arti-enterprises.vercel.app` was likely created by an earlier Vercel project — possibly under a different Vercel account, a deleted project, or a previous team scope. Because Vercel `.vercel.app` aliases are globally unique, you cannot claim it from your current team.

---

## Options

### Option 1: Recover via Vercel Support (Uncertain)
Contact Vercel support and explain that `arti-enterprises.vercel.app` was previously yours and is now orphaned. Vercel may be able to release the alias. **This is not guaranteed.**

### Option 2: Purchase a Custom Domain (Recommended)
Buy a domain you own permanently, such as:
- `artienterprises.in`
- `artienterprises.com`
- `arti-enterprises.in`

Then add it to your current Vercel project via **Project Settings → Domains**. This is the professional, permanent solution that doesn't depend on Vercel's subdomain system.

### Option 3: Keep the Current URL
Continue using `https://arti-enterprises-delta.vercel.app` as production. It works, it's verified, and Google Search Console is already set up for it.

---

## Current Production Status (Unchanged)

| Setting | Value |
|---|---|
| Production URL | `https://arti-enterprises-delta.vercel.app` |
| Production changed | **NO** |
| Canonical URLs | **NOT changed** |
| Sitemap | **NOT changed** |
| robots.txt | **NOT changed** |
| WhatsApp | `+91 7066959787` ✅ |
| Phone | `+91 9420996107` ✅ |
| Search Console | Verified for `-delta` URL ✅ |

---

## Action Required

> [!IMPORTANT]
> Do **NOT** modify the current production deployment, canonical URLs, or SEO configuration until the domain question is resolved.
>
> The working website at `arti-enterprises-delta.vercel.app` must remain operational.
