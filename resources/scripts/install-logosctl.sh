#!/bin/sh
# Install logosctl, per docs/messaging/delivery/run-logos-delivery-node.md Step 1.
#
# Downloads a pinned logosctl release for the host OS/arch and installs it.
# Works on Linux (x86_64/aarch64) and macOS (Apple Silicon). To move to a
# newer build, bump LOGOSCTL_TAG below.
#   Linux: installed to /usr/local/bin/logosctl (needs write access there,
#          e.g. run as root or via sudo — the same assumption the doc makes).
#   macOS: installed to ~/.local/logosctl, and PATH is updated in ~/.zshrc.
set -eu

# Pinned tool release.
LOGOSCTL_TAG=${LOGOSCTL_TAG:-0.2.3}

os=$(uname -s)
arch=$(uname -m)
case "$os-$arch" in
  Linux-x86_64)                platform=x86_64-linux ;;
  Linux-aarch64)               platform=aarch64-linux ;;
  Darwin-arm64|Darwin-aarch64) platform=aarch64-macos ;;
  *) echo "unsupported platform: $os/$arch (need Linux x86_64/aarch64 or macOS Apple Silicon)" >&2; exit 1 ;;
esac

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

echo "Downloading logosctl $LOGOSCTL_TAG for $platform ..."
curl -fL \
  -o "$tmp/logosctl-$platform.tar.gz" \
  "https://github.com/logos-co/logos-logoscore-cli/releases/download/$LOGOSCTL_TAG/logosctl-$platform.tar.gz"
tar -xzf "$tmp/logosctl-$platform.tar.gz" -C "$tmp"

case "$platform" in
  *-linux)
    echo "Installing to /usr/local/bin/logosctl ..."
    appimage=$(ls "$tmp"/logosctl-*.AppImage)
    install -m755 "$appimage" /usr/local/bin/logosctl
    echo "Done. logosctl is on PATH via /usr/local/bin."
    ;;
  *-macos)
    dest="$HOME/.local/logosctl"
    echo "Installing to $dest ..."
    rm -rf "$dest"
    mv "$tmp/logosctl-$platform" "$dest"
    line='export PATH="$HOME/.local/logosctl/bin:$PATH"'
    if ! grep -qxF "$line" "$HOME/.zshrc" 2>/dev/null; then
      echo "$line" >> "$HOME/.zshrc"
    fi
    echo "Done. PATH added to ~/.zshrc — open a new shell, or run: source ~/.zshrc"
    ;;
esac
