
# Table of Contents

1.  [Introduction](#org90ba54d)
2.  [Connected links](#org0cb9262)
3.  [️ Install](#org53522a3)
4.  [Usage](#orgc482a3f)
    1.  [Configuration](#orgea6b538)
    2.  [Available commands](#orgac72b2f)
    3.  [Available flags](#org03fe654)
5.  [Encryption.](#org2c5292b)
6.  [🍩 Contribute guide](#org3b2c6b1)

<div align='center'>

<img src='./images/image.png' width='256px' height='256px'>

</div>

&nbsp;

<div align='center'>

<span class='badge-buymeacoffee'>

<a href='https://www.paypal.me/darkawower' title='Paypal' target='_blank'><img src='https://img.shields.io/badge/paypal-donate-blue.svg' alt='Buy Me A Coffee donate button' /></a>

</span>

<span class='badge-patreon'>

<a href='https://patreon.com/artawower' target='_blank' title='Donate to this project using Patreon'><img src='https://img.shields.io/badge/patreon-donate-orange.svg' alt='Patreon donate button' /></a>

</span>

<a href="https://wakatime.com/badge/github/Artawower/orgnote-cli"><img src="https://wakatime.com/badge/github/Artawower/orgnote-cli.svg" alt="wakatime"></a>

</div>

<div align='center'>

<a href="https://twitter.com/org_note" target="_blank"><img src="https://img.shields.io/twitter/follow/org_note" alt="Twitter link" /></a>

<a href="https://emacs.ch/@orgnote" target="_blank"><img alt="Mastodon Follow" src="https://img.shields.io/mastodon/follow/113090697216193319?domain=https%3A%2F%2Ffosstodon.org&style=social"></a>

<a href="https://discord.com/invite/SFpUb2vSDm" target="_blank"><img src="https://img.shields.io/discord/1161751315324604417" alt="Discord"></a>

<a href="https://www.youtube.com/@OrgNote" target="_blank"><img alt="YouTube Channel Views" src="https://img.shields.io/youtube/channel/views/UCN14DUE5umdrlEm7odW3gOw"></a>

</div>


<a id="org90ba54d"></a>

# Introduction

NPM binary script for synchronising and publishing notes from org roam. Closely related to the Org Note project.
**WARNING**: This package doesn't provide a way to resolve conflicts and doesn't use CRDT yet! Be careful, and don't forget to backup your notes!


<a id="org0cb9262"></a>

# Connected links

-   [Org Note main repo.](https://github.com/Artawower/orgnote)


<a id="org53522a3"></a>

# ️ Install

    npm install -g orgnote-cli


<a id="orgc482a3f"></a>

# Usage


<a id="orgea6b538"></a>

## Configuration

Create `~/.config/orgnote/config.json` with next schema:

    export interface OrgNotePublishedConfig {
      remoteAddress: string;
      token: string;
      rootFolder: string;
      version: string;
      name?: string;
      debug?: boolean;
      logPath?: string;
      backupCount?: number;
      backupDir?: string;
      encrypt?: 'gpgPassword' | 'gpgKeys' | 'disabled';
    
      gpgPassword?: string;
      gpgPublicKeyPath?: string;
      gpgPrivateKeyPath?: string;
      gpgPrivateKeyPassphrase?: string;
    
    }

Example

    [
      {
        "name": "User 1",
        "remoteAddress": "http://localhost:8000/v1",
        "token": "289cd69d-e9fb-4ad0-a907-d44e46cac786",
        "rootFolder": "~/tmp/org-roam",
        "logPath": "~/tmp/logs/orgnote.log",
        "encrypt": "gpgPassword",
        "gpgPassword": "password"
      },
      {
        "name": "Local development",
        "remoteAddress": "http://localhost:8000/v1",
        "token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "rootFolder": "~/some/path/",
        "backupDir": "/tmp/orgnote/backups",
        "backupCount": 2
      },
      {
        "name": "Remote development",
        "remoteAddress": "http://<address>/api/v1",
        "token": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        "rootFolder": "~/some/path/"
      },
    ]


<a id="orgac72b2f"></a>

## Available commands

-   `publish` - publish single note
    `orgnote-cli publish  --remote-address http://url-here/ --token api-token /file/path`
-   `collect` -  forces loading of all notes from a remote resource. **WARNING**: this operation could override your local notes! 
    *Unsupported yet*
-   `publish-all` force publishing of all notes from the root folder. **WARNING**: this operation could overwrite remote notes.
-   `sync` - syncs all notes from the root folder into the remote service and vice versa. **WARNING**: this operation could override local and remote notes depens on timezone.


<a id="org03fe654"></a>

## Available flags

`--debug` enable additional info logging messages
`--force` clear local cache and last sync time


<a id="org2c5292b"></a>

# Encryption.

For exporting keys use next commands ([check official doc](https://www.gnupg.org/documentation/)). Make sure you have orgnote folder inside your `.config`

    mkdir -p ~/.config/orgnote

Export public key:

    gpg --armor --export <ID> > ~/.config/orgnote/public.key

Export private key

    gpg --armor --export-secret-key <ID> > ~/.config/orgnote/private.key


<a id="org3b2c6b1"></a>

# 🍩 Contribute guide

Any contribution is very much appreciated! Please read the [style guide](https://github.com/Artawower/orgnote/wiki/Contribution-guide) before contributing to avoid misunderstandings!
I would also appreciate it if you would consider becoming my [patron](https://www.patreon.com/artawower)

