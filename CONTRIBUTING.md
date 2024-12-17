# Contributing to Next-Ejabberd

Thank you for your interest in contributing to Next-Ejabberd! We welcome contributions from the community and are grateful for any help you can provide.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please read and follow it to ensure a welcoming environment for all contributors.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/BemwaMalak/next-ejabberd.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Install dependencies: `npm install`

## Development Process

1. Make your changes in your feature branch
2. Write or update tests as needed
3. Ensure all tests pass: `npm test`
4. Update documentation if needed
5. Commit your changes using conventional commits

### Conventional Commits

We use conventional commits to maintain a clear and standardized commit history. Please format your commit messages as follows:

```
type(scope): description

[optional body]

[optional footer]
```

Types:

- feat: A new feature
- fix: A bug fix
- docs: Documentation changes
- style: Code style changes (formatting, missing semi-colons, etc)
- refactor: Code changes that neither fix a bug nor add a feature
- perf: Performance improvements
- test: Adding or updating tests
- chore: Changes to build process or auxiliary tools

Example:

```
feat(messaging): add support for message reactions

- Implemented reaction handling
- Added tests for reaction events
- Updated documentation
```

## Pull Request Process

1. Update the README.md with details of changes if needed
2. Ensure your PR description clearly describes the problem and solution
3. Reference any related issues in your PR description

## Testing

### Test Structure

The test suite is organized by features and utilities:

```
src/__tests__/
├── core/              # Core functionality tests
├── features/         # Feature-specific tests
│   ├── messaging/   # Message handling tests
│   ├── mam/        # Message Archive Management tests
│   └── files/      # File handling tests
└── utils/           # Utility function tests
```

### Writing Tests

1. Create test files with the `.test.ts` extension
2. Group related tests using `describe` blocks
3. Write clear test descriptions using `it` blocks
4. Use meaningful variable names and mock data
5. Test both success and error cases

Example test structure:

```typescript
import { YourClass } from '../path/to/your/class';

describe('YourClass', () => {
    let instance: YourClass;
    
    beforeEach(() => {
        instance = new YourClass();
    });

    describe('methodName', () => {
        it('should handle successful case', () => {
            // Test success scenario
        });

        it('should handle error case', () => {
            // Test error scenario
        });
    });
});
```

### Running Tests

- Run all tests: `npm test`
- Run tests in watch mode: `npm test -- --watch`
- Run tests with coverage: `npm test -- --coverage`
- Run specific test file: `npm test -- path/to/test.test.ts`

### Mocking

- Use Jest's mocking capabilities for external dependencies
- Create meaningful mock data that represents real-world scenarios
- Mock network requests and file operations
- Document complex mocks in the test file

Example mock:

```typescript
jest.mock('@xmpp/client', () => ({
    client: jest.fn().mockImplementation(() => ({
        send: jest.fn().mockResolvedValue(undefined)
    }))
}));
```

### Best Practices

1. Test one thing at a time
2. Use descriptive test names that explain the expected behavior
3. Follow the Arrange-Act-Assert pattern
4. Clean up after tests using `afterEach` or `afterAll`
5. Avoid test interdependence
6. Mock external dependencies consistently
7. Test edge cases and error conditions
8. Keep tests focused and concise

## Development Setup

1. Install Node.js (version 18 or higher)
2. Install dependencies: `npm install`
3. Run tests: `npm test`
4. Start development server: `npm run dev`

## Need Help?

- Check existing issues and PRs before creating new ones
- Contact the maintainer at bemwa.malak10@gmail.com

## License

By contributing to Next-Ejabberd, you agree that your contributions will be licensed under the MIT License.
