+++
date = "2019-10-31T14:45:02-06:00"
draft = true
title = "Restic backup + Backblaze B2 + Rclone"

+++
<!-- ## Restic backup + Backblaze B2 +  -->

[https://restic.readthedocs.io/en/latest/020_installation.html#from-source](https://restic.readthedocs.io/en/latest/020_installation.html#from-source "https://restic.readthedocs.io/en/latest/020_installation.html#from-source")

[https://www.backblaze.com/b2/cloud-storage.html](https://www.backblaze.com/b2/cloud-storage.html "https://www.backblaze.com/b2/cloud-storage.html")

[https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html#backblaze-b2](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html#backblaze-b2 "https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html#backblaze-b2")

https://rclone.org/

Restic can backup data to any Backblaze B2 bucket. You need to first setup the following environment variables with the credentials you can find in the dashboard on the “Buckets” page when signed into your B2 account:

    $ export B2_ACCOUNT_ID=<MY_ACCOUNT_ID>
    $ export B2_ACCOUNT_KEY=<MY_SECRET_ACCOUNT_KEY>

<!-- Note

In case you want to use Backblaze Application Keys  replace <MY_ACCOUNT_ID> and <MY_SECRET_ACCOUNT_KEY> with  <applicationKeyId> and <applicationKey> respectively. -->

You can then initialize a repository stored at Backblaze B2. If the bucket does not exist yet and the credentials you passed to restic have the privilege to create buckets, it will be created automatically:

    $ restic -r b2:bucketname:path/to/repo init
    enter password for new backend:
    enter password again:
    created restic backend eefee03bbd at b2:bucketname:path/to/repo
    Please note that knowledge of your password is required to access the repository.
    Losing your password means that your data is irrecoverably lost.

Note that the bucket name must be unique across all of B2.

The number of concurrent connections to the B2 service can be set with the `-o b2.connections=10` switch. By default, at most five parallel connections are established.

### Restic Backup

`restic backup path/to/folder` Creates a new backup of files and/or directories. 

### Restic Check

`restic check` checks for errors and verifies that all data is properly stored in the repository. I run this regularly after every backup task completes.

### Restic Forget

`restic forget` is essentially a backup rotation tool. It will remove snapshots from a repository and keep it more manageable over time.

    $ restic forget --keep-daily 7 --keep-weekly 5 --keep-monthly 12 --keep-yearly 2 --prune

The above will keep the most recent 7 daily snapshots, then 4 (remember, 7 dailies already include a week!) last-day-of-the-weeks and 11 or 12 last-day-of-the-months (11 or 12 depends if the 5 weeklies cross a month). And finally 2 last-day-of-the-year snapshots. All other snapshots are removed.

* `--keep-daily n` for the last n days which have one or more snapshots, only keep the last one for that day.
* `--keep-weekly n` for the last n weeks which have one or more snapshots, only keep the last one for that week.
* `--keep-monthly n` for the last n months which have one or more snapshots, only keep the last one for that month.
* `--keep-yearly n` for the last n years which have one or more snapshots, only keep the last one for that year.

Finally `--prune` actually removes the data that was referenced by the snapshot from the repository.