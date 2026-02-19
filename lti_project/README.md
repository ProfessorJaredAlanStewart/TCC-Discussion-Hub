# TCC Discussion Hub

A Canvas LTI-integrated discussion board designed to enhance student engagement in online courses at Tarrant County College.

## Features

### Core Discussion Features
- 🎥 **Video & Audio Responses** — Students can record multimedia directly in the browser
- 📊 **Multiple Milestones** — Separate due dates for initial posts, peer responses, and reflections
- 📈 **Auto-Grading** — Automatic participation tracking with Canvas grade sync
- 💬 **Modern Interface** — Social media-style card layout that increases engagement
- 🔐 **Canvas Integration** — Single sign-on via LTI 1.3, no separate accounts needed

### Instructor Tools
- 🎬 **Video Prompts** — Record or upload video instructions for discussion topics
- 📊 **Quick Polls** — Create compact poll cards to gauge student understanding
- 📈 **Engagement Insights** — Harmonize-style analytics dashboard with:
  - Outreach suggestions for at-risk students
  - Activity over time tracking
  - 5-category performance metrics (Requirements, Quantity, Timing, Content, Connectedness)
  - Outreach logging system
- 🔍 **Academic Integrity Checker** — 19 detection methods + web plagiarism search
- 📤 **Canvas Assignment Sync** — Create gradebook assignments and sync grades

### Student Experience
- 📝 **Rich Text Editor** — Format posts with ease
- 🎤 **Media Recording** — Built-in video/audio recording
- 😀 **Reactions** — Like and "Insightful" reactions on posts
- 📅 **Milestone Tracking** — Visual progress toward deadlines
- 🗳️ **Poll Voting** — Quick polls with instant results

## Project Structure

```
tcc-discussion-hub/
├── docs/
│   ├── IT_Integration_Request.md    # Submit to IT department
│   ├── Technical_Specifications.md   # Detailed tech specs for IT
│   └── Canvas_LTI_Setup_Guide.md     # Canvas admin instructions
├── src/
│   ├── server.js                     # Main application server
│   ├── migrate.js                    # Database migration script
│   └── public/
│       └── index.html                # Frontend application
├── .env.example                      # Environment template
├── package.json                      # Node.js dependencies
└── README.md                         # This file
```

## Quick Start (Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 14+

### Setup

1. Clone the repository:
```bash
git clone https://github.com/tccd/discussion-hub.git
cd discussion-hub
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Run database migrations:
```bash
npm run migrate
```

5. Start the development server:
```bash
npm run dev
```

6. For LTI testing, you'll need:
   - HTTPS (use ngrok or similar for local development)
   - Canvas Developer Key configured to point to your tunnel URL

## Deployment

See `docs/Technical_Specifications.md` for complete deployment instructions.

### Quick Deploy Steps

1. **Server Setup**
   - Ubuntu 22.04+ or RHEL 8+
   - Node.js 18 LTS
   - PostgreSQL 14+
   - Nginx (reverse proxy)
   - SSL certificate

2. **Application**
   ```bash
   # Copy files to server
   scp -r . user@server:/var/www/discussionhub/
   
   # On server
   cd /var/www/discussionhub
   npm install --production
   cp .env.example .env
   # Edit .env with production values
   npm run migrate
   pm2 start src/server.js --name discussionhub
   ```

3. **Canvas Configuration**
   - Create LTI Developer Key (see `docs/Canvas_LTI_Setup_Guide.md`)
   - Add Client ID to `.env`
   - Enable tool in courses

## Documentation

| Document | Audience | Purpose |
|----------|----------|---------|
| [IT Integration Request](docs/IT_Integration_Request.md) | IT Leadership | Project overview, business case |
| [Technical Specifications](docs/Technical_Specifications.md) | IT Infrastructure | Server setup, security, maintenance |
| [Canvas LTI Setup Guide](docs/Canvas_LTI_Setup_Guide.md) | Canvas Admin | LTI configuration steps |

## API Reference

### Authentication
All API endpoints require a valid LTI session (established via Canvas launch).

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user` | Current user info |
| GET | `/api/topics` | List discussion topics |
| GET | `/api/topics/:id` | Get topic with milestones |
| POST | `/api/topics` | Create topic (instructor) |
| GET | `/api/topics/:id/posts` | Get posts for topic |
| POST | `/api/topics/:id/posts` | Create new post |
| POST | `/api/posts/:id/reactions` | Toggle like/insightful |
| GET | `/api/topics/:id/grades` | Student grades (instructor) |

## Security

- **Authentication**: Canvas LTI 1.3 (no local passwords)
- **Authorization**: Role-based (student/instructor from Canvas)
- **Data**: All student data stays on TCC infrastructure
- **Encryption**: TLS 1.3 required, database encryption optional
- **Compliance**: FERPA-ready design

## Contributing

This is an internal TCC project. Contact the Social Sciences Department for access.

## License

MIT License - See LICENSE file

## Support

**Project Lead**: [Department Chair]
**Department**: Social Sciences
**Email**: [email]
