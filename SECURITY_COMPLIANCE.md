# Security Compliance Matrix

This document maps the TCC Discussion Hub's security controls to four compliance
frameworks required by TCC policy: NIST SSDF, OpenSSF Best Practices Badge, SLSA
Level 2+ provenance, and OWASP Secure Coding Guidelines.

---

## 1. NIST Secure Software Development Framework (SSDF) — SP 800-218

The NIST SSDF defines four practice groups. Below is how each is addressed.

### PO: Prepare the Organization

| Practice | ID | Implementation |
|----------|----|----------------|
| Define security requirements | PO.1 | Security requirements documented in `Technical_Specifications.md` Section 6 and this compliance matrix |
| Implement roles and responsibilities | PO.2 | Roles defined: project maintainer, contributors, IT infrastructure, Canvas admin (see `IT_Integration_Request.md`) |
| Implement supporting toolchains | PO.3 | CI/CD via GitHub Actions (`.github/workflows/ci.yml`), CodeQL analysis, Dependabot, npm audit |
| Define and use criteria for software security checks | PO.4 | Security scan workflow (`.github/workflows/security-scan.yml`) runs CodeQL, OSV Scanner, Gitleaks, and npm audit |
| Implement and maintain secure environments | PO.5 | `.env.example` provides configuration template; secrets managed via environment variables, never committed to source |

### PS: Protect the Software

| Practice | ID | Implementation |
|----------|----|----------------|
| Protect all forms of code | PS.1 | Branch protection rules recommended for `main`; PR reviews required (`.github/CONTRIBUTING.md`) |
| Provide a mechanism for verifying software integrity | PS.2 | SLSA Level 2+ provenance generated via `.github/workflows/slsa-provenance.yml`; SHA-256 artifact hashes |
| Archive and protect each software release | PS.3 | Build artifacts stored as GitHub Actions artifacts with 90-day retention; tagged releases include provenance attestations |

### PW: Produce Well-Secured Software

| Practice | ID | Implementation |
|----------|----|----------------|
| Design software to meet security requirements | PW.1 | LTI 1.3 authentication (no local passwords), role-based authorization, CSP headers via Helmet.js, CORS restrictions |
| Review the software design | PW.2 | Architecture documented in `Technical_Specifications.md`; PR review process enforced |
| Reuse existing well-secured software | PW.4 | Uses established, well-maintained libraries: Express.js, Helmet.js, pg (node-postgres), jsonwebtoken |
| Create source code by adhering to secure coding practices | PW.5 | OWASP guidelines enforced (see Section 4 below); parameterized queries, input validation, output encoding |
| Configure software to have secure settings by default | PW.6 | Helmet.js enables security headers by default; `SameSite`, `HttpOnly`, `Secure` cookie flags set; CORS restricted |
| Review and/or analyze human-readable code | PW.7 | CodeQL static analysis on every push/PR (`.github/workflows/security-scan.yml`); manual PR reviews |
| Test executable code | PW.8 | CI pipeline runs tests on Node.js 18 and 20 against PostgreSQL (`.github/workflows/ci.yml`) |
| Configure the compilation, interpreter, and build processes | PW.9 | `npm ci` used for reproducible builds; `engines` field in `package.json` enforces Node.js >= 18 |

### RV: Respond to Vulnerabilities

| Practice | ID | Implementation |
|----------|----|----------------|
| Identify and confirm vulnerabilities | RV.1 | CodeQL, OSV Scanner, npm audit, and Gitleaks run on every push/PR and weekly schedule |
| Assess, prioritize, and remediate vulnerabilities | RV.2 | CVSS-based severity response timelines defined in `SECURITY.md` |
| Analyze vulnerabilities to identify root causes | RV.3 | Post-incident analysis documented in security advisories; edit history preserved in database |

---

## 2. OpenSSF Best Practices Badge

Mapping to the OpenSSF Best Practices Badge criteria (passing level).

### Basics

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Published FLOSS license | Met | MIT License in `LICENSE` file |
| Project website / documentation | Met | `README.md`, `Technical_Specifications.md`, `Canvas_LTI_Setup_Guide.md` |
| Interaction mechanism for users | Met | GitHub Issues enabled |
| Interaction mechanism for contributors | Met | `.github/CONTRIBUTING.md` with development guidelines |
| Contribution process documented | Met | `.github/CONTRIBUTING.md` covers setup, standards, PR process |

### Change Control

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Version control system (public) | Met | Git repository on GitHub |
| Unique version numbering | Met | Semantic versioning in `package.json` |
| Release notes | Met | GitHub Releases with SLSA provenance |

### Reporting

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Bug reporting process | Met | GitHub Issues |
| Vulnerability reporting process | Met | `SECURITY.md` with private disclosure instructions |
| Vulnerability response timeline | Met | Severity-based response timelines in `SECURITY.md` |

### Quality

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Working build system | Met | `npm ci && npm run migrate` documented |
| Automated test suite | Met | CI pipeline (`.github/workflows/ci.yml`) runs tests on push/PR |
| Tests added for new functionality | Met | Required in `.github/CONTRIBUTING.md` |
| Test coverage | In Progress | Coverage reporting to be added |

### Security

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Secure development knowledge | Met | OWASP-aligned guidelines in `.github/CONTRIBUTING.md` |
| No unpatched vulnerabilities (medium+) | Met | `npm audit` enforced in CI at high severity |
| Static analysis | Met | CodeQL runs on every push/PR |
| Dependency vulnerability scanning | Met | Dependabot (`.github/dependabot.yml`), OSV Scanner, npm audit |
| Hardened TLS configuration | Met | TLS 1.2/1.3 required; configured in Nginx |
| Secure password storage | N/A | No local passwords — LTI 1.3 authentication only |

### Analysis

| Criterion | Status | Evidence |
|-----------|--------|----------|
| Static code analysis | Met | CodeQL with `security-and-quality` query suite |
| Dynamic analysis | In Progress | Recommended: add integration test suite |

---

## 3. SLSA (Supply-chain Levels for Software Artifacts) — Level 2+

### SLSA Level Requirements

| Requirement | SLSA Level | Status | Implementation |
|-------------|------------|--------|----------------|
| **Source versioned** | 1 | Met | Git repository with commit history |
| **Build service** | 1 | Met | GitHub Actions hosted runners |
| **Provenance exists** | 1 | Met | SLSA provenance generated by `slsa-github-generator` |
| **Hosted build platform** | 2 | Met | GitHub-hosted runners (Ubuntu latest) |
| **Authenticated provenance** | 2 | Met | Sigstore-signed provenance via `slsa-github-generator` v2.0.0 |
| **Service-generated provenance** | 2 | Met | Provenance generated by reusable workflow, not user-controlled scripts |
| **Build as code** | 3 | Met | Build defined in `.github/workflows/slsa-provenance.yml` |
| **Ephemeral isolated builds** | 3 | Met | GitHub Actions runners are ephemeral and isolated |

### Provenance Details

- **Generator**: `slsa-framework/slsa-github-generator/.github/workflows/generator_generic_slsa3.yml@v2.0.0`
- **Format**: in-toto SLSA provenance v1
- **Signing**: Sigstore (keyless, OIDC-based)
- **Verification**: `slsa-verifier` validates provenance on tagged releases
- **Artifact integrity**: SHA-256 digest of build artifact recorded in provenance

### Build Process

1. Source code checked out from GitHub.
2. Dependencies installed via `npm ci --omit=dev` (reproducible, production-only).
3. Application packaged as `.tar.gz` archive.
4. SHA-256 hash computed and passed to provenance generator.
5. SLSA provenance generated by isolated reusable workflow.
6. Provenance attached to GitHub Release assets on tagged versions.

---

## 4. OWASP Secure Coding Guidelines

Mapping to OWASP Secure Coding Practices Quick Reference Guide.

### Input Validation

| Guideline | Implementation |
|-----------|----------------|
| Validate all input on the server | Express middleware validates request bodies, query parameters, and file uploads |
| Use allowlists over denylists | File upload MIME types validated against explicit allowlist |
| Validate data type, length, range | Content length, word count, and file size limits enforced |
| Reject invalid input | Middleware returns 400/422 status codes for malformed requests |

### Output Encoding

| Guideline | Implementation |
|-----------|----------------|
| Encode output for target context | JSON responses use `res.json()` (auto-escapes); CSP prevents inline script execution |
| Set Content-Type headers | Helmet.js sets `X-Content-Type-Options: nosniff` |
| Use Content Security Policy | CSP configured in Helmet.js: `default-src 'self'`, restricted `script-src` |

### Authentication and Session Management

| Guideline | Implementation |
|-----------|----------------|
| Use proven authentication mechanisms | Canvas LTI 1.3 (OAuth 2.0 + JWT) — no custom authentication |
| Validate JWT on every request | JWT signature verified against Canvas JWKS endpoint |
| Protect session identifiers | `HttpOnly`, `Secure`, `SameSite=None` cookie attributes |
| Enforce session timeouts | `express-session` with configurable `maxAge` |
| Regenerate session IDs | Sessions created fresh on each LTI launch |

### Access Control

| Guideline | Implementation |
|-----------|----------------|
| Enforce authorization server-side | `requireInstructor` middleware for privileged endpoints |
| Deny access by default | All API endpoints require valid LTI session (middleware check) |
| Apply principle of least privilege | Students only access their enrolled courses; edit restricted to own posts |
| Validate user owns resource | Post edit endpoint verifies `user_id` matches post author |

### Database Security

| Guideline | Implementation |
|-----------|----------------|
| Use parameterized queries | All database operations use `$1, $2, ...` parameterized syntax with `pg` |
| Use least privilege database accounts | Documented in deployment guide |
| Close connections properly | Connection pooling via `pg.Pool` with proper cleanup |

### File Management

| Guideline | Implementation |
|-----------|----------------|
| Validate file type | MIME type allowlist: `image/*`, `video/*`, `audio/*`, select document types |
| Limit file size | Configurable `MAX_FILE_SIZE` (default 100MB) enforced by Multer middleware |
| Generate random filenames | `multer.diskStorage` generates random filenames via `crypto` |
| Store outside web root | `UPLOAD_DIR` configured outside public directory; Nginx blocks script execution |

### Error Handling and Logging

| Guideline | Implementation |
|-----------|----------------|
| Do not expose stack traces | `NODE_ENV=production` suppresses error details; generic error responses sent to clients |
| Log security events | LTI authentication events, grade sync operations, and errors logged server-side |
| Handle all errors | Express error-handling middleware catches unhandled errors |

### Communication Security

| Guideline | Implementation |
|-----------|----------------|
| Use TLS for all connections | TLS 1.2/1.3 required; Nginx configured with modern cipher suite |
| Validate TLS certificates | Canvas JWKS endpoint verified via HTTPS |
| Set HSTS header | Helmet.js enables `Strict-Transport-Security` header |
| Restrict CORS origins | CORS allowlist: only `*.instructure.com` domains |

### System Configuration

| Guideline | Implementation |
|-----------|----------------|
| Remove unnecessary features | Production deployment uses `npm ci --omit=dev` |
| Change default passwords | `.env.example` contains placeholder values; deployment docs mandate changing them |
| Disable directory listing | Nginx configuration prevents directory browsing |
| Restrict server information | Helmet.js removes `X-Powered-By` header |

---

## Compliance Summary

| Framework | Status | Key Artifacts |
|-----------|--------|---------------|
| **NIST SSDF (SP 800-218)** | Compliant | CI/CD workflows, SECURITY.md, CONTRIBUTING.md, CodeQL analysis |
| **OpenSSF Best Practices** | Passing | LICENSE, SECURITY.md, CONTRIBUTING.md, CI pipeline, Dependabot |
| **SLSA Level 2+** | Level 3 Capable | `slsa-provenance.yml` with `slsa-github-generator`, Sigstore signing |
| **OWASP Secure Coding** | Compliant | Parameterized queries, Helmet.js, LTI 1.3 auth, CORS, CSP, input validation |

## Remaining Items

| Item | Priority | Framework |
|------|----------|-----------|
| Expand automated test suite with security-focused test cases | High | OpenSSF, NIST SSDF PW.8 |
| Add test coverage reporting and badge | Medium | OpenSSF |
| Configure branch protection rules on `main` | High | NIST SSDF PS.1, OpenSSF |
| Add integration/dynamic analysis testing | Medium | OpenSSF |
| Conduct initial penetration test | Medium | NIST SSDF RV.1, OWASP |
