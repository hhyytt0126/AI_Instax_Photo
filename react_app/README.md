# AIチェキ
撮影した写真をアニメ調に変換できるサービスの業務効率化のためのWebサイトのコードです。
## 環境構築
### Dockerのインストール
まだインストールしていなければ、以下のリンクからインストールしてください。
https://www.docker.com/products/docker-desktop
### Dockerイメージのビルド

```sh
docker-compose build
```

### コンテナの起動
```sh
docker-compose up
```

## フォルダ構成

```plaintext
react_app/
├── public/
│   ├── index.html
│   └── ...
├── src/
│   ├── components/
│   │   ├── atoms/ (機能の最小単位)
│   │   ├── blocks/(atomsをいくつか組み合わせて作成した機能)
│   │   └── modules/(実際のPage)
│   ├── App.js(ここがreactの心臓部分、Routingなどを行っている)
│   ├── index.js
│   └── ...
├── package.json
└── docker-compose.yml
```