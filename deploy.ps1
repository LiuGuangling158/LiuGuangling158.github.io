# 一键推送到 GitHub并触发 Pages 部署
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host ">>> 推送到 origin/main ..." -ForegroundColor Cyan
git push -u origin main

Write-Host ""
Write-Host ">>> 推送成功！" -ForegroundColor Green
Write-Host @"

下一步（仅首次需要）：
1. 打开 https://github.com/liuguangling158/liuguangling158.github.io/settings/pages
2. Build and deployment → Source 选择 「GitHub Actions」
3. 打开 https://github.com/liuguangling158/liuguangling158.github.io/actions 查看构建进度
4. 约 1–3 分钟后访问 https://liuguangling158.github.io

"@ -ForegroundColor Yellow
