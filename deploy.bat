@echo off
setlocal
cd /d "%~dp0"

set "WEB_DIR=.deploy\r7kb-web"

rem ---- token：优先 deploy.token 文件，其次 GITHUB_TOKEN 环境变量 ----
set "TOKEN="
if exist "deploy.token" set /p TOKEN=<deploy.token
if not defined TOKEN set "TOKEN=%GITHUB_TOKEN%"
if not defined TOKEN (
  echo [error] no token: put it in deploy.token
  exit /b 1
)

echo [1/5] build static site...
set "NEXT_DIST_DIR=.next-deploy"
call npm run build >nul 2>&1
if errorlevel 1 (
  echo [error] build failed
  exit /b 1
)

echo [2/5] commit main repo...
git add -A
git diff --cached --quiet
if errorlevel 1 git commit -q -m "build: update site"

echo [3/5] push main repo...
git push -q "https://x-access-token:%TOKEN%@github.com/LeoY2020/r7kb.git" main:main
if errorlevel 1 (
  echo [error] push main repo failed
  exit /b 1
)

if not exist "%WEB_DIR%\.git" (
  echo [4/5] clone web repo...
  git clone -q "https://github.com/LeoY2020/r7kb-web.git" "%WEB_DIR%"
  if errorlevel 1 (
    echo [error] clone web repo failed
    exit /b 1
  )
)

echo [4/5] sync static files...
rem 静态导出产物写在 NEXT_DIST_DIR（.next-deploy）下，而不是 out/
robocopy ".next-deploy" "%WEB_DIR%" /MIR /XD ".git" /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
  echo [error] copy failed
  exit /b 1
)
type nul > "%WEB_DIR%\.nojekyll"

pushd "%WEB_DIR%"
git add -A
git diff --cached --quiet
if errorlevel 1 git commit -q -m "build: publish static site"

echo [5/5] push web repo...
git push -q "https://x-access-token:%TOKEN%@github.com/LeoY2020/r7kb-web.git" main:main
set "RC=%errorlevel%"
popd
if not "%RC%"=="0" (
  echo [error] push web repo failed
  exit /b 1
)

echo done.
endlocal
