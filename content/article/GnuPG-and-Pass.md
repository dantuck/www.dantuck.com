+++
date = "2019-10-31T06:10:00-06:00"
title = "GnuPG and Pass"

+++

I find myself constantly referring to different sources to setup my password manager; [Pass](https://www.passwordstore.org/ "www.passwordstore.org"). This reference is going to provide a source for reference that includes both.

### Installation

References (Archlinux)

* https://wiki.archlinux.org/index.php/Pass
* https://wiki.archlinux.org/index.php/GnuPG

#### GnuGP

According to the [official website](https://www.gnupg.org/ "GnuGP"):

GnuPG is a complete and free implementation of the OpenPGP standard as defined by RFC4880 (also known as PGP). GnuPG allows you to encrypt and sign your data and communications; it features a versatile key management system, along with access modules for all kinds of public key directories. GnuPG, also known as GPG, is a command line tool with features for easy integration with other applications. A wealth of frontend applications and libraries are available. GnuPG also provides support for S/MIME and Secure Shell (ssh).

[Install](https://wiki.archlinux.org/index.php/Install "Install") the [gnugp](https://www.archlinux.org/packages/?name=gnupg "gnupg") package.

    $ sudo pacman -S gnugp

Configurations and the gnugp store will be saved at `~/.gnupg`.

The configurations are stored in the following files: `~/.gnupg/gpg.conf` and `~/.gnupg/dirmngr.conf`.

**Create a key pair**

    $ gpg --full-gen-key

**Restore a key pair**

In my case I have three devices and instead of each device having it's own key pair I share the key pair between all the devices. When a new devices is used or a device is reset I sync the keys to the device and restore the key pair.

_Export private key_

    $ gpg --export-secret-keys --armor <user-id> > privkey.asc

_Import private key_

    $ gpg --import privkey.asc

__***Important!: This method is entirely done in full trust and there are better ways***__

#### Pass

[Install](https://wiki.archlinux.org/index.php/Install "Install") the [pass](https://www.archlinux.org/packages/?name=pass "pass") package.
    
    $ sudo pacman -S pass

To initialize the password store:

    $ pass init <gpg-id or email>

After local initialization the password store needs to be initialized as a git repository and synced with it's origin.

    $ pass git init
    $ pass git remote add origin { insert git origin }

There is not a particular scheme for organization of the structure or content of data but I follow what the author uses and suggests:

    THE_COMPLICATED_PASSWORD
    URL: *.url.com/*
    Username: username_or_email
    Secret Question 1: Some really good question
    Secret Answer 1: The answer to the question
    Phone Support PIN #: Pin

One last change I add to my `~/.profile` is the `EDITOR` I prefer to use:

    echo "export EDITOR=vim" >>~/.profile

#### Conclusion

This is a living document so it will change over time with added details. I will include a changelog at the bottom of this post so you know what has been going on. Thank you for reading!

#### Changelog

No changes yet.