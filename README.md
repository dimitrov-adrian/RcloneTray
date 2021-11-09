# <img src="https://github.com/dimitrov-adrian/RcloneTray/blob/v2/icons/rclone-icon-connected-color@4x.png?raw=true" width="48px" align="center" alt="Rclone Icon" /> RcloneTray

RcloneTray is simple cross-platform GUI for [Rclone](https://rclone.org/) that is aimed to provide open source
alternative to [Mountain Duck](https://mountainduck.io/)

## Overview

![Screenshot](https://raw.githubusercontent.com/dimitrov-adrian/RcloneTray/v2/screenshot.png)

## Downloads

[Check latest releases](https://github.com/dimitrov-adrian/RcloneTray/releases)

_Only 64 bit binaries are provided as pre-build packages._

## Requirements

Supported operation systems:

- Windows 7/8/10
- macOS 10.10 and later
- GNU/Linux, GTK, and DE with tray icons support

To get mount function working, you need to install fuse 3rd party library as dependency:

- Windows - [winfsp](http://www.secfs.net/winfsp/rel/)
- macOS - [osxfuse](https://github.com/osxfuse/osxfuse/releases)
- Linux - [fuse](https://command-not-found.com/mount.fuse) (most probably it is already installed on your system)

## FAQ

**The application bundle comes with Rclone version XXX, but I want to use version YYY installed on my system**

Go "Preferences" and from "Advanced" tab, check option "Use system Rclone".

**Do not see some of my remotes**

The RcloneTray does not provide support for: _memory, local, http, compress, cache, union and chunker_

## Contributing

Any help is welcome, just file an issue or pull request.

## Running from source

You'll need [Node.js](https://nodejs.org) and NPM installed on your computer in order to build this app.

```bash
$ git clone https://github.com/dimitrov-adrian/RcloneTray
$ cd RcloneTray
$ npm install
$ npm start
```

## License

This project is licensed under the [MIT](https://github.com/dimitrov-adrian/RcloneTray/blob/master/LICENSE.txt) License
