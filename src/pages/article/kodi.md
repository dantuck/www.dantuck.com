---
draft: true
---

(Current Version - 18.7)

sudo apt-get update
sudo apt-get install kodi


https://www.raspberrypi.org/documentation/configuration/security.md

https://www.raspberrypi.org/documentation/configuration/external-storage.md


If you only care to have a kodi running when the raspberry starts, instead of make a service you could use the simpler 'crontab' method mentioned in the wiki

Edit the crontab:

crontab -e

Add:

@reboot kodi --standalone

just that.

Note that if you use the root crontab (ie: sudo crontab -e) kodi will get his settings fron the root user, and will be a different config that you see when you start it from the pi normal user.
