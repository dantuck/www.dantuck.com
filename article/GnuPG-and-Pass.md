---
date: 2019-10-31T06:10:00-06:00
title: "GnuPG and Pass"
layout: layouts/post.njk

---

I find myself constantly referring to different sources to setup my password manager; [Pass](https://www.passwordstore.org/ "www.passwordstore.org"). This reference is going to provide a source for reference that includes both.

### Installation

References (Archlinux)

* https://wiki.archlinux.org/index.php/Pass
* https://wiki.archlinux.org/index.php/GnuPG

#### GnuGP

According to the [official website](https://www.gnupg.org/ "GnuGP"):

GnuPG is a complete and free implementation of the OpenPGP standard as defined by RFC4880 (also known as PGP). GnuPG allows you to encrypt and sign your data and communications; it features a versatile key management system, along with access modules for all kinds of public key directories. GnuPG, also known as GPG, is a command line tool with features for easy integration with other applications. A wealth of frontend applications and libraries are available. GnuPG also provides support for S/MIME and Secure Shell (ssh).

[Install](https://wiki.archlinux.org/index.php/Install "Install") the [gnugp](https://www.archlinux.org/packages/?name=gnupg "gnupg") package.
```bash
    $ sudo pacman -S gnugp
```
Configurations and the gnugp store will be saved at `~/.gnupg`.

The configurations are stored in the following files: `~/.gnupg/gpg.conf` and `~/.gnupg/dirmngr.conf`.

**Create a key pair**
```bash
    $ gpg --full-gen-key
```
**Restore a key pair**

In my case I have three devices and instead of each device having it's own key pair I share the key pair between all the devices. When a new devices is used or a device is reset I sync the keys to the device and restore the key pair.

_Export private key_
```bash
    $ gpg --export-secret-keys --armor <user-id> > privkey.asc
```
_Import private key_
```bash
    $ gpg --import privkey.asc
```
__***Important!: This method is entirely done in full trust and there are better ways***__

On the new machine you must trust the key:
```bash
    $gpg --edit-key <gpg key>
    gpg> trust
```
Next step you are presented with the following:
```bash
    Please decide how far you trust this user to correctly verify other users' keys
    (by looking at passports, checking fingerprints from different sources, etc.)

        1 = I don't know or won't say
        2 = I do NOT trust
        3 = I trust marginally
        4 = I trust fully
        5 = I trust ultimately
        m = back to the main menu

    Your decision?
```
In my case this was my key so I chose 5 and was presented with the following screen:
```bash
    Your decission? 5
    Do you really want to set this key to ulimate trust? (y/N) y
```


#### Pass

[Install](https://wiki.archlinux.org/index.php/Install "Install") the [pass](https://www.archlinux.org/packages/?name=pass "pass") package.
```bash 
    $ sudo pacman -S pass
```
To initialize the password store:
```bash
    $ pass init <gpg-id or email>
```
After local initialization the password store needs to be initialized as a git repository and synced with it's origin.
```bash
    $ pass git init
    $ pass git remote add origin { insert git origin }
```
To restore from an existing repo you will clone the git repo into `.password-store`.
```bash
    $ git clone <repo> ~/.password-store
```
There is not a particular scheme for organization of the structure or content of data but I follow what the author uses and suggests:
```bash
    THE_COMPLICATED_PASSWORD
    URL: *.url.com/*
    Username: username_or_email
    Secret Question 1: Some really good question
    Secret Answer 1: The answer to the question
    Phone Support PIN #: Pin
```
Set default `EDITOR`

For `zsh`:
```bash
    echo "export EDITOR=vim" >>~/.zshrc
```
For `bash`:
```bash
    echo "export EDITOR=vim" >>~/.profile
```
#### Conclusion

This is a living document so it will change over time with added details. I will include a changelog at the bottom of this post so you know what has been going on. Thank you for reading!

#### Changelog

> **2020-05-03**
>
> * Updated restore a key section to include trusting the imported key.
> * Set default `EDITOR` directions for `zsh` and `bash`.
> * Added how to clone an existing git repo for pass usage.