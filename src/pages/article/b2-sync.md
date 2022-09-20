---
setup: |
  import Layout from '../../layouts/BlogPost.astro'
publishDate: 27 Oct 2021
draft: true
title: "B2 Sync"
author: dantuck
description: |
  We need a desc
---

## Download b2

<!-- https://www.backblaze.com/b2/docs/quick_command_line.html

https://f000.backblazeb2.com/file/backblazefiles/b2/cli/linux/b2

chmod +x b2

https://help.backblaze.com/hc/en-us/articles/226937867-How-do-I-use-the-b2-sync-command-

```
b2 sync [--delete] [--keepDays N] [--skipNewer] [--replaceNewer] \

        [--compareVersions <option>] [--threads N] [--noProgress] \

        [--excludeRegex <regex>] <source file location> <B2 bucket destination>
```

To initially upload a source directory to a B2 bucket destination: 

Call "b2 sync <source file location> <B2 bucket destination>"

File uploads are done in parallel in multiple threads 

The default number of threads is 10.  Progress is displayed on the console unless '--noProgress' is specified.  A list of actions taken is always printed. There is not a set amount of threads that will work best in every scenario or for every user. We recommend that you start with the default 10 threads and watch you system activity. If you are maxing out your CPU, RAM, disk or network usage, decrease the number of threads. If you aren't, try to keep increasing the number of threads until you see performance dip. It is a trial and error process to find the right number of threads for your use case.

 

Now that you have your directory uploaded to B2, let's say you make changes to the directory files locally (i.e update your files and keep the same names). Here are some different use cases you may run into


You can upload changes to all files and keep previous versions for set amount of days

For example, to make the destination match the source, but retain previous versions for 30 days, call       "b2 sync --keepDays 30 --replaceNewer <source file location> <B2 bucket destination>". You'll still upload new file versions, however the older versions will now set to be removed in 30 days.

For files that are present in the B2 bucket compared to the source:

When a destination file is present that is not in the source, the default is to leave it there.  Specifying "--delete" means to delete destination files that are not in the source. This will delete older versions of updated files as well.

Files at the source that have a newer modification time are always copied to the destination.  If the destination file is newer, the default is to report an error and stop.  But with "--skipNewer" set, those files will just be skipped.  With "--replaceNewer" set, the old file from the source will replace the newer one in the destination.


????
rclone sync ~/backup/photos-repo/ b2:dantuck/photos --progress

b2 sync --delete --threads 2 ~/backup/photos-repo b2:dantuck/photos 

  -->