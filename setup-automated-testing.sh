#!/bin/bash

echo "🚀 Setting up Enterprise Testing + Automated Deployment..."

cd yaumy-frontend

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run initial tests to verify setup
echo "🧪 Running initial test verification..."
npm test -- --run

# Set up git hooks for local testing
echo "🔗 Setting up git hooks..."
if ! npm list husky > /dev/null 2>&1; then
    echo "Installing husky..."
    npm install --save-dev husky
fi

npx husky install
npx husky add .husky/pre-commit "cd yaumy-frontend && npm run typecheck && npm test -- --run"
npx husky add .husky/pre-push "cd yaumy-frontend && npm test -- --coverage"

# Make hooks executable
chmod +x .husky/pre-commit 2>/dev/null || true
chmod +x .husky/pre-push 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 What happens now:"
echo "   • Tests run automatically before commits/pushes"
echo "   • GitHub Actions runs on every PR/push"
echo "   • Failed tests block deployments"
echo "   • Vercel deploys automatically when tests pass"
echo ""
echo "🧪 Test commands:"
echo "   npm test                 # Run all tests"
echo "   npm test -- --watch     # Continuous testing"
echo "   npm test -- --coverage  # Coverage report"
echo "   npm test -- --ui        # Visual test runner"
echo ""
echo "🛠️ Development workflow:"
echo "   1. Make changes"
echo "   2. Tests run automatically on commit"
echo "   3. Push triggers full CI/CD"
echo "   4. Vercel deploys when tests pass"
echo ""
echo "🎯 Next: Set up branch protection at:"
echo "   https://github.com/YOUR_USERNAME/YOUR_REPO/settings/branches"