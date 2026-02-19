# Canvas LTI 1.3 Configuration Guide
## TCC Discussion Hub Setup Instructions

This guide walks the Canvas administrator through configuring TCC Discussion Hub as an LTI 1.3 tool.

---

## Prerequisites

Before starting, confirm:
- [ ] Discussion Hub server is deployed and accessible at its URL
- [ ] SSL certificate is valid (test by visiting the URL in a browser)
- [ ] You have Canvas Admin access with Developer Key permissions

---

## Step 1: Create a Developer Key

1. Log into Canvas as an administrator
2. Navigate to: **Admin** → **[Root Account]** → **Developer Keys**
3. Click **+ Developer Key** → **+ LTI Key**

### Configure the Developer Key:

#### Key Settings Tab

| Field | Value |
|-------|-------|
| **Key Name** | TCC Discussion Hub |
| **Owner Email** | [your email]@tccd.edu |
| **Redirect URIs** | `https://discussionhub.tccd.edu/lti/callback` |
| **Notes** | Internal discussion board tool for enhanced student engagement |

#### Configure Tab (LTI 1.3 Settings)

| Field | Value |
|-------|-------|
| **Target Link URI** | `https://discussionhub.tccd.edu/lti/launch` |
| **OpenID Connect Initiation URL** | `https://discussionhub.tccd.edu/lti/login` |
| **JWK Method** | Public JWK URL |
| **Public JWK URL** | `https://discussionhub.tccd.edu/.well-known/jwks.json` |

#### LTI Advantage Services

Enable **all** of these services for full functionality:

| Service | Required | Purpose |
|---------|----------|---------|
| ☑️ Can create and view assignment data in the gradebook associated with the tool | Yes | Grade passback |
| ☑️ Can view assignment data in the gradebook associated with the tool | Yes | Read grades |
| ☑️ Can view submission data for assignments associated with the tool | Yes | View submissions |
| ☑️ Can create and update submission results for assignments associated with the tool | Yes | Update grades |
| ☑️ Can retrieve user data associated with the context the tool is installed in | Yes | Get user names |
| ☑️ Can lookup Account information | Optional | Multi-account support |

#### Additional Settings

| Field | Value |
|-------|-------|
| **Privacy Level** | **Public** (required to receive user name and email) |
| **Placements** | See below |

#### Placements

Add these placements:

**1. Course Navigation**
| Field | Value |
|-------|-------|
| Target Link URI | `https://discussionhub.tccd.edu/lti/launch` |
| Text | Discussion Hub |
| Icon URL | `https://discussionhub.tccd.edu/icon.png` (optional) |
| Selection Width | 800 |
| Selection Height | 600 |

**2. Assignment Selection**
| Field | Value |
|-------|-------|
| Target Link URI | `https://discussionhub.tccd.edu/lti/launch` |
| Text | Discussion Hub |
| Selection Width | 800 |
| Selection Height | 600 |

**3. Link Selection** (optional - allows embedding in modules)
| Field | Value |
|-------|-------|
| Target Link URI | `https://discussionhub.tccd.edu/lti/launch` |
| Text | Discussion Hub |

4. Click **Save**

---

## Step 2: Record the Client ID

After saving, Canvas displays the Developer Key with a **Client ID** (a long number like `10000000000001`).

**Record this Client ID** — it's needed for the Discussion Hub configuration.

Also note:
- The Developer Key starts in **OFF** state
- Keep it OFF until ready for testing

---

## Step 3: Configure the Discussion Hub Server

Send these values to the Discussion Hub administrator:

```
LTI_CLIENT_ID=10000000000001  (your actual Client ID)
LTI_PLATFORM_URL=https://tccd.instructure.com
LTI_AUTH_URL=https://tccd.instructure.com/api/lti/authorize_redirect
LTI_TOKEN_URL=https://tccd.instructure.com/login/oauth2/token
LTI_KEYSET_URL=https://tccd.instructure.com/api/lti/security/jwks
```

Wait for confirmation that the server is configured before proceeding.

---

## Step 4: Enable the Developer Key

1. Return to **Admin** → **Developer Keys**
2. Find "TCC Discussion Hub" in the list
3. Toggle the **State** switch to **ON**

---

## Step 5: Add the Tool to a Course (Testing)

For initial testing, add the tool to a single course:

### Option A: Course Navigation

1. Go to a test course
2. Navigate to **Settings** → **Navigation**
3. Find "Discussion Hub" in the hidden items
4. Drag it to the visible items list
5. Click **Save**
6. The "Discussion Hub" link now appears in course navigation

### Option B: External Tool Assignment

1. Go to a test course
2. Create a new **Assignment**
3. Set **Submission Type** to **External Tool**
4. Click **Find** and select "TCC Discussion Hub"
5. Save the assignment

---

## Step 6: Test the Integration

1. As an **instructor**, click the Discussion Hub link
2. Verify you see the instructor dashboard
3. Create a test discussion topic
4. In a different browser (or incognito), log in as a **test student**
5. Access the Discussion Hub from the student view
6. Verify the student can:
   - See discussion topics
   - Create posts
   - Upload media
   - Reply to other posts
7. Return to instructor view and verify:
   - Student posts appear
   - Analytics show activity
   - Grades can be synced to Canvas gradebook

---

## Step 7: Deploy to Additional Courses

Once testing is complete, instructors can enable the tool in their courses:

### Self-Service (Instructors)
Instructors can add the tool to their own course navigation:
1. Course **Settings** → **Navigation**
2. Enable "Discussion Hub"

### Admin Deployment (All Courses)
To enable for all courses in a sub-account:
1. **Admin** → **Sub-Account** → **Settings**
2. **Apps** tab → **View App Configurations**
3. Click **+ App**
4. **Configuration Type**: By Client ID
5. Enter the Client ID from Step 2
6. Submit

---

## Troubleshooting

### "Tool launch failed" or blank screen

**Check:** Developer Key is ON
**Check:** All URLs in Developer Key configuration are correct
**Check:** Server is accessible (visit base URL in browser)

### "Refused to display in a frame"

**Check:** Server's Content-Security-Policy header allows Canvas
```
frame-ancestors 'self' https://tccd.instructure.com https://*.instructure.com
```

### User shows as "Unknown" or no email

**Check:** Privacy Level is set to "Public" in Developer Key

### Grades not syncing to Canvas

**Check:** LTI Advantage Services are all enabled
**Check:** Assignment was created via External Tool (not just link)

### "Invalid state" error

**Check:** Cookies are enabled in browser
**Check:** Server session configuration allows cross-site cookies

---

## Canvas API Endpoints Reference

For the Discussion Hub server configuration, these are the TCCD Canvas endpoints:

| Purpose | URL |
|---------|-----|
| Platform Issuer | `https://tccd.instructure.com` |
| Authorization | `https://tccd.instructure.com/api/lti/authorize_redirect` |
| Token | `https://tccd.instructure.com/login/oauth2/token` |
| JWKS | `https://tccd.instructure.com/api/lti/security/jwks` |

---

## Security Notes

- The Developer Key credentials should be treated as sensitive
- The Public JWK URL from the Discussion Hub server allows Canvas to verify responses
- All communication happens over HTTPS
- User authentication is handled entirely by Canvas — the Discussion Hub never sees passwords

---

## Support Contacts

**Discussion Hub Technical Issues:**
[Department Contact] — [email]

**Canvas Administration:**
[Canvas Admin] — [email]

**IT Infrastructure:**
[IT Contact] — [email]
