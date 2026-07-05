# 时光记录

这是一个基于静态站点的时光记录应用，支持浏览器本地存储、搜索、导入导出、倒计时和主题切换。

## 在线存储和用户登录

应用已支持 Firebase Authentication + Realtime Database（云端存储）功能。

1. 在 Firebase 控制台创建项目。
2. 进入“认证”开启邮箱/密码登录。
3. 进入“数据库”，创建 Realtime Database 并设为可读写（生产环境需调整规则）。
4. 将实际配置填入 `firebase-config.json`。你可以复制 `firebase-config.sample.json` 并替换其中的值。

如果未提供 Firebase 配置，应用会退回到本地存储和本地账号登录模式。

## 部署到 GitHub Pages

仓库已启用 GitHub Pages，根目录作为发布源。修改并提交后，页面会自动重新部署。可访问：

https://744019398.github.io/timecapsule-site/
