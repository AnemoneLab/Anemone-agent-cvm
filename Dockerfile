FROM node:18-alpine

WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY . .

# 创建数据目录
RUN mkdir -p /app/data

# 构建TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3001

# 启动应用
CMD ["node", "dist/index.js"] 