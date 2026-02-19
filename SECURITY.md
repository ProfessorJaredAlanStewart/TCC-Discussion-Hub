# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

The TCC Discussion Hub team takes security vulnerabilities seriously. We appreciate
your efforts to responsibly disclose your findings.

### How to Report

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report vulnerabilities through one of the following channels:

1. **GitHub Security Advisories**: Use the "Report a vulnerability" button on the
   [Security tab](../../security/advisories) of this repository.
2. **Email**: Send a detailed report to the project maintainer at the address listed
   in the repository contacts.

### What to Include

Please include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Affected versions
- Potential impact assessment
- Suggested fix (if available)

### Response Timeline

| Action | Timeline |
|--------|----------|
| Acknowledgment of report | Within 48 hours |
| Initial assessment | Within 5 business days |
| Status update | Every 7 days until resolved |
| Fix release | Based on severity (see below) |

### Severity-Based Response

| Severity | Fix Target |
|----------|------------|
| Critical (CVSS 9.0+) | Patch within 72 hours |
| High (CVSS 7.0-8.9) | Patch within 7 days |
| Medium (CVSS 4.0-6.9) | Patch within 30 days |
| Low (CVSS 0.1-3.9) | Next scheduled release |

### Disclosure Policy

- We follow coordinated disclosure practices.
- We will credit reporters in the security advisory (unless anonymity is requested).
- We request a 90-day disclosure window before public disclosure.

## Security Practices

### Authentication & Authorization
- All authentication is handled via Canvas LTI 1.3 (OAuth 2.0 + JWT).
- No local user accounts or passwords are stored.
- Role-based access control enforced server-side (student vs. instructor).
- Session cookies use `HttpOnly`, `Secure`, and `SameSite` attributes.

### Data Protection
- TLS 1.2/1.3 required for all connections.
- All student data remains on TCC infrastructure (FERPA compliant).
- No data shared with third-party services.
- Database queries use parameterized statements (SQL injection prevention).

### Input Validation
- All user input is validated and sanitized server-side.
- File uploads are validated by MIME type with size limits enforced.
- Content Security Policy (CSP) headers configured via Helmet.js.
- CORS restricted to authorized Canvas instances.

### Dependency Management
- Dependabot enabled for automated dependency updates.
- `npm audit` runs on every CI build.
- Dependencies reviewed for known vulnerabilities before merging.

### Infrastructure
- Application runs behind Nginx reverse proxy.
- Upload directory isolated from web root with script execution disabled.
- Security headers enforced at both application and proxy levels.
