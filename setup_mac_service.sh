#!/usr/bin/env bash

PLIST_NAME="com.aurapdf.editor.plist"
TARGET_DIR="$HOME/Library/LaunchAgents"
TARGET_PATH="$TARGET_DIR/$PLIST_NAME"

ACTION="${1:-install}"

if [ "$ACTION" == "install" ]; then
    echo "Installing AuraPDF background service to $TARGET_PATH ..."
    mkdir -p "$TARGET_DIR"
    cp "$PLIST_NAME" "$TARGET_PATH"
    launchctl unload "$TARGET_PATH" 2>/dev/null || true
    launchctl load -w "$TARGET_PATH"
    echo "Service installed and running! It will start automatically when you log in."
    echo "Logs are available at: $(pwd)/service.log"
elif [ "$ACTION" == "uninstall" ]; then
    echo "Stopping and uninstalling service..."
    launchctl unload "$TARGET_PATH" 2>/dev/null || true
    rm -f "$TARGET_PATH"
    echo "Service uninstalled."
else
    echo "Usage: ./setup_mac_service.sh [install|uninstall]"
fi
