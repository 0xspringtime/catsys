# Contributing to CatSys

We welcome contributions to CatSys! This document provides guidelines for contributing to the project.

## 🚀 Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/catsys.git`
3. Install dependencies: `npm install`
4. Run tests: `npm test`
5. Build: `npm run build`

## 📋 Development Workflow

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Add tests for new functionality
4. Ensure all tests pass: `npm test`
5. Ensure build succeeds: `npm run build`
6. Commit your changes with a descriptive message
7. Push to your fork: `git push origin feature/your-feature-name`
8. Create a Pull Request

## 🧮 Mathematical Rigor

CatSys is built on category theory foundations. When contributing:

- **Preserve mathematical laws**: All changes must maintain the 12 category theory laws
- **Add tests for new laws**: If introducing new mathematical properties, include verification
- **Document mathematical concepts**: Explain category theory principles in code comments
- **Maintain type safety**: Use TypeScript's type system to encode mathematical relationships

## 🧪 Testing Requirements

- All new features must include tests
- Property-based tests are preferred for mathematical properties
- Integration tests should demonstrate real-world usage
- All 12 laws must continue to pass

## 📚 Documentation

- Update README.md for user-facing changes
- Update GUIDE.md for new advanced features
- Include JSDoc comments for all public APIs
- Provide examples for new functionality

## 🎯 Code Style

- Use TypeScript strict mode
- Follow existing code formatting
- Use meaningful variable names
- Keep functions pure when possible
- Separate pure logic from effectful operations

## 📝 Commit Messages

Use conventional commit format:
- `feat: add new adapter for Redis`
- `fix: resolve type error in CQRS handler`
- `docs: update installation instructions`
- `test: add property-based tests for Law 7`

## 🐛 Bug Reports

When reporting bugs:
1. Use GitHub Issues
2. Include minimal reproduction case
3. Specify CatSys version
4. Include error messages and stack traces
5. Describe expected vs actual behavior

## 💡 Feature Requests

For new features:
1. Open a GitHub Discussion first
2. Explain the use case
3. Consider mathematical implications
4. Propose API design
5. Discuss implementation approach

## 🏆 Recognition

Contributors will be:
- Listed in package.json contributors
- Mentioned in release notes
- Added to project README
- Invited to join the core team for significant contributions

## 📄 License

By contributing, you agree that your contributions will be licensed under the GPL-3.0-or-later License.

## 🤝 Code of Conduct

Be respectful, inclusive, and professional. Focus on the mathematics and code quality.

## 🧮 Mathematical Background

If you're new to category theory:
- Read our GUIDE.md for mathematical foundations
- Study the 12 laws and their implementations
- Ask questions in GitHub Discussions
- Start with small contributions to understand the patterns

**Thank you for helping make distributed systems mathematically sound!** 🐱
