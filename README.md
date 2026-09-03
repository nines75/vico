# vico

Video Speed Controller

これは[codebicycle/videospeed](https://github.com/codebicycle/videospeed)のフォークです。

## 機能

- 動画の速度を変更(slower/faster/reset,キーバインド経由のみ)
- フィルター(blacklist/whitelist,正規表現サポート)

## Motivation

Firefoxに関して、多くの類似の拡張機能やforkがありますが、以下のような課題がありました。

- 機能が多すぎる
- コードが膨大すぎる
- 長期間メンテナンスされていない

これらはレビューを困難にし、サイト上で不具合を引き起こしやすくなります。また、この拡張は全てのページ・全てのフレーム(埋め込み動画用)で実行する必要があるため、巨大で整理されていないスクリプトを挿入することはパフォーマンス的にも望ましくありません。

そこで、この拡張は機能を速度の変更とフィルターに絞りコードベースを整理することで、挿入するコンテンツスクリプトを最小限(約200LOC)にしました。

<details>
<summary>なぜ`igrigorik/videospeed`をforkしなかったのですか？</summary>

自分はFirefoxで`codebicycle/videospeed`を使っていました。これは2021年でメンテナンスが停止しているにも関わらず、一部のサイトを壊すことやブラックリストの正規表現パーサーが壊れていることを除けば現在でも問題なく動いており、挿入されるコード(`inject.js`)も1k行程度でforkしやすい規模でした。

現在でもメンテナンスされているオリジナルの`igrigorik/videospeed`をforkすることも考えましたが、よりコードベースが巨大でforkが困難だと判断しました。また、Chrome版しか提供されていないため、Firefoxで動作するようにする手間も考え`codebicycle/videospeed`をforkすることを選択しました。

</details>

## インストール

### Requirements

- pnpm

### Firefox

1. `pnpm install`を実行
2. `pnpm zip`を実行
3. `about:addons`から`.output/firefox.xpi`を読み込む

### Chrome

1. `pnpm install`を実行
2. `pnpm build:chrome`を実行
3. `chrome://extensions`から`.output/chrome-mv3`を読み込む

## クレジット

- Copyright (c) 2014 Ilya Grigorik: [オリジナル](https://github.com/igrigorik/videospeed)の作者
- Andrei Chelaru: [Firefox port](https://github.com/codebicycle/videospeed)の作者
