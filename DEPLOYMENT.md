# 部署说明（GitHub Actions 自动部署）

推送到 `main` 分支即自动构建并部署到源站，`workflow_dispatch` 也支持手动触发。
工作流文件：[`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)

## 部署方式

1. GitHub Actions 检出代码，`npm ci` 安装依赖，`npm run build` 产出 `dist/`。
2. 把 `dist/` 打包成 tar，通过 SSH 流式传给源站，在服务器端解包到站点根目录。
3. 解包前会清空根目录下除 `.user.ini` 外的全部内容（避免旧的带 hash 文件名的资源堆积），
   `.user.ini` 是宝塔加了 `chattr +i` 的不可变文件，跳过它单纯是因为删不掉，跟本项目无关。

不需要服务器上装 rsync，只需要 `ssh` + `tar`。

## 服务器目标路径

```text
/www/wwwroot/attendance-app
```

## 需要在 GitHub 仓库配置的 Secrets

路径：仓库 → Settings → Secrets and variables → Actions → New repository secret

| Secret 名称 | 说明 |
|---|---|
| `SSH_HOST` | 服务器地址，例如 `47.84.66.177` |
| `SSH_PORT` | SSH 端口，例如 `22` |
| `SSH_USER` | SSH 登录用户名，例如 `root` |
| `DEPLOY_SSH_KEY` | 部署专用的 SSH **私钥**（PEM 格式全文，包含 `-----BEGIN ... KEY-----` 首尾行） |

`DEPLOY_SSH_KEY` 对应的公钥需要提前加到服务器 `~/.ssh/authorized_keys`。建议单独生成一对部署专用密钥，
不要复用个人日常使用的 SSH 私钥。

## 首次部署前需要在服务器上确认

- `/www/wwwroot/attendance-app` 目录存在（工作流里 `mkdir -p` 会自动建，但站点/反向代理配置要指到这个路径）
- Web 服务器（Nginx/宝塔）静态站点根目录指向 `/www/wwwroot/attendance-app`
- 由于本应用是 SPA（React Router `HashRouter`，路由都在 `#/...` 之后），不需要额外的服务端路由回退规则
- 已注册 `sw.js`（PWA Service Worker）——如果排查线上更新不生效，先确认不是浏览器缓存了旧的 Service Worker

## 触发部署

```bash
git push origin main
```

或在 GitHub 仓库的 Actions 页面手动点击 "Run workflow"（对应 `workflow_dispatch`）。
