# vico

Video Speed Controller

This is a fork of [codebicycle/videospeed](https://github.com/codebicycle/videospeed).

## Features

- Change video speed (slower/faster/reset, via keybindings only)
- Filter (blacklist/whitelist, regex support)

## Motivation

While there are many similar extensions and forks for Firefox, they often have the following issues:

- Too many features
- Massive codebases
- Abandoned

These make code reviews difficult and tend to cause issues on websites. In addition, because this extension needs to run on all pages and all frames (for embedded videos), injecting a massive, disorganized script is undesirable for performance.

Therefore, this extension minimizes the injected content script (about 200 LOC) by focusing solely on speed adjustment and filtering, and cleaning up the codebase.

<details>
<summary>Why didn't you fork igrigorik/videospeed?</summary>

I was using `codebicycle/videospeed` on Firefox. Although its maintenance stopped in 2021, it still worked fine, except for breaking some websites and having a broken regex parser for the blacklist. Its injected code (`inject.js`) was also around 1,000 lines, which was a manageable size to fork.

I also considered forking the original `igrigorik/videospeed`, which is still maintained today, but its codebase was larger and I judged that forking it would be difficult. Moreover, because it only supports Chrome, considering the effort required to make it work on Firefox, I chose to fork `codebicycle/videospeed`.

</details>

## Installation

### Requirements

- pnpm

### Firefox

1. Run `pnpm install`
2. Run `pnpm zip`
3. Load `.output/firefox.xpi` from `about:addons`

### Chrome

1. Run `pnpm install`
2. Run `pnpm build:chrome`
3. Load `.output/chrome-mv3` from `chrome://extensions`

## Credits

- Copyright (c) 2014 Ilya Grigorik: Author of the [original](https://github.com/igrigorik/videospeed)
- Andrei Chelaru: Author of the [Firefox port](https://github.com/codebicycle/videospeed)
