---
layout: '../../layouts/BlogPost.astro'
publishDate: 20 Mar 2019
title: "Verizon Pixel and Pixel XL Bootloader Unlock"
author: dantuck
description: |
  As all Pixel owners should know by now there is a end of support scheduled for each phone they ship. I like many others have a perfectly functional Pixel device which will soon be vulnerable to security issues and without Google support I am left with little options. I am not one to need the latest and greatest so I have chosen to install LineageOS.
---

As all Pixel owners should know by now there is a end of support scheduled for each phone they ship. I like many others have a perfectly functional Pixel device which will soon be vulnerable to security issues and without Google support I am left with little options. I am not one to need the latest and greatest so I have chosen to install [LineageOS](https://wiki.lineageos.org/devices/sailfish/install "LineageOS").

The greatest problem with Verizon is that they prevent you from toggling the "OEM unlocking" which would allow you to wipe the device then sideload a new OS. To get around this follow these steps and you will be golden.

Unlocking the bootloader wipes the device, so back up anything you want to keep first. Also check the LineageOS page for your device before you start. I wrote this when the Pixel and Pixel XL were supported, and official builds for older devices end at some point.

Thank you to [@iamkellex](https://twitter.com/iamkellex "Kellen") of Droid Life, who [wrote up the method](https://www.droid-life.com/2018/05/28/verizon-pixel-xl-bootloader-unlock/). The post credits a long-running group effort on XDA for finding it.

 1. Remove Google account and any kind of screen lock from your device.
 2. Eject the Verizon sim card from your device. (You can use a slim paper clip)
 3. Reset your device. During setup skip everything. Don't connect to WiFi or setup any sort of security locking.
 4. Go to "Developer Options" and enable USB debugging.
 5. Connect your phone to your Computer which has `adb` installed.
 6. Open a terminal in the `adb` directory and type: <br /><br />`adb shell pm uninstall --user 0 com.android.phone`<br /><br />
 7. Restart your device.
 8. Connect to WiFi, open a web browser, and go to any website.
 9. Go to "Developer Options" and enable OEM unlocking.
1.  Reboot into the bootloader with `adb reboot bootloader`, then unlock it with: <br /><br />`fastboot oem unlock`<br />or<br />`fastboot flashing unlock`<br /><br />Confirm the prompt on the phone. This wipes the device.
2.  Congrats, you are unlocked and can continue installing another OS.

## Changelog

> **2026-10-26**
>
> * Corrected the unlock step. The `fastboot` commands do not reboot the phone, so it must be in the bootloader first (`adb reboot bootloader`).
> * Fixed the credit. The handle was misspelled, and the source credits an XDA group effort for the method.
> * Added a warning that unlocking wipes the device and that LineageOS support for older Pixels may have ended.
