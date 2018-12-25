# <img src="https://raw.githubusercontent.com/dimitrov-adrian/RcloneTray/master/src/ui/icons/source-icon-color.png" width="48px" align="center" alt="RcloneTray Icon" /> RcloneTray

[![Build Status](https://travis-ci.org/dimitrov-adrian/RcloneTray.svg?branch=master)](https://travis-ci.org/dimitrov-adrian/rclonetray)
[![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](http://standardjs.com)
![Dependencies](https://david-dm.org/dimitrov-adrian/RcloneTray/status.svg)

RcloneTray is simple cross-platform GUI for [Rclone](https://rclone.org/) and is intended to provide a free altenative to [Mountain Duck](https://mountainduck.io/)


## Overview
![Screenshot](https://raw.githubusercontent.com/dimitrov-adrian/RcloneTray/master/screenshot.png)


## Requirements
Only 64bit binaries are provided in distributions.

Supported operation systems:
* Windows 7/8/10 (x64)
* macOS 10.10 and later
* GNU/Linux (x64), DE with tray icons support

To get mount function working, you need to install extra packages:
* Windows - http://www.secfs.net/winfsp/download/
* macOS - https://osxfuse.github.io/
* Linux - fuse


## FAQ

**The application bundle comes with Rclone version XXX, but I want to use version YYY installed on my system**

Go "Preferences" and from "Rclone" tab, uncheck the option "Use bundled Rclone".


## Downloads
[Check latest releases](https://github.com/dimitrov-adrian/RcloneTray/releases)


## Contributing
Any help is welcome, just file an issue or pull request.


## Building

You'll need [Node.js](https://nodejs.org) installed on your computer in order to build this app.

```bash
$ git clone https://github.com/dimitrov-adrian/RcloneTray
$ cd RcloneTray
$ npm install
$ npm start
```


## License
This project is licensed under the [MIT](https://github.com/dimitrov-adrian/RcloneTray/blob/master/LICENSE.txt) License
