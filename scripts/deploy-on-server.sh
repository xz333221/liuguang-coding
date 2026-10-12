#!/usr/bin/env bash
# 在服务器上跑这个脚本:拉代码 → 装依赖 → 构建站点 → 重启服务 → 健康检查。
#
#   APP_DIR=/opt/liuguang-coding SERVICE=liuguang-coding bash scripts/deploy-on-server.sh
#
# 前提:仓库已经 clone 到 APP_DIR,nginx 已把 coding.flowdash.cn 反代到 8787,
# systemd 单元已装好(见 deploy/liuguang-coding.service)。
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/liuguang-coding}"
BRANCH="${BRANCH:-main}"
SERVICE="${SERVICE:-liuguang-coding}"
HEALTH_PORT="${PORT:-8787}"

cd "$APP_DIR"

echo "==> 拉取 $BRANCH"
git fetch --prune origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

echo "==> 安装依赖"
npm ci

echo "==> 构建站点(把接口地址写进前端:同源 /api/chat 与 /api/ai-model)"
PUBLIC_CHAT_PROXY=/api/chat PUBLIC_MODEL_API=/api/ai-model npm run build

echo "==> 重启服务"
sudo systemctl restart "$SERVICE"
sleep 2
sudo systemctl --no-pager --full status "$SERVICE" | head -n 12 || true

echo "==> 健康检查"
curl -fsS "http://127.0.0.1:${HEALTH_PORT}/api/health" && echo
echo "==> 完成:coding.flowdash.cn 应已更新"
