#!/bin/bash

# Release script for avanza-api-unofficial
# Usage: ./release.sh [patch|minor|major]

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default to patch if no argument provided
RELEASE_TYPE=${1:-patch}

# Validate release type
if [[ ! "$RELEASE_TYPE" =~ ^(patch|minor|major)$ ]]; then
    echo -e "${RED}Error: Invalid release type. Use patch, minor, or major${NC}"
    exit 1
fi

echo -e "${YELLOW}Starting $RELEASE_TYPE release...${NC}"

# 1. Build the code first
echo -e "${YELLOW}Building the project...${NC}"
npm run build

# 2. Run tests
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}No .env file found. Path tests will run but API tests will be skipped.${NC}"
else
    echo -e "${YELLOW}Running tests with credentials...${NC}"
fi

echo -e "${YELLOW}Running all tests...${NC}"
npm test

echo -e "${YELLOW}Running linting...${NC}"
npm run lint

# If any of the above commands fail, the script will exit due to 'set -e'
echo -e "${GREEN}✅ Tests and linting passed!${NC}"

# 3. Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}Current version: $CURRENT_VERSION${NC}"

# 4. Bump version
echo -e "${YELLOW}Bumping version ($RELEASE_TYPE)...${NC}"
npm version $RELEASE_TYPE --no-git-tag-version

# 5. Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
echo -e "${GREEN}New version: $NEW_VERSION${NC}"

# 6. Update CHANGELOG.md
echo -e "${YELLOW}Updating CHANGELOG.md...${NC}"
DATE=$(date +%Y-%m-%d)

# Create temporary file with new changelog entry
cat > changelog_temp.md << EOF
# Changelog

All notable changes to this project will be documented in this file.

## [$NEW_VERSION] - $DATE

### Changed
- Version bump

EOF

# Append the rest of the changelog
tail -n +5 CHANGELOG.md >> changelog_temp.md
mv changelog_temp.md CHANGELOG.md

echo -e "${YELLOW}Please edit CHANGELOG.md to add your changes for version $NEW_VERSION${NC}"
echo -e "${YELLOW}Press Enter when you're done editing...${NC}"
read

# 7. Stage all changes
echo -e "${YELLOW}Staging changes...${NC}"
git add -A

# 8. Commit with version message
echo -e "${YELLOW}Committing changes...${NC}"
git commit -m "v$NEW_VERSION"

# 9. Create tag
echo -e "${YELLOW}Creating tag...${NC}"
git tag "v$NEW_VERSION"

# 10. Push changes and tag
echo -e "${YELLOW}Pushing to remote...${NC}"
git push origin main
git push origin "v$NEW_VERSION"

echo -e "${GREEN}✅ Release $NEW_VERSION complete!${NC}"
echo -e "${GREEN}GitHub Actions will now build and publish to npm.${NC}"