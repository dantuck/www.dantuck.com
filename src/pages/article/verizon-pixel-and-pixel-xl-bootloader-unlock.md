---
setup: |
  import Layout from '../../layouts/BlogPost.astro'
publishDate: 20 Mar 2019
title: "Verizon Pixel and Pixel XL Bootloader Unlock"
author: dantuck
description: |
  As all Pixel owners should know by now there is a end of support scheduled for each phone they ship. I like many others have a perfectly functional Pixel device which will soon be vulnerable to security issues and without Google support I am left with little options. I am not one to need the latest and greatest so I have chosen to install LineageOS.
---

As all Pixel owners should know by now there is a end of support scheduled for each phone they ship. I like many others have a perfectly functional Pixel device which will soon be vulnerable to security issues and without Google support I am left with little options. I am not one to need the latest and greatest so I have chosen to install [LineageOS](https://wiki.lineageos.org/devices/sailfish/install "LineageOS").

The greatest problem with Verizon is that they prevent you from toggling the "OEM unlocking" which would allow you to wipe the device then sideload a new OS. To get around this follow these steps and you will be golden.

Thank you to [@iamhellex](https://twitter.com/iamkellex "Kellen"), [source](https://www.droid-life.com/2018/05/28/verizon-pixel-xl-bootloader-unlock/).

 1. Remove Google account and any kind of screen lock from your device.
 2. Eject the Verizon sim card from your device. (You can use a slim paper clip)
 3. Reset your device. During setup skip everything. Don't connect to WiFi or setup any sort of security locking.
 4. Go to "Developer Options" and enable USB debugging.
 5. Connect your phone to your Computer which has `adb` installed.
 6. Open a terminal in the `adb` directory and type: <br /><br />`adb shell pm uninstall --user 0 com.android.phone`<br /><br />
 7. Restart your device.
 8. Connect to WiFi, open a web browser, and go to any website.
 9. Go to "Developer Options" and enable OEM unlocking.
1.  Reboot into bootloader via: <br /><br />`fastboot oem unlock`<br />or<br />`fastboot flashing unlock`<br /><br />
2.  Congrats, you are unlocked and can continue installing another OS.