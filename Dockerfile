# ベースイメージ
FROM node:16.14.0

# 作業ディレクトリ
WORKDIR /usr/src/app

# 1) 依存だけ先にコピー＆インストール
COPY react_app/package*.json ./
RUN npm install

# 2) ソースコードをまとめてコピー
COPY react_app/ ./


# デフォルトコマンド
CMD ["npm", "start"]