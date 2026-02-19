# TCC Discussion Hub - Technical Specifications

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Server Requirements](#server-requirements)
3. [Installation Procedures](#installation-procedures)
4. [Database Schema](#database-schema)
5. [API Documentation](#api-documentation)
6. [Security Specifications](#security-specifications)
7. [Backup Procedures](#backup-procedures)
8. [Monitoring & Logging](#monitoring--logging)

---

## 1. System Architecture

### 1.1 Component Overview

```
                                    ┌─────────────────┐
                                    │    Nginx        │
                                    │  (Reverse Proxy │
                                    │   + SSL Term)   │
                                    └────────┬────────┘
                                             │ :443
                                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Node.js Application                       │
│                            Port 3000                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   LTI 1.3   │  │   REST API  │  │   Static    │             │
│  │   Handler   │  │   Routes    │  │   Files     │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Session   │  │   File      │  │   Auto      │             │
│  │   Manager   │  │   Upload    │  │   Grader    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
         │                                       │
         ▼                                       ▼
┌─────────────────┐                   ┌─────────────────┐
│   PostgreSQL    │                   │   File System   │
│    Database     │                   │   (Uploads)     │
│    Port 5432    │                   │                 │
└─────────────────┘                   └─────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| Web Server | Nginx | 1.18+ | Reverse proxy, SSL termination, static files |
| Runtime | Node.js | 18 LTS | Application server |
| Framework | Express.js | 4.x | HTTP routing and middleware |
| Database | PostgreSQL | 14+ | Data persistence |
| Process Manager | PM2 | Latest | Process management, clustering |
| SSL | Let's Encrypt | N/A | TLS certificates |

### 1.3 External Dependencies

| Dependency | Purpose | Required |
|------------|---------|----------|
| Canvas LMS | Authentication, grade sync | Yes |
| Let's Encrypt / TCC CA | SSL certificates | Yes |
| SMTP Server (optional) | Email notifications | No |

---

## 2. Server Requirements

### 2.1 Hardware Specifications

**Minimum (Pilot - up to 5 courses, 150 students):**
| Resource | Specification |
|----------|---------------|
| CPU | 2 vCPU |
| RAM | 4 GB |
| Storage | 50 GB SSD |
| Network | 100 Mbps |

**Recommended (Production - up to 50 courses, 1500 students):**
| Resource | Specification |
|----------|---------------|
| CPU | 4 vCPU |
| RAM | 8 GB |
| Storage | 200 GB SSD |
| Network | 1 Gbps |

**Storage Calculation:**
- Base application: ~500 MB
- Database (per 1000 posts): ~100 MB
- Media uploads (per course/semester): ~2-5 GB
- Recommended: Plan for 5 GB per active course

### 2.2 Software Requirements

```bash
# Operating System
Ubuntu 22.04 LTS (recommended)
# OR
RHEL 8 / CentOS Stream 8

# Required Packages
- nodejs (18.x LTS)
- npm (included with Node.js)
- postgresql (14+)
- nginx (1.18+)
- certbot (for Let's Encrypt)
- pm2 (via npm)

# Optional Packages
- fail2ban (security)
- ufw (firewall)
- htop (monitoring)
```

### 2.3 Network Configuration

**Required DNS Record:**
```
discussionhub.tccd.edu    A    [server IP address]
```

**Required Firewall Rules:**
| Direction | Port | Protocol | Source | Purpose |
|-----------|------|----------|--------|---------|
| Inbound | 443 | TCP | Any | HTTPS access |
| Inbound | 22 | TCP | TCC Admin IPs | SSH management |
| Internal | 5432 | TCP | localhost | PostgreSQL |
| Internal | 3000 | TCP | localhost | Node.js app |

---

## 3. Installation Procedures

### 3.1 Server Preparation

```bash
#!/bin/bash
# Run as root or with sudo

# Update system
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify installation
node --version  # Should show v18.x.x
npm --version   # Should show 9.x.x or higher

# Install PostgreSQL
apt install -y postgresql postgresql-contrib

# Install Nginx
apt install -y nginx

# Install Certbot
apt install -y certbot python3-certbot-nginx

# Install PM2 globally
npm install -g pm2

# Create application user
useradd -m -s /bin/bash discussionhub
```

### 3.2 Database Setup

```bash
# Switch to postgres user
sudo -u postgres psql

-- Create database
CREATE DATABASE discussionhub;

-- Create user with secure password
CREATE USER discussionhub_app WITH ENCRYPTED PASSWORD 'GENERATE_SECURE_PASSWORD';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE discussionhub TO discussionhub_app;

-- Enable required extensions
\c discussionhub
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
```

### 3.3 Application Deployment

```bash
# Create directory structure
mkdir -p /var/www/discussionhub
mkdir -p /var/www/discussionhub/uploads
mkdir -p /var/www/discussionhub/logs

# Set ownership
chown -R discussionhub:discussionhub /var/www/discussionhub

# Switch to application user
su - discussionhub
cd /var/www/discussionhub

# Copy application files (from provided package)
# tar -xzf discussionhub-v1.0.tar.gz

# Install dependencies
npm install --production

# Copy environment template
cp .env.example .env

# Edit configuration (see Section 3.4)
nano .env

# Run database migrations
npm run migrate

# Start application with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### 3.4 Environment Configuration

Create `/var/www/discussionhub/.env`:

```env
# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================
NODE_ENV=production
PORT=3000
BASE_URL=https://discussionhub.tccd.edu

# =============================================================================
# DATABASE
# =============================================================================
DATABASE_URL=postgresql://discussionhub_app:PASSWORD@localhost:5432/discussionhub

# =============================================================================
# SESSION SECURITY
# Generate with: openssl rand -hex 32
# =============================================================================
SESSION_SECRET=GENERATE_64_CHAR_HEX_STRING

# =============================================================================
# LTI 1.3 CONFIGURATION
# Values provided by Canvas administrator after Developer Key creation
# =============================================================================
LTI_CLIENT_ID=
LTI_DEPLOYMENT_ID=
LTI_PLATFORM_URL=https://tccd.instructure.com
LTI_AUTH_URL=https://tccd.instructure.com/api/lti/authorize_redirect
LTI_TOKEN_URL=https://tccd.instructure.com/login/oauth2/token
LTI_KEYSET_URL=https://tccd.instructure.com/api/lti/security/jwks

# =============================================================================
# FILE STORAGE
# =============================================================================
UPLOAD_DIR=/var/www/discussionhub/uploads
MAX_FILE_SIZE=10485760
MAX_VIDEO_SIZE=104857600

# =============================================================================
# LOGGING
# =============================================================================
LOG_LEVEL=info
LOG_DIR=/var/www/discussionhub/logs
```

### 3.5 Nginx Configuration

Create `/etc/nginx/sites-available/discussionhub`:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name discussionhub.tccd.edu;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    server_name discussionhub.tccd.edu;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/discussionhub.tccd.edu/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/discussionhub.tccd.edu/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # Security Headers
    add_header X-Frame-Options "ALLOW-FROM https://tccd.instructure.com" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Content Security Policy (allows Canvas iframe embedding)
    add_header Content-Security-Policy "frame-ancestors 'self' https://tccd.instructure.com https://*.instructure.com;" always;

    # File upload limit
    client_max_body_size 100M;

    # Logging
    access_log /var/log/nginx/discussionhub_access.log;
    error_log /var/log/nginx/discussionhub_error.log;

    # Proxy to Node.js application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Serve uploaded files directly
    location /uploads {
        alias /var/www/discussionhub/uploads;
        expires 7d;
        add_header Cache-Control "public, immutable";
        
        # Security: prevent script execution
        location ~* \.(php|jsp|cgi|pl|py)$ {
            deny all;
        }
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        access_log off;
    }
}
```

Enable the site:
```bash
ln -s /etc/nginx/sites-available/discussionhub /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 3.6 SSL Certificate

```bash
# Using Let's Encrypt (if publicly accessible)
certbot --nginx -d discussionhub.tccd.edu

# OR using TCC's internal CA
# Place certificate files at:
# /etc/ssl/certs/discussionhub.tccd.edu.crt
# /etc/ssl/private/discussionhub.tccd.edu.key
# Update Nginx config accordingly
```

---

## 4. Database Schema

### 4.1 Entity Relationship Diagram

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    USERS     │     │   COURSES    │     │ ENROLLMENTS  │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id (PK)      │──┐  │ id (PK)      │──┐  │ id (PK)      │
│ canvas_id    │  │  │ canvas_id    │  │  │ user_id (FK) │──┐
│ email        │  │  │ name         │  └──│ course_id(FK)│  │
│ display_name │  │  │ created_at   │     │ role         │  │
│ avatar_url   │  │  └──────────────┘     └──────────────┘  │
└──────────────┘  │                                         │
                  │  ┌──────────────┐                       │
                  │  │    TOPICS    │                       │
                  │  ├──────────────┤                       │
                  │  │ id (PK)      │                       │
                  └──│ course_id(FK)│                       │
                     │ title        │                       │
                     │ prompt       │                       │
                     │ points       │                       │
                     │ created_by   │───────────────────────┘
                     └──────┬───────┘
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  MILESTONES  │   │    POSTS     │   │    GRADES    │
├──────────────┤   ├──────────────┤   ├──────────────┤
│ id (PK)      │   │ id (PK)      │   │ id (PK)      │
│ topic_id(FK) │   │ topic_id(FK) │   │ topic_id(FK) │
│ name         │   │ user_id (FK) │   │ user_id (FK) │
│ due_date     │   │ parent_id    │   │ auto_grade   │
│ points       │   │ content      │   │ final_grade  │
└──────────────┘   │ word_count   │   │ synced       │
                   └──────┬───────┘   └──────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ ATTACHMENTS  │  │  REACTIONS   │  │   (replies)  │
├──────────────┤  ├──────────────┤  │   (self-ref) │
│ id (PK)      │  │ id (PK)      │  └──────────────┘
│ post_id (FK) │  │ post_id (FK) │
│ type         │  │ user_id (FK) │
│ filename     │  │ type         │
│ storage_path │  └──────────────┘
└──────────────┘
```

### 4.2 Full Schema SQL

See `migrations/001_initial_schema.sql` in the application package.

---

## 5. API Documentation

### 5.1 Authentication

All API endpoints require valid session established via LTI launch.

**Session Cookie:** `connect.sid` (httpOnly, secure, sameSite=none)

### 5.2 Endpoints

#### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Get current user info |

#### Topics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/topics` | List topics for current course |
| GET | `/api/topics/:id` | Get topic with milestones |
| POST | `/api/topics` | Create topic (instructor) |
| PATCH | `/api/topics/:id` | Update topic (instructor) |

#### Posts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/topics/:id/posts` | Get posts for topic |
| POST | `/api/topics/:id/posts` | Create new post |
| PATCH | `/api/posts/:id` | Edit post (author only) |
| DELETE | `/api/posts/:id` | Delete post (author/instructor) |

#### Reactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/posts/:id/reactions` | Toggle reaction |

#### Grades (Instructor)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/topics/:id/grades` | Get all student grades |
| PATCH | `/api/topics/:id/grades/:userId` | Adjust grade |
| POST | `/api/topics/:id/sync-grades` | Sync to Canvas |

#### File Upload
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/upload` | Upload file attachment |

#### Academic Integrity (Instructor)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/posts/:id/integrity` | Get integrity analysis for post |
| POST | `/api/posts/:id/integrity/deep` | Run AI-powered deep analysis |

### 5.3 Academic Integrity System

The Discussion Hub includes a comprehensive built-in academic integrity checker with 19 detection methods:

#### Heuristic Analysis (Client-Side)

**AI Writing Detection:**
1. Sentence length uniformity — AI tends to write more uniformly than humans
2. AI phrase detection — Identifies common AI-generated phrases ("it is important to note", etc.)
3. Paragraph structure uniformity — Checks for suspiciously uniform paragraph lengths
4. Hedging language analysis — Detects excessive hedging typical of AI
5. Transition word overuse — AI overuses words like "however", "furthermore", "moreover"
6. Overly formal style — Detects absence of contractions with no personal voice

**Copied Content Detection:**
7. Repetitive phrase detection — Catches choruses/verses repeated 3+ times
8. Known lyrics indicators — Detects "la-da", "na na", famous song phrases
9. Poetic structure analysis — Many short phrases typical of lyrics/poetry
10. Rhetorical questions — Multiple questions without analytical discussion

**Academic Standards:**
11. Analytical language check — Presence of "because", "therefore", "for example"
12. Personal voice markers — "I think", "I believe", "in my opinion"
13. Topic relevance scoring — Keyword overlap with discussion prompt
14. Citation detection — Checks for proper source attribution

**Plagiarism Detection:**
15. Same-class similarity — N-gram comparison across all posts in discussion
16. Self-plagiarism — Compares against student's own posts in other topics
17. Essay mill indicators — Detects academic paper formatting phrases

**Writing Quality Metrics:**
18. Lexical diversity (TTR) — Type-token ratio analysis
19. Vocabulary sophistication — Unusually advanced academic terms

#### Deep Analysis (Optional Claude API)
- AI-powered content analysis for sophisticated detection
- Returns confidence score, identified indicators, and recommendations
- Instructor-only access with appropriate disclaimers

#### Web Plagiarism Search (Optional Claude API)
- Searches the internet for copied content using Claude's web search
- Detects Wikipedia, news articles, blog posts, and other online sources
- Returns source URLs, match confidence, and matched text excerpts
- Falls back to manual search links (Google, Wikipedia) if API unavailable

#### Risk Scoring
| Risk Level | Criteria |
|------------|----------|
| Low (✓ Clear) | Risk score <35%, similarity <30% |
| Medium (⚡ Review) | Risk score 35-60% OR similarity 30-50% |
| High (⚠️ Flagged) | Risk score >60% OR similarity >50% |

#### Report Export
- Individual post reports (downloadable .txt)
- Batch summary reports with all flagged posts
- CSV-formatted student summary for grade import

---

## 5.4 Canvas Assignment Integration

The Discussion Hub integrates with Canvas via LTI 1.3 Assignment & Grade Services (AGS) to create assignments and sync grades.

### Creating Canvas Assignments

When an instructor clicks "Create Canvas Assignment" in the topic editor:

1. **Deep Linking Request** — Tool sends assignment details to Canvas
2. **Line Item Creation** — Canvas creates a gradebook column
3. **Resource Link** — Discussion topic linked to Canvas assignment
4. **Student Access** — Students see discussion in Canvas modules/assignments

### Grade Passback Flow

```
Discussion Hub                    Canvas LMS
     │                                │
     │  1. Calculate student grades   │
     │                                │
     │  2. POST /scores               │
     │ ─────────────────────────────► │
     │    (LTI AGS Score Service)     │
     │                                │
     │  3. Grades appear in           │
     │     Canvas gradebook           │
     │                                │
```

### Required LTI Services

| Service | Scope | Purpose |
|---------|-------|---------|
| Line Items | `lineitem` | Create/manage assignments |
| Scores | `score` | Submit grades to gradebook |
| Results | `result` | Read existing grades (optional) |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/canvas/create-assignment` | POST | Create Canvas assignment from topic |
| `/api/canvas/sync-grades` | POST | Send grades to Canvas gradebook |

### Grade Calculation

Default auto-grading formula:
- **Initial Post (40%)** — Based on word count meeting minimum
- **Peer Replies (40%)** — Requires 2 substantive replies
- **Engagement (20%)** — Bonus for exceeding requirements

Instructors can manually adjust grades before syncing to Canvas.

---

## 5.5 Polling System

Instructors can create quick polls to gauge student understanding or opinions.

### Poll Features

| Feature | Description |
|---------|-------------|
| **Compact Card Display** | Polls appear as small, clickable cards showing question, vote count, and mini progress bars |
| **Click to Expand** | Full voting modal opens when card is clicked |
| **Multiple Choice** | Support for 2+ options per poll |
| **Allow Multiple** | Optional setting to let students select multiple options |
| **Show/Hide Results** | Control whether students see results before voting |
| **Topic Association** | Each poll is linked to a specific discussion topic |

### Poll Management (Instructor)

Located in **Manage Topics** tab:
- View all polls across topics
- Create new polls with topic selector
- Open/close polls
- Delete polls
- See vote counts per poll

### Data Structure

```javascript
{
    id: Number,
    topicId: Number,
    question: String,
    options: [{ id, text, votes, voters[] }],
    createdAt: DateTime,
    createdBy: String,
    allowMultiple: Boolean,
    showResults: Boolean,
    active: Boolean
}
```

---

## 5.6 Video Prompt Instructions

Instructors can record or upload video instructions instead of text prompts.

### Creating Video Prompts

Available in both:
1. **Quick Create Modal** (+ New button)
2. **Manage Topics** tab full form

### Options

| Method | Description |
|--------|-------------|
| **🎥 Record Video** | Use webcam to record live instructions |
| **📁 Upload Video** | Upload existing video file |

### Recording Interface

- Live preview while recording
- Timer display (MM:SS)
- Stop button to end recording
- Preview before saving
- Remove/re-record option

### Display

When students view the discussion:
- Video appears prominently at top with dark cinema-style frame
- Full playback controls
- Text summary below for accessibility

### Technical Notes

- Format: WebM (recorded) or uploaded format
- Storage: Blob URLs in demo mode; server storage in production
- Accessibility: Text summary required/recommended

---

## 5.7 Engagement Insights Dashboard

The **Engagement Insights** tab provides Harmonize-style student analytics.

### Layout

```
┌─────────────────────────────────────────────────────────────┐
│  Left Sidebar (280px)    │    Right Panel (flex)           │
├──────────────────────────┼──────────────────────────────────┤
│  🔍 Search Students      │                                  │
│  ─────────────────────   │    Student Detail View           │
│  ⚠️ Outreach Suggestions │    - Header with navigation      │
│  - High risk students    │    - Tabs: Topics | Activity |   │
│  - "NEW" badges          │            Outreach              │
│  ─────────────────────   │    - Performance cards           │
│  All Students (30)       │    - Activity charts             │
│  - Click to select       │    - Outreach log                │
│  - Status indicators     │                                  │
└──────────────────────────┴──────────────────────────────────┘
```

### Student Status Levels

| Status | Score | Color | Description |
|--------|-------|-------|-------------|
| **High** | 80+ | Green | Exceeding expectations |
| **Medium** | 50-79 | Yellow | Meeting basic requirements |
| **Low** | 1-49 | Red | Needs attention |
| **No Activity** | 0 | Gray | No participation yet |

### Engagement Score Calculation

```javascript
let score = 0;
if (totalPosts > 0) score += 40;           // Has initial post
if (totalReplies >= 2) score += 30;        // Met reply requirement
else if (totalReplies >= 1) score += 15;   // Partial credit
if (avgWordCount >= 200) score += 20;      // Quality posts
else if (avgWordCount >= 100) score += 10; // Partial credit
score += Math.min(10, totalPosts * 2);     // Bonus for extra posts
```

### Student Detail Tabs

#### Active Topics Tab
- Performance cards for each discussion
- 5-category breakdown bars:
  - **Requirements** — Completes all assignment components
  - **Quantity** — Frequency of participation
  - **Timing** — Submits early vs. last minute
  - **Content** — Quality of posts and comments
  - **Connectedness** — Interaction with peers
- Grade display per topic
- Click to navigate to topic

#### Activity Over Time Tab
- Bar chart showing weekly engagement
- Stats cards: Total Posts, Total Replies, Avg. Words

#### Outreach Log Tab
- Record contact with students
- Log types: Email, Phone, In-person, Canvas Message
- Timestamped history
- Notes field for each contact

### Outreach Suggestions

Students flagged for outreach when:
- Engagement score < 50
- Last activity not "Today"

Displayed with red highlighting and "NEW" badge.

---

## 6. Security Specifications

### 6.1 Authentication & Authorization

- **No local accounts** — All authentication via Canvas LTI
- **JWT validation** — Canvas tokens verified against JWKS endpoint
- **Role enforcement** — Instructor-only endpoints protected server-side
- **Session security** — HttpOnly, Secure, SameSite cookies

### 6.2 Input Validation

- **Content sanitization** — All user input HTML-escaped
- **File validation** — MIME type verification, filename sanitization
- **Size limits** — Enforced at Nginx and application levels
- **SQL injection prevention** — Parameterized queries only

### 6.3 Data Protection

- **TLS 1.2/1.3** — All connections encrypted
- **Database encryption** — PostgreSQL with encrypted storage (optional)
- **Secure file storage** — Upload directory outside web root

---

## 7. Backup Procedures

### 7.1 Automated Backup Script

```bash
#!/bin/bash
# /usr/local/bin/backup-discussionhub.sh

BACKUP_DIR="/var/backups/discussionhub"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
PGPASSWORD='dbpassword' pg_dump -h localhost -U discussionhub_app discussionhub | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Uploads backup (incremental)
rsync -av --link-dest=$BACKUP_DIR/uploads_latest /var/www/discussionhub/uploads/ $BACKUP_DIR/uploads_$DATE/
rm -f $BACKUP_DIR/uploads_latest
ln -s $BACKUP_DIR/uploads_$DATE $BACKUP_DIR/uploads_latest

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete
find $BACKUP_DIR -maxdepth 1 -name "uploads_*" -type d -mtime +30 -exec rm -rf {} \;

echo "Backup completed: $DATE"
```

### 7.2 Cron Schedule

```bash
# Add to root crontab
0 2 * * * /usr/local/bin/backup-discussionhub.sh >> /var/log/discussionhub-backup.log 2>&1
```

---

## 8. Monitoring & Logging

### 8.1 Health Check Endpoint

```
GET https://discussionhub.tccd.edu/health

Response:
{
  "status": "healthy",
  "database": "connected",
  "uptime": 86400,
  "version": "1.0.0"
}
```

### 8.2 Log Locations

| Log | Location | Rotation |
|-----|----------|----------|
| Application | `/var/www/discussionhub/logs/app.log` | Daily, 14 days |
| Nginx Access | `/var/log/nginx/discussionhub_access.log` | Weekly, 4 weeks |
| Nginx Error | `/var/log/nginx/discussionhub_error.log` | Weekly, 4 weeks |
| PM2 | `pm2 logs` | PM2 managed |

### 8.3 Monitoring Recommendations

- **Uptime:** Monitor `/health` endpoint (5-minute intervals)
- **Disk space:** Alert at 80% capacity
- **Memory:** Alert at 90% utilization
- **Error rate:** Monitor Nginx 5xx errors

---

## Appendix: Troubleshooting

| Symptom | Possible Cause | Solution |
|---------|---------------|----------|
| LTI launch fails | Invalid credentials | Verify LTI_CLIENT_ID in .env |
| "Refused to display in frame" | CSP header | Check Nginx X-Frame-Options |
| Uploads fail | Size limit | Increase client_max_body_size |
| 502 Bad Gateway | App crashed | Check `pm2 status`, restart |
| Slow performance | Database | Check pg_stat_activity, add indexes |
| SSL errors | Certificate | Run `certbot renew` |
