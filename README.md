# Features

![screenshot](https://images2.imgbox.com/30/25/ytKdokCa_o.png)

In the old twitch UI you could see which channels a channel follows. As pointed out in e.g. [this](https://www.reddit.com/d9l2go) reddit thread the new UI does not have this feature anymore. This addon aims to add this feature back (+ add a few new handy things).

- view which channels a channel follows
- ability to follow these channels instantly
- massfollow all channels a channel follows

# Limitations

Twitch implements a ratelimit of 15 follow-mutations a minute. Even tho the addon is able to send only one request for each massfollow (thanks to [twitchs private graphql api](https://github.com/mauricew/twitch-graphql-api)) it has to send multiple [mutations](https://graphql.org/learn/queries/#mutations) within that request. The addon handles these ratelimits tho and waits a minute for every ratelimit that occurs. This means that massfollowing a lot of channels can take its time. A progress bar will show the current progress of the operation. simply leave the tab open until its completed.

# TODO

- Show infotext if user follows no one
- fix website breaking on tab change
- remove massfollow button on tab change
- export/import list of channels to follow
- select tab directly if channel urls ends with /follows
- option to change sort order

If you feel like adding any of these things yourself feel free to open up a pull request

# Installation

1. Download the [latest release zip](https://github.com/gthvmt/twitch-follows/releases/latest)
2. Go to chrome://extensions
3. Enable developer mode if not already done
4. Click on load unpacked and select the unzipped release

# Disclaimer

Uses private graphql api. use at your own risk.
