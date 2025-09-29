#!/bin/bash
# Systematic CJS to ESM Conversion Checker

echo "=== Checking for CommonJS patterns in your repository ==="
echo

# 1. Check for require() statements
echo "1. Checking for require() statements:"
echo "-----------------------------------"
find . -name "*.js" -o -name "*.mjs" -o -name "*.cjs" | head -20 | while read file; do
    if grep -n "require(" "$file" 2>/dev/null; then
        echo "Found require() in: $file"
    fi
done
echo

# 2. Check for module.exports
echo "2. Checking for module.exports:"
echo "------------------------------"
find . -name "*.js" -o -name "*.mjs" -o -name "*.cjs" | head -20 | while read file; do
    if grep -n "module\.exports" "$file" 2>/dev/null; then
        echo "Found module.exports in: $file"
    fi
done
echo

# 3. Check for exports.something
echo "3. Checking for exports assignments:"
echo "----------------------------------"
find . -name "*.js" -o -name "*.mjs" -o -name "*.cjs" | head -20 | while read file; do
    if grep -n "^[[:space:]]*exports\." "$file" 2>/dev/null; then
        echo "Found exports assignment in: $file"
    fi
done
echo

# 4. Check for __dirname and __filename
echo "4. Checking for CommonJS globals:"
echo "--------------------------------"
find . -name "*.js" -o -name "*.mjs" -o -name "*.cjs" | head -20 | while read file; do
    if grep -n "__dirname\|__filename" "$file" 2>/dev/null; then
        echo "Found CommonJS globals in: $file"
    fi
done
echo

# 5. Check package.json for type field
echo "5. Checking package.json configuration:"
echo "-------------------------------------"
if [ -f "package.json" ]; then
    if grep -q '"type".*"module"' package.json; then
        echo "âœ“ package.json has 'type': 'module'"
    else
        echo "âš  package.json missing 'type': 'module' - add this for ESM"
    fi
else
    echo "âš  No package.json found"
fi
echo

# 6. Check for mixed file extensions
echo "6. Checking file extensions:"
echo "---------------------------"
echo "JavaScript files found:"
find . -name "*.js" | head -10
find . -name "*.mjs" | head -5
find . -name "*.cjs" | head -5
echo

# 7. Check for dynamic imports vs static imports
echo "7. Checking import patterns:"
echo "---------------------------"
find . -name "*.js" -o -name "*.mjs" | head -10 | while read file; do
    if grep -n "^import " "$file" 2>/dev/null; then
        echo "âœ“ ESM imports found in: $file"
    fi
    if grep -n "import(" "$file" 2>/dev/null; then
        echo "Dynamic imports in: $file"
    fi
done
echo

echo "=== Conversion Checklist ==="
echo "1. âœ“ Replace require() with import statements"
echo "2. âœ“ Replace module.exports with export default or named exports"
echo "3. âœ“ Replace exports.x with export const x"
echo "4. âœ“ Replace __dirname with import.meta.url + path utilities"
echo "5. âœ“ Replace __filename with import.meta.url"
echo "6. âœ“ Add 'type': 'module' to package.json"
echo "7. âœ“ Update file extensions if needed (.mjs for ESM, .cjs for CJS)"
echo "8. âœ“ Check all build scripts and tools for ESM compatibility"