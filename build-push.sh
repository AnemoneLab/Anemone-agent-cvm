#!/bin/bash

# 版本标签
VERSION=v1.2.0
IMAGE_NAME=chainrex/anemone-agent-cvm

# 构建单一架构镜像 (仅linux/amd64)
echo "正在构建 $IMAGE_NAME:$VERSION 镜像 (仅linux/amd64)..."
docker build --platform linux/amd64 -t $IMAGE_NAME:$VERSION .
docker push $IMAGE_NAME:$VERSION

echo "镜像已成功构建并推送到Docker Hub: $IMAGE_NAME:$VERSION " 