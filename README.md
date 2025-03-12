# Anemone Agent CVM

这是Anemone项目中的Agent CVM组件，运行在TEE环境中，负责安全地管理钱包私钥。

## 功能

- 自动创建并管理单个Sui区块链钱包
- 在TEE环境中安全存储私钥
- 提供API接口用于获取钱包地址

## 开发环境设置

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

服务器默认在3001端口运行。

## API接口

### 健康检查

```
GET /health
```

返回服务状态。

### 获取钱包地址

```
GET /wallet
```

获取系统唯一钱包的地址信息。

## 部署到Phala Network

### 1. 构建Docker镜像

我们已经构建好的Docker镜像发布在Docker Hub上:

```
chainrex/anemone-agent-cvm:latest
```

#### 构建Docker镜像 (linux/amd64)

为了在Phala Network的TEE环境中正确运行，需要构建linux/amd64架构的Docker镜像：

```bash
# 给构建脚本添加执行权限
chmod +x build-push.sh

# 运行构建脚本
./build-push.sh
```

这个脚本会构建linux/amd64架构的镜像，并推送到Docker Hub。

> **注意**：如果遇到 `exec format error` 错误，通常表示Docker镜像的架构与Phala环境不兼容，需要确保镜像是为linux/amd64架构构建的。

### 2. 使用Phala Cloud部署CVM

#### 方法1: 使用部署脚本（推荐）

1. 设置Phala Cloud登录凭据:

```bash
# 创建环境变量文件
cat > .env.phala << EOL
PHALA_USERNAME=你的用户名
PHALA_PASSWORD=你的密码
EOL
```

2. 安装依赖:

```bash
npm install
```

3. 运行部署脚本:

```bash
npm run deploy-cvm
```

部署脚本会自动:
- 列出所有可用的Phala TeePods
- 依次尝试在每个TeePod上创建CVM，直到成功
- 如果所有TeePods都失败，将显示详细的错误信息

#### 方法2: 使用Phala Cloud控制台

1. 登录 [Phala Cloud控制台](https://console.phala.cloud)
2. 导航到CVM页面并点击"创建CVM"
3. 选择"来自Docker镜像"选项
4. 填写以下信息:
   - 名称: `anemone-agent-cvm`
   - 镜像: `chainrex/anemone-agent-cvm:latest`
   - CPU核心: 1
   - 内存: 2048MB
   - 磁盘: 40GB
   - 端口: 3001 (TCP)
   - 启用KMS (Key Management Service)
5. 点击"创建"按钮

### 3. 验证CVM部署

部署成功后，你会得到一个CVM ID和应用URL。使用这个URL访问你的服务:

```
https://你的应用URL/wallet
```

## 管理工具

项目提供了几个实用工具来帮助管理CVM:

```bash
# 列出所有可用的TeePods
npm run list-teepods

# 列出当前用户的所有CVM
npm run list-cvms

# 删除指定ID的CVM
npm run delete-cvm <CVM_ID>
```

## 故障排除

### exec format error

如果在Phala日志中看到 `exec /usr/local/bin/docker-entrypoint.sh: exec format error` 错误，这通常意味着Docker镜像的架构与Phala环境不兼容。需要确保镜像是为linux/amd64架构构建的，并且入口点脚本具有正确的权限和格式。

1. 确保使用了更新后的Dockerfile (指定 --platform=linux/amd64)
2. 使用 `build-push.sh` 脚本构建并推送linux/amd64架构的镜像
3. 在Phala控制台中删除现有CVM，然后重新部署

## 安全说明

- 私钥安全存储在TEE环境中
- 外部API只能访问公钥地址，无法获取私钥
- 在TEE环境中执行所有敏感操作，确保数据安全
- 使用Phala Network的KMS功能增强密钥安全性 