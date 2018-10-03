+++
date = "2018-10-03T14:45:02-06:00"
draft = true
title = "Backup"

+++
## Backblaze B2

[https://restic.readthedocs.io/en/latest/020_installation.html#from-source](https://restic.readthedocs.io/en/latest/020_installation.html#from-source "https://restic.readthedocs.io/en/latest/020_installation.html#from-source")

[https://www.backblaze.com/b2/cloud-storage.html](https://www.backblaze.com/b2/cloud-storage.html "https://www.backblaze.com/b2/cloud-storage.html")

[https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html#backblaze-b2](https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html#backblaze-b2 "https://restic.readthedocs.io/en/stable/030_preparing_a_new_repo.html#backblaze-b2")

Restic can backup data to any Backblaze B2 bucket. You need to first setup the following environment variables with the credentials you can find in the dashboard in on the “Buckets” page when signed into your B2 account:

    $ export B2_ACCOUNT_ID=<MY_ACCOUNT_ID>
    $ export B2_ACCOUNT_KEY=<MY_SECRET_ACCOUNT_KEY>

Note

In case you want to use Backblaze Application Keys  replace <MY_ACCOUNT_ID> and <MY_SECRET_ACCOUNT_KEY> with  <applicationKeyId> and <applicationKey> respectively.

You can then initialize a repository stored at Backblaze B2. If the bucket does not exist yet and the credentials you passed to restic have the privilege to create buckets, it will be created automatically:

    $ restic -r b2:bucketname:path/to/repo init
    enter password for new backend:
    enter password again:
    created restic backend eefee03bbd at b2:bucketname:path/to/repo
    Please note that knowledge of your password is required to access the repository.
    Losing your password means that your data is irrecoverably lost.

Note that the bucket name must be unique across all of B2.

The number of concurrent connections to the B2 service can be set with the `-o b2.connections=10` switch. By default, at most five parallel connections are established.

restic check