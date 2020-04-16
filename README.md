![Minecraft Multiplayer Banner](https://www.minecraft.net/content/dam/games/minecraft/key-art/playtheway-minecraft.png.transform/minecraft-image-large/image.png)
Credit for all images and base server code: [Mojang](https://www.minecraft.net/en-us/about-minecraft)

# Minecraft Bedrock Edition Server
Made with ❤️ by Deb

## What Is It?

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

## Setting It Up
![Getting Started](https://www.minecraft.net/content/dam/minecraft/pmp/pmp-minecraft-howitworks-beresourceful.png)

### System requirements
- A computer with internet access running [Ubuntu 18.04](http://releases.ubuntu.com/18.04.4/) or later
  - An operating system which is based on Ubuntu 18.04 (such as [Linux Mint 19.3](https://www.linuxmint.com/download.php)) also works
  - Mojang also has a Windows 10 version of the alpha server software, but as of the time of writing, running this software on Windows 10 is not supported due to broken backup functionality in the Windows 10 version of Mojang's software
  - There are, as of yet, no hard guidelines on the specs you'll need, but many entry level modern desktop computers should be able to support a handful of concurrent players. Don't quote me on this, though; Googling around is probably the way to go if you're worried about system requirements.
- You'll need to install [Node.js](https://nodejs.org/en/download/) on this computer
  - You'll also need npm, which should be installed alongside Node.js if you install it using default settings
  - The earliest version of Node.js that I tested with was version 12.16.2
- You'll need to be able to access and enable port forwarding on your router if you want friends to join
  - I'll link a tutorial for this further down
- Finally, everyone who wants to join the server (even you) will need Minecraft Bedrock Edition and a Microsoft account to login and play online. Since no official Linux client exists for Minecraft Bedrock Edition, you won't be able to connect to the server from the same computer you're running it on, barring any virtual machine shenanigans

#### Optional requirements
These aren't really necessary, but make things much nicer
- A domain that your friends can connect to (I created a subdomain on a domain I already owned) so you don't have to have your IP address floating around in people's inboxes
- An [Amazon Web Services](https://aws.amazon.com/) account so the server can automatically store backups to [Amazon S3](https://aws.amazon.com/s3/)

### Reading Minecraft's EULA
By using this software, you are agreeing to the official Minecraft [End User License Agreement and Privacy Policy](https://www.minecraft.net/en-us/download/server/bedrock/), since this software automatically download's Mojang's software when you first run it.

### Downloading the code
Download and unzip the code from GitHub, or clone the repository. Make sure the code is in the directory where you want your world and local backups to live.

### Config file
Rename the `EXAMPLE_config.json` file to `config.json` and delete the comment lines at the top of the file. Then, change the values you want to change:
| Value | Description |
| ----------- | ----------- |
| `accept-official-minecraft-server-eula` | Whether or not you agree to the official Minecraft [End User License Agreement and Privacy Policy](https://www.minecraft.net/en-us/download/server/bedrock/). **You must agree by setting this to true in order to run this software** |
| `server-properties` | These are the base properties that define server behavior. Most should be self explanatory, but you can find more detailed descriptions [here](https://minecraft.gamepedia.com/Server.properties#Bedrock_Edition_3). **Be careful about changing the server and level names after you've run the server, since this may mess up how the server locates backups** |
|`backup`|See the **The Backup System** section further down this page for more details on how this works|

### Amazon S3 cloud backups (optional)
If you want your backups to also be stored remotely, you'll need to setup the AWS connection:
1. Sign up for an [Amazon Web Services](https://aws.amazon.com/) account, and make sure you can access the [Amazon S3](https://aws.amazon.com/s3/) console.
2. Set up your AWS credentials in `~/.aws/credentials` using the first step of [this guide](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html). It is highly recommended that you create an IAM user with access to only S3.
3. Set `use-aws-s3-backup` under the `backup` field of the `config.json` file to true.
4. Read the **The Backup System** section further down this page for more details on how the backup logic works. This is highly recommended if you're using Amazon S3 backups since tweaking the settings described there will affect the way your S3 storage is used.

**Warning: Keep an eye on the sizes of the backups that are uploaded to the S3 bucket - Minecraft worlds start out pretty small, but can become quite large, so uploading and downloading backups frequently could get expensive if things get too crazy. So far, I haven't had problems with my smallish world, but you can never be too careful.**

### Starting the server
Since this is a [Node.js](https://nodejs.org/) application, after you download the code, you need to run the following command from the terminal within the directory you installed it to:
`npm install`

After that, you can start the server with the following command:
`npm start`

You don't need to rerun `npm install` every time you run the server, just `npm start`

### Stopping the server
**DO NOT use Ctrl+C/termination/kill commands to stop the server**

The server has built in protections to restore the state of your world if it is killed in a non graceful manner or something else bad happens (that's what the backups are for), but you may lose all progress since your last save.

In order to properly stop the server, type in the following command:
`stop`

### Connecting to the server

#### Port forwarding/IP stuff
Take a note of the `server-port` field that you set under `server-properties` in `config.json`. This is the port that the server will listen on once you set up port forwarding, and you'll need to give this to anyone who wants to connect to it. The default value for this is 19132.

First, you need to figure out what your machine's IP address within your local network is. I found mine using the `ifconfig` command in the terminal, but if that doesn't work, a little bit of Googling should help you find it. It's usually somethin like `192.168.(something).(something)`

Once you have your port, and the internal IP address of your machine, you need to set up port forwarding on your router. This can vary from router to router, but shouldn't be too tricky - I recommend GOogling how to do this. You want to associate the port that your server will listen on to your machine's local ip address.

Also take a note of your external IP address - Googling 'what is my ip' will give this to you. (Google gives it to you within the search results page). If you don't link a domain, you'll have to give this to your friends so they can connect to your server, so be extremely careful who you share this with.

#### Linking a domain (optional)
Once again, Google will likely give you a much more comprehensive tutorial on how to do this than I can here. My domain is connected to Cloudflare, so I used [this tutorial](https://www.youtube.com/watch?v=9xfsH7bmSFc) to link my domain, though it should help even if you don't use Cloudflare. Note that when the tuutorial says you should enter your ip address and port, you should use the external ip address you found by Googling, and the port you set in the config file.

#### Connecting from the Windows 10 Edition
Connecting from the Windows 10 edition is thankfully pretty easy

Open Minecraft, make sure you're logged in to your Microsoft account, and navigate to the 'servers' tab. Once there, you'll need to add your server.

- **Server Name**: I don't think the server name you enter matters, so enter whatever you like here
- **Server Address**: This depends on where you're connecting from, and whether or not you've linked your server to a domain
  - If you're on the same network as your server, enter your server's ip address (the one you found with `ifconfig`) when setting up port forwarding
  - If you're on a different network (this is likely the case for your friends) and you don't have a linked domain, then you'll need to enter your external ip address you found through Google (having a linked domain is recommended, but if you do not have one, please be very careful about who you give out your ip to)
  - If you're on a different network and you do have a linked domain, just enter the domain
- **Port**: The port entered in `server-port` under the `server-properties` field of `config.json` (the default value for this is `19132`)

#### Connecting from the not Windows 10 Editon
If you're not using the Windows 10 Edition, you may still be able to connect. Try the same steps as ... TODO: Write

## The Backup System
![Redstone](https://www.minecraft.net/content/dam/minecraft/pmp/pmp-minecraft-howitworks-buildsomething.png)

TODO: Write

## Known Issues
TODO: Write

## Disclaimer
TODO: Write
