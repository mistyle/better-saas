#!/bin/bash
# Script to scaffold a new theme by copying from the default theme
# Usage: ./scripts/create-theme.sh <theme-name>

set -e

THEME_NAME="$1"

if [ -z "$THEME_NAME" ]; then
  echo "Usage: $0 <theme-name>"
  echo "Example: $0 my-brand"
  exit 1
fi

# Validate theme name (kebab-case)
if ! echo "$THEME_NAME" | grep -qE '^[a-z][a-z0-9-]*$'; then
  echo "Error: Theme name must be kebab-case (e.g. my-brand)"
  exit 1
fi

THEMES_DIR="src/themes"
TARGET_DIR="$THEMES_DIR/$THEME_NAME"

if [ -d "$TARGET_DIR" ]; then
  echo "Error: Theme '$THEME_NAME' already exists at $TARGET_DIR"
  exit 1
fi

echo "Creating theme '$THEME_NAME' from default..."

# Copy the default theme
cp -r "$THEMES_DIR/default" "$TARGET_DIR"

# Register the theme in src/config/theme/index.ts
REGISTRY_FILE="src/config/theme/index.ts"
sed -i.bak "s/export const themeNames = \['default'\]/export const themeNames = ['default', '$THEME_NAME']/" "$REGISTRY_FILE"
rm -f "$REGISTRY_FILE.bak"

echo ""
echo "Theme '$THEME_NAME' created successfully!"
echo ""
echo "Files created:"
find "$TARGET_DIR" -type f | sort
echo ""
echo "Next steps:"
echo "  1. Customize blocks in $TARGET_DIR/blocks/"
echo "  2. Customize layouts in $TARGET_DIR/layouts/"
echo "  3. Customize pages in $TARGET_DIR/pages/"
echo "  4. Set NEXT_PUBLIC_THEME=$THEME_NAME in your .env file"
echo "  5. Run 'pnpm build' to validate"
