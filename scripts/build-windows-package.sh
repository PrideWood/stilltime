#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
version=${1:-1.0.0}
package_name="Stilltime-Windows-Portable-v${version}"
output_dir="$project_root/dist"
staging_root=$(mktemp -d "${TMPDIR:-/tmp}/stilltime-package.XXXXXX")
package_root="$staging_root/$package_name"

cleanup() {
  rm -rf -- "$staging_root"
}
trap cleanup EXIT INT TERM

mkdir -p "$package_root/site/assets/fonts" "$output_dir"

cp "$project_root/windows/Start-Stilltime.cmd" "$package_root/"
cp "$project_root/windows/Start-Stilltime.ps1" "$package_root/"
cp "$project_root/windows/README-Windows.txt" "$package_root/"
cp "$project_root/LICENSE" "$package_root/LICENSE.txt"

cp "$project_root/index.html" "$package_root/site/"
cp "$project_root/style.css" "$package_root/site/"
cp "$project_root/app.js" "$package_root/site/"
cp "$project_root/assets/fonts/DSEG-LICENSE.txt" "$package_root/site/assets/fonts/"
cp "$project_root/assets/fonts/"*.woff2 "$package_root/site/assets/fonts/"

rm -f -- "$output_dir/$package_name.zip"
(
  cd "$staging_root"
  zip -q -r "$output_dir/$package_name.zip" "$package_name"
)

printf '%s\n' "$output_dir/$package_name.zip"
