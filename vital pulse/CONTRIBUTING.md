# Contributing to Pulse 🩸

First off, thank you for considering contributing to Pulse! It's people like you that make Pulse a great global life-saving platform.

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before participating.

## How Can I Contribute?

### 🗺️ Adding a New Country/Region

**This is the easiest and most impactful way to contribute!**

1. Create a new directory under `/regions/` with your country code (ISO 3166-1 alpha-2)
   ```
   regions/XX/
   ```

2. Copy the template from `regions/_template/` and create these files:
   - `config.json` - Main configuration
   - `languages.json` - Supported languages
   - `blood-donation-rules.json` - Donation rules specific to your country
   - `sms-gateway.json` - SMS provider configuration (if applicable)
   - `emergency-numbers.json` - Emergency contact numbers

3. Fill in the values specific to your country (donation intervals, age limits, emergency numbers, etc.)

4. Open a Pull Request with:
   - Description of the country
   - Verification of emergency numbers and donation rules
   - Test that the config loads correctly

**See [docs/contribution-guide.md](docs/contribution-guide.md) for detailed examples.**

### 🐛 Reporting Bugs

Before creating bug reports, please check the issue list as you might find that you don't need to create one. When creating a bug report, include:

- **Clear title and description**
- **Steps to reproduce the issue**
- **Expected behavior**
- **Actual behavior**
- **Screenshots** (if applicable)
- **Environment** (OS, device, app version)
- **Country/Region** (if region-specific)

### 💡 Suggesting Features

We welcome feature suggestions! Please open an issue with:

- **Clear title**
- **Problem statement** - What problem does this solve?
- **Proposed solution** - How would this work?
- **Use cases** - Who would benefit from this?
- **Priority** - Is this MVP, Phase 2, or Advanced?

### 🌐 Translating

Help us make Pulse available in more languages!

1. Check existing translations in `mobile-app/src/locales/`
2. Find your language code (ISO 639-1)
3. Copy `en.json` and translate all strings
4. Update `regions/XX/languages.json` to include your language

### 💻 Code Contributions

#### Setting Up Your Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/pulse.git
   cd pulse
   ```

2. **Set up Backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your credentials
   npm run dev
   ```

3. **Set up Mobile App**
   ```bash
   cd mobile-app
   npm install
   # iOS
   cd ios && pod install && cd ..
   # Android - ensure Android Studio is set up
   ```

4. **Set up Database**
   ```bash
   # PostgreSQL
   createdb pulse_dev
   cd backend
   npm run migrate
   ```

#### Development Workflow

1. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   # or
   git checkout -b region/add-XX-country
   ```

2. **Make your changes**
   - Follow the coding style (see below)
   - Write tests for new features
   - Update documentation as needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add country XX support"
   # or
   git commit -m "fix: resolve emergency button crash"
   ```

   **Commit message format:**
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `style:` - Code style changes (formatting, etc.)
   - `refactor:` - Code refactoring
   - `test:` - Adding tests
   - `chore:` - Maintenance tasks

4. **Push and create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub.

#### Coding Standards

- **JavaScript/TypeScript**: Follow ESLint configuration (`.eslintrc`)
- **React Native**: Follow React Native best practices
- **Backend**: Follow the existing code structure
- **Testing**: Write tests for critical features
- **Documentation**: Comment complex logic

#### Code Review Process

1. All PRs require at least one maintainer approval
2. CI checks must pass (tests, linting)
3. PRs are reviewed within 48 hours
4. Address review comments promptly

### 📝 Documentation

Documentation improvements are always welcome! Areas that need help:

- API documentation
- Setup guides for different environments
- Regional deployment guides
- User guides (screenshots, tutorials)

## Questions?

- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bugs and feature requests
- **Email**: contact@pulse.app (coming soon)

## Recognition

Contributors will be:
- Listed in the README (if desired)
- Credited in release notes
- Forever part of the Pulse mission to save lives globally 🚀

Thank you for contributing to Pulse! Every contribution helps save lives.

