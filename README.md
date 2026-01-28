# 💬 TCC Discussion Hub

<div align="center">

![TCC Blue](https://img.shields.io/badge/TCC-Discussion%20Hub-006184?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Production%20Ready-success?style=for-the-badge)

**A modern, multimedia-rich discussion board platform built for Tarrant County College**

[🚀 Live Demo](https://professorjaredalanstewart.github.io/TCC-Discussion-Hub/tcc_discussion_hub_final.html) • [📖 Documentation](#documentation) • [⚙️ Installation](#installation)

</div>

---

## ✨ Features

### For Students
| Feature | Description |
|---------|-------------|
| 📝 **Rich Text Posts** | Create thoughtful responses with word count tracking |
| 🎥 **Video Responses** | Record and embed video directly in posts |
| 🎤 **Audio Responses** | Record voice responses for accessibility |
| 📎 **File Attachments** | Upload images, documents, and media |
| 💬 **Threaded Replies** | Engage in meaningful peer discussions |
| 👍 **Reactions** | Like and mark posts as "Insightful" |
| 📊 **Progress Tracking** | Visual milestone completion status |
| ✏️ **Edit Posts** | Revise your work with full edit history |

### For Instructors
| Feature | Description |
|---------|-------------|
| ⚙️ **Easy Setup** | Configure your profile, photo, and course details |
| 📚 **Topic Management** | Create multi-milestone discussion assignments |
| 📈 **Analytics Dashboard** | Real-time participation and engagement metrics |
| 👥 **Student Progress** | Track individual student completion and grades |
| 🤖 **Auto-Grading** | Configurable automatic grade calculation |
| 🔍 **AI/Plagiarism Check** | Built-in academic integrity analysis for every post |
| 📜 **Edit History** | View complete revision history for any post |
| 📥 **Grade Export** | Export grades to CSV for Canvas import |
| 🔔 **Notifications** | Deadline reminders and at-risk student alerts |

---

## 🔍 Academic Integrity Checker

A comprehensive built-in tool to help instructors identify potentially problematic submissions.

### Detection Methods (19 Total)
| Category | Checks | Description |
|----------|--------|-------------|
| **AI Writing** | Sentence uniformity, AI phrases, paragraph structure, hedging language, transition overuse, formal style | Detects patterns typical of AI-generated content |
| **Copied Content** | Repeated phrases, known lyrics, poetic structure, rhetorical questions | Catches song lyrics, poems, and copy-pasted content |
| **Academic Standards** | Analytical language, personal voice, topic relevance, citations | Ensures submissions meet discussion expectations |
| **Plagiarism** | Same-class similarity, self-plagiarism, essay mill indicators | Compares against other posts and detects purchased content |
| **Writing Quality** | Lexical diversity, vocabulary sophistication, list usage | Analyzes writing characteristics |

### Features
- **🔍 One-Click Analysis** - Check any post instantly with 19 heuristic checks
- **📊 Batch Processing** - "Check All Posts" analyzes entire discussion
- **🎯 Risk Scoring** - Posts rated as Clear (✓), Review (⚡), or Flagged (⚠️)
- **🌐 Web Plagiarism Check** - Search the internet for copied content (Wikipedia, articles, etc.)
- **📄 Export Reports** - Download individual or summary reports
- **🔬 Deep Analysis** - Optional Claude API integration for AI-powered analysis
- **📈 Metrics Dashboard** - View detailed stats like lexical diversity, topic relevance

### Risk Levels
| Level | Score | Action |
|-------|-------|--------|
| ✅ Low Risk | <35% | No action needed |
| ⚠️ Medium Risk | 35-60% | Review recommended |
| 🚨 High Risk | >60% | Review required |

> ⚠️ **Important:** This tool uses heuristics and is not definitive. Always use professional judgment and speak with students before making academic integrity decisions.

---

## 🖼️ Screenshots

<details>
<summary><b>Click to view screenshots</b></summary>

### Student View
- Clean, card-based discussion interface
- Visual progress tracking for milestones
- Multimedia post creation with video/audio recording

### Instructor Dashboard
- Analytics with participation charts
- Student progress table with auto-grades
- Topic management with milestone configuration
- Profile and course setup

</details>

---

## 🚀 Quick Start

### Option 1: Standalone HTML (No Server Required)
Simply open `tcc_discussion_hub_final.html` in any modern web browser. Perfect for:
- Demonstrations and previews
- Evaluating features
- Local testing

### Option 2: Canvas LTI Integration (Recommended for Production)
See the [LTI Installation Guide](#canvas-lti-integration) below for full institutional deployment.

---

## 📁 Repository Contents

```
TCC-Discussion-Hub/
├── tcc_discussion_hub_final.html    # 🌐 Standalone demo (open in browser)
├── tcc_discussion_hub_lti_package.zip   # 📦 Full LTI server package
├── Canvas_LTI_Setup_Guide.md        # 📖 Canvas admin instructions
├── IT_Integration_Request.md        # 📋 IT department documentation
├── Technical_Specifications.md      # 🔧 Full technical specs
└── TCC_Discussion_Hub_IT_Request.docx   # 📄 Formal IT request document
```

---

## ⚙️ Installation

### Standalone Demo
```bash
# Clone the repository
git clone https://github.com/ProfessorJaredAlanStewart/TCC-Discussion-Hub.git

# Open the HTML file
open tcc_discussion_hub_final.html
# Or on Windows:
start tcc_discussion_hub_final.html
```

### Canvas LTI Integration

<details>
<summary><b>Full LTI Installation Instructions</b></summary>

#### Prerequisites
- Ubuntu 22.04+ server
- Node.js 18+
- PostgreSQL 14+
- Nginx
- SSL certificate
- Canvas Admin access

#### Server Setup
```bash
# Extract the LTI package
unzip tcc_discussion_hub_lti_package.zip
cd lti_project

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Run database migrations
npm run migrate

# Start the server
npm start
```

#### Canvas Configuration
1. Go to Canvas Admin → Developer Keys
2. Create new LTI Key with settings from `Canvas_LTI_Setup_Guide.md`
3. Deploy to courses via External Tools

See `IT_Integration_Request.md` for complete IT department documentation.

</details>

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Canvas LTI Setup Guide](Canvas_LTI_Setup_Guide.md) | Step-by-step Canvas admin instructions |
| [IT Integration Request](IT_Integration_Request.md) | Complete IT department documentation |
| [Technical Specifications](Technical_Specifications.md) | Full technical architecture and API docs |

---

## 💰 Cost Comparison

| Solution | Annual Cost | Notes |
|----------|-------------|-------|
| **TCC Discussion Hub** | **$0** | Self-hosted on existing infrastructure |
| Harmonize | $5,000 - $10,000 | Per-institution licensing |
| Yellowdig | $8,000 - $15,000 | Per-institution licensing |
| Packback | $10,000+ | Per-institution licensing |

**Potential savings: $5,000 - $15,000+ annually**

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Chart.js
- **Backend** (LTI): Node.js, Express, PostgreSQL
- **Authentication**: LTI 1.3 / OIDC via Canvas
- **Media**: WebRTC for video/audio recording
- **Styling**: Custom CSS with TCC brand colors

---

## 🎨 Customization

### Instructor Setup (Built-in)
1. Switch to **Instructor View**
2. Click **⚙️ Settings** tab
3. Enter your name, title, and upload profile photo
4. Configure course name, section, and semester
5. Click **Save** — settings persist automatically!

### Brand Customization (Code)
Edit CSS variables in the `<style>` section:
```css
:root {
    --tcc-blue: #006184;      /* Primary brand color */
    --tcc-teal: #00a9a5;      /* Secondary brand color */
    --tcc-mint: #e8f6f5;      /* Light accent */
}
```

---

## 🤝 Contributing

Contributions are welcome! This project was developed for Tarrant County College but can be adapted for any institution.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👏 Acknowledgments

- **Tarrant County College** - Institutional support and requirements
- **TCC Social Sciences Division** - Feature feedback and testing
- Built with ❤️ for better student engagement

---

<div align="center">

**[⬆ Back to Top](#-tcc-discussion-hub)**

Made for 🎓 **Tarrant County College**

</div>
