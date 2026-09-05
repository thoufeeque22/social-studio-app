'use client';
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, IconButton, Box } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { COMPARISON_CATEGORIES, PRICING_TIERS } from '@/lib/core/product-data';

export const DesktopMatrixView = () => {
  // Initialize all categories as expanded by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    COMPARISON_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {})
  );

  const toggleCategory = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const colWidth = `${100 / (PRICING_TIERS.length + 1)}%`;

  return (
    <TableContainer component={Paper} elevation={0} variant="outlined">
      <Table stickyHeader sx={{ minWidth: 800, tableLayout: 'fixed' }}>
        <caption style={{ display: 'none' }}>Compare Plans</caption>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: colWidth, bgcolor: 'background.paper' }}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 'bold' }}>Features</Typography>
            </TableCell>
            {PRICING_TIERS.map(plan => (
              <TableCell key={plan.id} sx={{ width: colWidth, bgcolor: 'background.paper' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>{plan.name}</Typography>
                <Typography variant="body2" color="text.secondary">{plan.price}{'period' in plan ? plan.period : '/mo'}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {COMPARISON_CATEGORIES.map((category) => (
            <React.Fragment key={category.name}>
              {/* Category Header Row */}
              <TableRow 
                onClick={() => toggleCategory(category.name)}
                sx={{ '&:hover': { bgcolor: 'action.hover' }, cursor: 'pointer', bgcolor: 'background.default' }}
              >
                <TableCell colSpan={PRICING_TIERS.length + 1} sx={{ py: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" sx={{ mr: 1 }}>
                      {expanded[category.name] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{category.name}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
              
              {/* Feature Rows */}
              {expanded[category.name] && category.features.map(feature => (
                <TableRow key={feature.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{feature.name}</Typography>
                  </TableCell>
                  {PRICING_TIERS.map(plan => (
                    <TableCell key={plan.id}>
                      <Typography variant="body2">{feature.values[plan.id as keyof typeof feature.values] || '-'}</Typography>
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
