/**
 * Simple Security Check Script for ZenStore Backend
 * 
 * This script performs basic security checks on the codebase to identify potential vulnerabilities.
 * Run with: node security-check.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const srcDir = path.join(__dirname, 'src');
const securityIssues = [];

// Simple string-based patterns to check
const patterns = {
  hardcodedSecrets: {
    keywords: ['password=', 'secret=', 'key=', 'token=', 'auth=', 'apikey=', 'apisecret=', 
              'PASSWORD=', 'SECRET=', 'KEY=', 'TOKEN=', 'AUTH=', 'APIKEY=', 'APISECRET=',
              'DB_URL=', 'EMAIL_PASS=', 'PHONE_ENC=', 'STRIPE_SECRET=', 'SIGNATURE_USER=', 'SIGNATURE_ADMIN='],
    description: "Hardcoded secrets, passwords, or keys in source code",
    severity: "HIGH"
  },
  insecureRandomness: {
    keywords: ['Math.random()'],
    description: "Use of insecure random number generator (Math.random())",
    severity: "MEDIUM"
  },
  noSqlInjection: {
    keywords: ['$where:', '$regex:', '$gt:', '$lt:'],
    description: "Potential NoSQL injection vulnerability",
    severity: "HIGH"
  },
  missingValidation: {
    keywords: ['req.body.', 'req.query.', 'req.params.'],
    description: "Potential missing input validation",
    severity: "MEDIUM"
  }
};

// Function to check a file for security issues
function checkFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileIssues = [];
    const lines = content.split('\n');

    // Check for each pattern
    for (const patternKey of Object.keys(patterns)) {
      const patternInfo = patterns[patternKey];
      const matchedLines = [];
      
      // Check each line for keywords
      lines.forEach((line, lineIndex) => {
        const lineNumber = lineIndex + 1;
        
        for (const keyword of patternInfo.keywords) {
          if (line.includes(keyword)) {
            matchedLines.push(lineNumber);
            break; // Only count each line once per pattern
          }
        }
      });
      
      if (matchedLines.length > 0) {
        fileIssues.push({
          pattern: patternKey,
          description: patternInfo.description,
          severity: patternInfo.severity,
          matches: matchedLines.length,
          lines: matchedLines
        });
      }
    }

    if (fileIssues.length > 0) {
      securityIssues.push({
        file: filePath,
        issues: fileIssues
      });
    }
  } catch (error) {
    console.error(`Error checking file ${filePath}: ${error.message}`);
  }
}

// Function to recursively scan directories
function scanDirectory(dir) {
  try {
    const files = fs.readdirSync(dir);
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      
      try {
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          // Skip node_modules and .git directories
          if (file !== 'node_modules' && file !== '.git') {
            scanDirectory(filePath);
          }
        } else if (stat.isFile()) {
          // Only check JavaScript, TypeScript, and JSON files
          if (/\.(js|ts|jsx|tsx|json)$/.test(file)) {
            checkFile(filePath);
          }
        }
      } catch (e) {
        console.error(`Error processing ${filePath}: ${e.message}`);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}: ${error.message}`);
  }
}

// Main function
function main() {
  console.log('Starting security check...');
  
  // Scan the source directory
  scanDirectory(srcDir);
  
  // Check .env file if it exists
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    checkFile(envPath);
  }
  
  // Print results
  console.log('\nSecurity Check Results:');
  console.log('======================');
  
  if (securityIssues.length === 0) {
    console.log('No security issues found.');
  } else {
    console.log(`Found ${securityIssues.length} files with potential security issues:\n`);
    
    securityIssues.forEach(fileIssue => {
      console.log(`File: ${fileIssue.file}`);
      
      fileIssue.issues.forEach(issue => {
        console.log(`  - [${issue.severity}] ${issue.description}`);
        console.log(`    Found ${issue.matches} matches on lines: ${issue.lines.join(', ')}`);
      });
      
      console.log('');
    });
    
    console.log('Note: These are potential issues that should be manually reviewed.');
    console.log('False positives may be present.');
  }
}

// Run the security check
main();