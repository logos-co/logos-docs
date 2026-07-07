#!/bin/sh
# Download the Logos node CLIs — logoscore, lgpd, lgpm — into ./bin.
#
# Unpacks a pinned release of each tool for the host OS/arch. Works on Linux
# (x86_64/aarch64) and macOS (Apple Silicon). To move to newer builds, bump the
# *_TAG values below. After it finishes:  export PATH="$PWD/bin:$PATH"
set -eu

# Pinned tool releases.
LOGOSCORE_TAG=0.2.0
LGPD_TAG=0.2.0
LGPM_TAG=0.2.0

os=$(uname -s | tr '[:upper:]' '[:lower:]')
if [ "$os" = darwin ]; then os=macos; fi
arch=$(uname -m)
if [ "$arch" = arm64 ]; then arch=aarch64; fi

case "$os" in
  linux|macos) ;;
  *) echo "unsupported OS: $os (Linux/macOS only)" >&2; exit 1 ;;
esac

bin="$PWD/bin"
mkdir -p "$bin"

# fetch <repo> <tool> <tag>: download <tool>-<arch>-<os>.tar.gz, expose ./bin/<tool>
fetch() {
  repo=$1; tool=$2; tag=$3
  echo "  $tool ($tag)"
  tmp=$(mktemp -d)
  curl -fsSL "https://github.com/logos-co/$repo/releases/download/$tag/$tool-$arch-$os.tar.gz" \
    | tar xz -C "$tmp"
  if [ "$os" = macos ]; then
    # tarball is <tool>-<arch>-macos/{bin,lib,...}; the binary finds its bundled
    # libs/modules relative to its real path, so wrap it (a symlink would break
    # that resolution) rather than linking.
    rm -rf "$bin/$tool-$arch-macos"
    mv "$tmp/$tool-$arch-macos" "$bin/"
    printf '#!/bin/sh\nexec "%s/%s-%s-macos/bin/%s" "$@"\n' "$bin" "$tool" "$arch" "$tool" > "$bin/$tool"
    chmod +x "$bin/$tool"
  else
    # tarball is a single <tool>-<arch>.AppImage
    mv "$tmp/$tool-$arch.AppImage" "$bin/$tool"
    chmod +x "$bin/$tool"
  fi
  rm -rf "$tmp"
}

echo "Installing Logos node tools for $os/$arch into $bin ..."
fetch logos-logoscore-cli      logoscore "$LOGOSCORE_TAG"
fetch logos-package-downloader lgpd      "$LGPD_TAG"
fetch logos-package-manager    lgpm      "$LGPM_TAG"
echo
echo "Done. Put them on your PATH:"
echo "  export PATH=\"$bin:\$PATH\""
