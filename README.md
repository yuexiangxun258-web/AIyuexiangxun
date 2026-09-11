# 李浩栋 AI 个人作品站

基于 Vinext、React 和 TypeScript 制作的 AI 影视个人作品网站。

## 本地运行

需要 Node.js 22.13 或更高版本，并使用 pnpm：

```bash
pnpm install
pnpm dev
```

浏览器访问 `http://localhost:3000/`。

## 构建

```bash
pnpm build
```

## 视频资源

网站视频已存放在 Cloudflare R2，网页会从以下地址加载：

`https://pub-9b96ac52d99f4c28a93088ba636ccac8.r2.dev/videos/`

`public/videos` 只作为本地备份，不需要上传到 GitHub。

## Cloudflare Pages 部署

- 生产分支：`main`
- 构建命令：`pnpm build`
- 构建输出目录：`dist`
- 根目录：留空

依赖目录、开发缓存和构建产物已通过 `.gitignore` 排除，无需上传。
