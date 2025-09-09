#!/bin/bash

# Install production dependencies
npm install --save cookie-parser

# Install development dependencies
npm install --save-dev @types/cookie-parser eslint-plugin-security

# Install global security tools
npm install -g snyk

echo "Security dependencies installed successfully!"
echo "Run 'npm audit' to check for vulnerabilities in dependencies"
echo "Run 'npx eslint --plugin security' to check for security issues in code"
echo "Run 'snyk test' to scan for vulnerabilities (requires Snyk account)"