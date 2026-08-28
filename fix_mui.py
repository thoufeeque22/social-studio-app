with open("src/components/referral/RetroactiveCodeInput.tsx", "r") as f:
    content = f.read()

content = content.replace(
    "import { Box, TextField, Button, Alert, Typography, Stack, CircularProgress } from '@mui/material';",
    "import Box from '@mui/material/Box';\nimport TextField from '@mui/material/TextField';\nimport Button from '@mui/material/Button';\nimport Alert from '@mui/material/Alert';\nimport Typography from '@mui/material/Typography';\nimport Stack from '@mui/material/Stack';\nimport CircularProgress from '@mui/material/CircularProgress';"
)

with open("src/components/referral/RetroactiveCodeInput.tsx", "w") as f:
    f.write(content)
