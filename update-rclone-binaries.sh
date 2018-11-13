#!/usr/bin/env bash

current_version=`curl -s https://downloads.rclone.org/version.txt`
echo "Updating binaries to ${current_version}"

bin_dir="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
bin_dir="${bin_dir}/rclone"
tmp_dir=`mktemp -d 2>/dev/null || mktemp -d -t 'rclone'`

echo "Preparing windows binaries..."
curl --progress-bar -o "${tmp_dir}/windows-x64.zip" "https://downloads.rclone.org/rclone-current-windows-amd64.zip"
mkdir -p "${bin_dir}/win32/"
unzip -q -a "${tmp_dir}/windows-x64.zip" -d "${tmp_dir}/windows-x64"
cd "${tmp_dir}/windows-x64"/*
cp -f rclone.exe "${bin_dir}/win32/"

echo "Preparing macos binaries..."
curl --progress-bar -o "${tmp_dir}/osx-x64.zip" "https://downloads.rclone.org/rclone-current-osx-amd64.zip"
mkdir -p "${bin_dir}/darwin/"
unzip -q -a "${tmp_dir}/osx-x64.zip" -d "${tmp_dir}/osx-x64"
cd "${tmp_dir}/osx-x64"/*
cp -f rclone "${bin_dir}/darwin/"

echo "Preparing linux binaries..."
curl --progress-bar -o "${tmp_dir}/linux-x64.zip" "https://downloads.rclone.org/rclone-current-linux-amd64.zip"
mkdir -p "${bin_dir}/linux/"
unzip -q -a "${tmp_dir}/linux-x64.zip" -d "${tmp_dir}/linux-x64"
cd "${tmp_dir}/linux-x64"/*
cp -f rclone "${bin_dir}/linux/"

echo "Copy the LICENSE"
curl -s -o "${bin_dir}/LICENSE" "https://raw.githubusercontent.com/ncw/rclone/master/COPYING"

