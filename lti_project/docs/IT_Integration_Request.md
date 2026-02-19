# TCC Discussion Hub - Canvas LTI Integration Request

## Executive Summary

The Social Sciences Department is requesting IT support to deploy **TCC Discussion Hub**, an internally-developed discussion board tool designed to enhance student engagement in online and hybrid courses. This tool replicates functionality of commercial products like Harmonize ($5,000+ annually) at no licensing cost to the College.

**Requested Action:** Deploy a Node.js web application on TCC infrastructure and configure it as an LTI 1.3 tool in Canvas.

---

## Business Justification

### Problem Statement
Canvas's native discussion boards lack features that research shows improve student engagement:
- No support for video/audio responses
- No milestone-based deadlines
- Limited analytics for instructors
- Text-heavy interface discourages participation

### Proposed Solution
TCC Discussion Hub provides:
- **Multimedia discussions** — Students can record video/audio responses
- **Multiple milestones** — Separate due dates for initial posts, replies, and reflections
- **Auto-grading** — Automatic participation tracking and grade calculation
- **Rich analytics** — Instructor dashboard showing engagement patterns
- **Modern interface** — Social media-style card layout increases participation

### Cost Comparison
| Solution | Annual Cost | Notes |
|----------|-------------|-------|
| Harmonize | $5,000 - $15,000 | Per-institution licensing |
| Packback | $25/student | ~$750/class/semester |
| TCC Discussion Hub | $0 | Internally developed, self-hosted |

---

## Technical Requirements

### Server Requirements

| Component | Minimum Specification |
|-----------|----------------------|
| **Operating System** | Ubuntu 20.04+ or RHEL 8+ |
| **Runtime** | Node.js 18 LTS or higher |
| **Database** | PostgreSQL 13+ (recommended) or MySQL 8+ |
| **Memory** | 2 GB RAM minimum |
| **Storage** | 50 GB (expandable for media storage) |
| **SSL Certificate** | Required for LTI 1.3 |

### Network Requirements

| Requirement | Details |
|-------------|---------|
| **Domain** | Subdomain needed (e.g., `discussionhub.tccd.edu`) |
| **HTTPS** | Required — LTI 1.3 mandates secure connections |
| **Ports** | 443 (HTTPS), 5432 (PostgreSQL internal) |
| **Firewall** | Allow inbound HTTPS from Canvas servers |

### Canvas Admin Requirements

| Configuration | Details |
|---------------|---------|
| **LTI Version** | LTI 1.3 / LTI Advantage |
| **Developer Key** | Must be created in Canvas Admin |
| **Placement** | Course Navigation + Assignment Selection |
| **Privacy Level** | Public (to receive user identity) |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         STUDENT/INSTRUCTOR                       │
│                              BROWSER                             │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                         CANVAS LMS                               │
│                    (canvas.tccd.edu)                            │
│  ┌─────────────────┐    ┌─────────────────┐                     │
│  │  LTI Launch     │───▶│  JWT Token      │                     │
│  │  (OAuth 2.0)    │    │  Generation     │                     │
│  └─────────────────┘    └─────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼ HTTPS POST (signed JWT)
┌─────────────────────────────────────────────────────────────────┐
│                    TCC DISCUSSION HUB                            │
│                 (discussionhub.tccd.edu)                        │
│                                                                  │
│  ┌─────────────────┐    ┌─────────────────┐    ┌──────────────┐│
│  │  Node.js        │───▶│  PostgreSQL     │    │  File        ││
│  │  Application    │    │  Database       │    │  Storage     ││
│  │  (Express)      │    │                 │    │  (Media)     ││
│  └─────────────────┘    └─────────────────┘    └──────────────┘│
│                                                                  │
│  Features:                                                       │
│  • LTI 1.3 Authentication    • Real-time Updates                │
│  • Video/Audio Recording     • Auto-grading                     │
│  • Grade Passback to Canvas  • Analytics Dashboard              │
│  • AI/Plagiarism Detection   • Edit History Tracking            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow & Privacy

### Data Received from Canvas (via LTI)
- User ID (Canvas internal ID)
- User name and email
- Course ID and name
- User role (student/instructor)
- Assignment ID (if launched from assignment)

### Data Stored by Discussion Hub
- Discussion posts and replies
- Uploaded media files (video, audio, images)
- Timestamps and participation records
- Calculated grades

### Data Sent Back to Canvas
- Assignment grades (via LTI Assignment and Grade Services)
- Submission timestamps

### Privacy Compliance
- **FERPA:** All student data remains on TCC infrastructure
- **Data Retention:** Configurable retention policies
- **No Third Parties:** No data shared with external services
- **Encryption:** All data encrypted in transit (TLS 1.3) and at rest

---

## Implementation Timeline

| Phase | Duration | Activities |
|-------|----------|------------|
| **Phase 1: Setup** | 1 week | Server provisioning, domain configuration, SSL certificate |
| **Phase 2: Deployment** | 1 week | Application deployment, database setup, initial testing |
| **Phase 3: Canvas Config** | 2-3 days | LTI Developer Key creation, tool installation |
| **Phase 4: Pilot** | 2 weeks | Limited pilot with 1-2 courses |
| **Phase 5: Rollout** | Ongoing | Gradual expansion to additional courses |

---

## Support & Maintenance

### Initial Support Needed from IT
1. Server provisioning and configuration
2. Domain and SSL certificate setup
3. Canvas Admin access for LTI configuration
4. Database creation and credentials

### Ongoing Maintenance
| Task | Frequency | Responsibility |
|------|-----------|----------------|
| Application updates | As needed | Department/Developer |
| Server patches | Monthly | IT |
| Database backups | Daily (automated) | IT |
| SSL certificate renewal | Annual | IT |
| Monitoring | Continuous | IT (existing tools) |

---

## Contacts

**Project Sponsor:** [Department Chair Name]  
**Department:** Social Sciences  
**Email:** [email]  
**Phone:** [phone]  

**Technical Questions:** [Developer/Technical Contact]

---

## Appendices

- **Appendix A:** Detailed technical specifications (see `Technical_Specifications.md`)
- **Appendix B:** Canvas LTI configuration guide (see `Canvas_LTI_Setup_Guide.md`)
- **Appendix C:** Application source code (see `/src` directory)
- **Appendix D:** Working proof-of-concept demonstration (see `demo.html`)

---

## Approval Signatures

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Department Chair | | | |
| Division Dean | | | |
| IT Security Review | | | |
| IT Infrastructure | | | |
| Canvas Administrator | | | |
