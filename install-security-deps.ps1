# Install production dependencies
npm install --save cookie-parser

# Install development dependencies
npm install --save-dev @types/cookie-parser eslint-plugin-security

# Install global security tools
npm install -g snyk

Write-Host "Security dependencies installed successfully!" -ForegroundColor Green
Write-Host "Run 'npm audit' to check for vulnerabilities in dependencies" -ForegroundColor Cyan
Write-Host "Run 'npx eslint --plugin security' to check for security issues in code" -ForegroundColor Cyan
Write-Host "Run 'snyk test' to scan for vulnerabilities (requires Snyk account)" -ForegroundColor Cyan