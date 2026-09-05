'use client';
import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, useMediaQuery, useTheme } from '@mui/material';
import { DesktopMatrixView } from './DesktopMatrixView';
import { MobileMatrixView } from './MobileMatrixView';

export const ComparisonMatrix = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <Box id="compare" sx={{ py: 8, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider' }}>
      <Container maxWidth="lg">
        <Typography variant="h3" align="center" sx={{ fontWeight: 800, mb: 6 }}>
          Comparison Matrix
        </Typography>
        {mounted && (isMobile ? <MobileMatrixView /> : <DesktopMatrixView />)}
      </Container>
    </Box>
  );
};
