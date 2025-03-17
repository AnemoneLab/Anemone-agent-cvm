#!/bin/bash

export http_proxy=http://127.0.0.1:1087
export https_proxy=http://127.0.0.1:1087
export ALL_PROXY=socks5://127.0.0.1:1080

# 版本标签
VERSION=v2.2.0
IMAGE_NAME=chainrex/anemone-agent-cvm

# 构建单一架构镜像 (仅linux/amd64)
echo "正在构建 $IMAGE_NAME:$VERSION 镜像 (仅linux/amd64)..."
docker build --platform linux/amd64 -t $IMAGE_NAME:$VERSION .
docker push $IMAGE_NAME:$VERSION
