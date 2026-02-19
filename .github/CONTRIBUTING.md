# Contributing to TCC Discussion Hub

Thank you for your interest in contributing to the TCC Discussion Hub. This document
provides guidelines and security requirements for contributors.

## Getting Started

1. Fork the repository.
2. Create a feature branch from `develop` (not `main`).
3. Make your changes following the guidelines below.
4. Submit a pull request to the `develop` branch.

## Development Environment

### Prerequisites

- Node.js 18 LTS or higher
- PostgreSQL 14+
- npm 9+

### Setup

```bash
git clone <your-fork-url>
cd discussion-hub
cp .env.example .env
# Edit .env with local development values
npm install
npm run migrate
npm run dev
```

## Secure Development Guidelines (OWASP)

All contributions must adhere to the following secure coding practices, aligned
with the OWASP Secure Coding Guidelines.

### Input Validation

- **Validate all input server-side.** Never rely solely on client-side validation.
- Use allowlists over denylists for input validation.
- Validate data type, length, range, and format.
- Sanitize all user input before rendering in HTML contexts.

### Authentication & Session Management

- All authentication is handled via Canvas LTI 1.3. Do not implement local auth.
- Never store credentials in source code or configuration files committed to git.
- Session cookies must use `HttpOnly`, `Secure`, and `SameSite` attributes.
- Validate JWT tokens against the Canvas JWKS endpoint on every request.

### Access Control

- Enforce authorization checks server-side on every request.
- Use the `requireInstructor` middleware for instructor-only endpoints.
- Validate that users can only access data within their enrolled courses.
- Follow the principle of least privilege.

### Database Security

- **Always use parameterized queries.** Never concatenate user input into SQL.
- Use the `pg` library's parameterized query syntax: `client.query('SELECT * FROM users WHERE id = $1', [userId])`.
- Validate and sanitize all data before database insertion.

### Error Handling

- Do not expose stack traces or internal error details to users.
- Log errors server-side with sufficient detail for debugging.
- Return generic error messages to clients.
- Handle all promise rejections and async errors.

### File Upload Security

- Validate file MIME types against an allowlist.
- Enforce file size limits at the application level.
- Generate random filenames for stored files.
- Store uploaded files outside the web root.
- Never execute uploaded files.

### Output Encoding

- Encode output data appropriate to the context (HTML, JavaScript, URL, CSS).
- Use Content Security Policy (CSP) headers to prevent XSS.
- Set `X-Content-Type-Options: nosniff` header.

### Cryptography

- Use TLS 1.2 or higher for all connections.
- Do not implement custom cryptographic algorithms.
- Use `crypto.randomBytes()` or `crypto.randomUUID()` for generating tokens.

## Code Quality Standards

### General

- Write clear, self-documenting code.
- Keep functions focused and reasonably sized.
- Handle errors explicitly rather than silently ignoring them.

### JavaScript / Node.js

- Use `const` and `let` (never `var`).
- Use async/await over raw promises where practical.
- Use strict equality (`===`) comparisons.

### Testing

- Write tests for new functionality.
- Ensure existing tests pass before submitting a PR.
- Include both positive and negative test cases.
- Test authorization boundaries (e.g., student cannot access instructor endpoints).

## Pull Request Process

1. **Branch naming**: Use descriptive names like `feature/add-poll-export` or
   `fix/session-timeout-handling`.
2. **Commits**: Write clear commit messages describing what changed and why.
3. **CI checks**: All CI checks must pass before merge.
4. **Security review**: Changes touching authentication, authorization, database
   queries, or file handling require security review.
5. **Code review**: At least one maintainer must approve the PR.

## Security Review Checklist

Before submitting a PR, verify the following:

- [ ] No secrets, credentials, or API keys in the code
- [ ] All user input is validated and sanitized
- [ ] Database queries use parameterized statements
- [ ] Authorization checks are enforced server-side
- [ ] Error messages do not leak internal details
- [ ] File uploads are validated (type, size, name)
- [ ] Dependencies are from trusted sources with compatible licenses
- [ ] No `eval()`, `Function()`, or other dynamic code execution with user input

## Reporting Security Issues

**Do NOT open public issues for security vulnerabilities.**

See [SECURITY.md](../SECURITY.md) for responsible disclosure instructions.
