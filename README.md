# <img src="https://github.com/dimitrov-adrian/RcloneTray/blob/v2/icons/rclone-icon-connected-color@4x.png?raw=true" width="48px" align="center" alt="Rclone Icon" /> RcloneTray

RcloneTray is simple cross-platform GUI for [Rclone](https://rclone.org/), it's not covering 100% functionality, but
it's focus is on desktop experience and to provide a free altenative to [Mountain Duck](https://mountainduck.io/)

## Overview

![Screenshot](https://raw.githubusercontent.com/dimitrov-adrian/RcloneTray/v2/screenshot.png)

## Requirements

Only 64bit binaries are provided in the distributions.

Supported operation systems:

-   Windows 7/8/10 (x64)
-   macOS 10.10 and later
-   GNU/Linux (x64), GTK, and DE with tray icons support

To get mount function working, you need to install extra packages:

-   Windows - http://www.secfs.net/winfsp/download/
-   macOS - https://osxfuse.github.io/
-   Linux - fuse

## FAQ

**The application bundle comes with Rclone version XXX, but I want to use version YYY installed on my system**

Go "Preferences" and from "Advanced" tab, check option "Use system Rclone".

**Do not see some of my remotes**

The RcloneTray does not provide support for: _memory, local, http, compress, cache, union and chunker_

## Downloads

[Check latest releases](https://github.com/dimitrov-adrian/RcloneTray/releases)

## Contributing

Any help is welcome, just file an issue or pull request.

## Building

You'll need [Node.js](https://nodejs.org) and NPM installed on your computer in order to build this app.

```bash
$ git clone https://github.com/dimitrov-adrian/RcloneTray
$ cd RcloneTray
$ npm install
$ npm start
```

## License

This project is licensed under the [MIT](https://github.com/dimitrov-adrian/RcloneTray/blob/master/LICENSE.txt) License
