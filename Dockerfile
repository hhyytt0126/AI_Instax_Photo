FROM node:16.14.0
RUN if ! which yarn > /dev/null 2>&1; then npm install -g yarn; fi
WORKDIR /usr/src/app
