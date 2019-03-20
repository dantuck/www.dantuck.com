+++
date = "2018-10-02T12:58:50-06:00"
draft = true
title = "Verizon Pixel and Pixel XL Bootloader Unlock"

+++
In Visual Studio we are all used to being able to use CTRL+SHIFT+U to transform the selected text to uppercase but for Visual Studio Code this key binding was left out. As long as you are using _Version 1.8.1 or above_ you will be able to take advantage of the built in keyboard shortcuts. Do the following to enable the keybindings.

_Note: Ubuntu users will need to use a modified binding; change to ctrl+alt+u and ctrl+alt+l._

_File-> Preferences -> Keyboard Shortcuts_.

An editor will appear with keybindings.json file. Place the following JSON in there and save.

 1. Remove Google account and any kind of screen lock from your device.
 2. Eject the Verizon sim card from your device. (You can use a slim paper clip)
 3. Reset your device. During setup skip everything. Don't connect to WiFi or setup any sort of security locking.
 4. Go to "Developer Options" and enable USB debugging.
 5. Connect your phone to your Computer which has `adb` installed.
 6. Open a terminal in the `adb` directory and type:  
      
    `adb shell pm uninstall --user 0 com.android.phone`
 7. Restart your device.
 8. Connect to WiFi, open a web browser, and go to any website.
 9. Go to "Developer Options" and enable OEM unlocking.
10. Reboot into bootloader via:  
      
    `fastboot oem unlock`  
    or  
    `fastboot flashing unlock`
11. Congrats you are unlocked and can continue installing another OS.