![Minecraft Multiplayer Banner](https://www.minecraft.net/content/dam/games/minecraft/key-art/playtheway-minecraft.png.transform/minecraft-image-large/image.png)
Credit for all images and base server code: [Mojang](https://www.minecraft.net/en-us/about-minecraft)

# Minecraft Bedrock Edition Server
Made with ❤️ by Deb

## What is it?

This is a smart and relatively easy to use wrapper around the [Minecraft Bedrock Edition server](https://www.minecraft.net/en-us/download/server/bedrock/) that automatically backs up to local storage and (optionally) Amazon S3 at regular intervals. Note that the server software that this wraps is, as of the time of writing, currently in alpha.

![2 Players](https://www.minecraft.net/content/dam/minecraft/pmp/pmp-minecraft-howitworks-survive.png)

### Bedrock Edition vs. Java Edition
This is a Minecraft Bedrock Edition server, so it is designed to be connected to using the cross platform compatible Windows 10, Nintendo Switch, Xbox One, and Pocket editions of Minecraft, with a little luck. Though connecting to arbitrary servers (such as those set up using this software) from editions that are not the Windows 10 edition is not officially supported, there is a workaround that I tested that worked pretty well on Nintendo Switch, and which should(?) also work for other versions. (see the **Connecting from not Windows 10** section for info on how to do this)

[Official list of different Minecraft editions](https://help.minecraft.net/hc/en-us/articles/360034753992-Different-Minecraft-Editions)

### Who it's for
This is great for people who want to play online with their friends across different platforms using the Bedrock Edition of Minecraft, especially if they do not want to pay for a Minecraft Realms server and have a computer that they can turn on whenever they want to play to run the server.

If you're tech savvy enough, you could probably deploy this Node app to the cloud without much trouble, as long as the machine you're running it on has enough power to run a Minecraft server.

I've been playing with my friends, and this works great with our (relatively) small world sizes, giving us peace of mind since it periodically backs up our world in case we run into bugs in Mojang's alpha server software.

### Who it's not for
This server software is not designed to support dozens upon dozens of users, or for worlds whose sizes may expand to the order of gigabytes, since depending on your network connection, periodic backups may not work as well with large world sizes, even if your system's hardware can keep up. Furthermore, it has been written to be as easy as possible to get up and running and so does not have support for more advanced server features. Finally, Mojang's publicly released server software is (as of the time of writing) still in beta, and therefore is inherently more prone to bugs. You can try, and there's a good chance it would work, given that it is running on a machine with sufficient hardware and network bandwith, but do not be surprised if it does not.

## Getting Started
![Getting Started](https://www.minecraft.net/content/dam/minecraft/pmp/pmp-minecraft-howitworks-beresourceful.png)

### System requirements
- A computer with internet access running [Ubuntu 18.04](http://releases.ubuntu.com/18.04.4/) or later
  - An operating system which is based on Ubuntu 18.04 (such as [Linux Mint 19.3](https://www.linuxmint.com/download.php)) also works
  - Mojang also has a Windows 10 version of the alpha server software, but as of the time of writing, running this software on Windows 10 is not supported due to broken backup functionality in the Windows 10 version of Mojang's software
  - There are, as of yet, no hard guidelines on the specs you'll need, but most basic modern computers should be able to support at least 3-4 concurrent players. Don't quote me on this, though; Googling around is probably the way to go if you're worried about system requirements.
- You'll need to install [Node.js](https://nodejs.org/en/download/) on this computer
  - You'll also need npm, which should be installed alongside Node.js if you install it using default settings
  - The earliest version of Node.js that I tested with was version 12.16.2
- You'll need to be able to access and enable port forwarding on your router if you want friends to join
  - I'll link a tutorial for this further down
- Finally, everyone who wants to join the server (even you) will need Minecraft Bedrock Edition and a Microsoft account to login and play online

#### Optional Requirements
These aren't really necessary, but make things much nicer
- A domain that your friends can connect to (I created a subdomain on a domain I already owned)
- An [Amazon Web Services](https://aws.amazon.com/) account so the server can automatically store backups to [Amazon S3](https://aws.amazon.com/s3/)

### Reading Minecraft's EULA
TODO: Write

### Downloading the code

### Config file
TODO: Write

### Amazon S3 cloud backups (optional)
TODO: Write

### Starting the server
TODO: Write

#### Server commands
TODO: Write

### Connecting to the server
TODO: Write

#### Port forwarding
TODO: Write

#### Linking a domain (optional)
TODO: Write

#### Connecting from Windows 10
TODO: Write

#### Connecting from not Windows 10
TODO: Write

## The backup system
![Redstone](https://www.minecraft.net/content/dam/minecraft/pmp/pmp-minecraft-howitworks-buildsomething.png)

TODO: Write

## Known issues
TODO: Write

## Disclaimer
TODO: Write
