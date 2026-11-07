#!/usr/bin/env bash
# Installs the packed npm tarball in a clean folder and runs it through npx, the way users will.
set -euo pipefail
root=$(pwd)
tarball=$(npm pack --silent)
dir=$(mktemp -d)
trap 'rm -rf "$dir" "$root/$tarball"' EXIT
cp "$tarball" samples/bracket-block.stl test/packed-client.mjs "$dir/"
cd "$dir"
npm init -y >/dev/null
npm install --silent "./$tarball" @modelcontextprotocol/client@^2
node packed-client.mjs
