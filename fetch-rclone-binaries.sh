CDIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null && pwd )"
TMPDIR=$(mktemp -d)

cd $CDIR
rm -rf "$CDIR/vendor/rclone"
mkdir -p "$CDIR/vendor/rclone"

echo "Prepare darwin binary"
mkdir "$TMPDIR/darwin"
cd "$TMPDIR/darwin"
curl -LO# https://downloads.rclone.org/rclone-current-osx-amd64.zip
tar -xf "rclone-current-osx-amd64.zip" --strip-components=1
cp -f "$TMPDIR/darwin/rclone" "$CDIR/vendor/rclone/rclone.darwin"
chmod +x "$CDIR/vendor/rclone/rclone.darwin"

echo "Prepare linux binary"
mkdir "$TMPDIR/linux"
cd "$TMPDIR/linux"
curl -LO# https://downloads.rclone.org/rclone-current-linux-amd64.zip
tar -xf "rclone-current-linux-amd64.zip" --strip-components=1
cp -f "$TMPDIR/linux/rclone" "$CDIR/vendor/rclone/rclone.linux"
chmod +x "$CDIR/vendor/rclone/rclone.linux"

echo "Prepare windows binary"
mkdir "$TMPDIR/win32"
cd "$TMPDIR/win32"
curl -LO# https://downloads.rclone.org/rclone-current-windows-amd64.zip
tar -xf "rclone-current-windows-amd64.zip" --strip-components=1
cp -f "$TMPDIR/win32/rclone.exe" "$CDIR/vendor/rclone/rclone.exe"

rm -rf "$TMPDIR"
