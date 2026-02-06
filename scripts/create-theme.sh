#!/bin/bash
# Script to scaffold a new theme by copying from the default theme
# Usage: ./scripts/create-theme.sh <theme-name> [--minimal]
#
# Options:
#   --minimal   Only create the directory structure with index files,
#               no component copies. All components fall back to default.

set -e

THEME_NAME="$1"
MINIMAL=false

if [ "$2" = "--minimal" ]; then
  MINIMAL=true
fi

if [ -z "$THEME_NAME" ]; then
  echo "Usage: $0 <theme-name> [--minimal]"
  echo ""
  echo "Examples:"
  echo "  $0 my-brand            # Full copy of default theme"
  echo "  $0 my-brand --minimal  # Minimal scaffold (fallback to default)"
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

if [ "$MINIMAL" = true ]; then
  # Minimal mode: create directory structure only
  mkdir -p "$TARGET_DIR/blocks"
  mkdir -p "$TARGET_DIR/layouts"
  mkdir -p "$TARGET_DIR/pages"

  # Create placeholder index files
  echo "// $THEME_NAME theme - blocks" > "$TARGET_DIR/blocks/index.tsx"
  echo "// $THEME_NAME theme - layouts" > "$TARGET_DIR/layouts/index.tsx"
  echo "// $THEME_NAME theme - pages" > "$TARGET_DIR/pages/index.tsx"

  echo "(minimal mode: only directory structure created, all components fall back to default)"
else
  # Full mode: copy the entire default theme
  cp -r "$THEMES_DIR/default" "$TARGET_DIR"
fi

# Register the theme in src/themes/registry.ts
REGISTRY_FILE="src/themes/registry.ts"
# Handle both single and multiple existing themes
sed -i.bak "s/\] as const;/, '$THEME_NAME'] as const;/" "$REGISTRY_FILE"
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
echo ""
echo "Tip: You only need to create files for components you want to override."
echo "     Missing components automatically fall back to the default theme."
