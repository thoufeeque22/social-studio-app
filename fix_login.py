with open("src/app/login/E2ELoginForm.tsx", "r") as f:
    content = f.read()

content = content.replace(
    'document.cookie = "e2e-bypass=true; path=/";',
    'document.cookie = `e2e-bypass=${encodeURIComponent(email)}; path=/`;'
)

with open("src/app/login/E2ELoginForm.tsx", "w") as f:
    f.write(content)

with open("src/proxy.ts", "r") as f:
    proxy_content = f.read()

proxy_content = proxy_content.replace(
    "if (process.env.E2E_TEST_MODE === 'true' && req.cookies.get('e2e-bypass')?.value === 'true') {",
    "if (process.env.E2E_TEST_MODE === 'true' && req.cookies.get('e2e-bypass')?.value) {"
)

with open("src/proxy.ts", "w") as f:
    f.write(proxy_content)
