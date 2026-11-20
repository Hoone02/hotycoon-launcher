# 호타이쿤 런처 새 버전 배포
#   powershell -ExecutionPolicy Bypass -File release.ps1 1.0.1
# → package.json 버전을 올리고 커밋 + v태그를 push 한다.
#   GitHub Actions 가 설치 파일을 빌드해 릴리스로 올리고(약 5~10분),
#   이미 설치한 런처는 켜질 때(그리고 30분마다) 새 버전을 받아 설치한다.
param([Parameter(Mandatory = $true)][string]$Version)

$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
try {
    if ($Version -notmatch '^\d+\.\d+\.\d+$') { throw "버전은 1.2.3 형식으로 써 주세요." }
    npm version $Version --no-git-tag-version --allow-same-version | Out-Null
    git add -A
    git commit -m "런처 $Version"
    git tag "v$Version"
    git push origin HEAD
    git push origin "v$Version"
    Write-Host "v$Version 태그를 올렸어요. 빌드 진행: https://github.com/Hoone02/hotycoon-launcher/actions"
} finally { Pop-Location }
