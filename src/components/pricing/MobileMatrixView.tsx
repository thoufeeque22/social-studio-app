'use client';
import React, { useState } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableRow, TableHead, IconButton, MenuItem, Select, FormControl } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { COMPARISON_CATEGORIES, PRICING_TIERS, PlanId } from '@/lib/core/product-data';

export const MobileMatrixView = () => {
  const [plan1, setPlan1] = useState<PlanId>('free-starter');
  const [plan2, setPlan2] = useState<PlanId>('free-hacker');
  
  // Initialize all categories as expanded by default
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    COMPARISON_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat.name]: true }), {})
  );

  const toggleCategory = (name: string) => {
    setExpanded(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const p1 = PRICING_TIERS.find(p => p.id === plan1);
  const p2 = PRICING_TIERS.find(p => p.id === plan2);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <FormControl fullWidth size="small">
          <Select value={plan1} onChange={(e) => setPlan1(e.target.value as PlanId)}>
            {PRICING_TIERS.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small">
          <Select value={plan2} onChange={(e) => setPlan2(e.target.value as PlanId)}>
            {PRICING_TIERS.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </Select>
        </FormControl>
      </Box>
      <Table size="small" sx={{ tableLayout: 'fixed' }}>
        <caption style={{ visibility: 'hidden', height: 0 }}>Compare Plans</caption>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '34%' }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Features</Typography></TableCell>
            <TableCell sx={{ width: '33%' }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{p1?.name}</Typography></TableCell>
            <TableCell sx={{ width: '33%' }}><Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{p2?.name}</Typography></TableCell>
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
                <TableCell colSpan={3} sx={{ py: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <IconButton size="small" sx={{ mr: 1 }}>
                      {expanded[category.name] ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                    </IconButton>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{category.name}</Typography>
                  </Box>
                </TableCell>
              </TableRow>
              
              {/* Feature Rows */}
              {expanded[category.name] && category.features.map(feature => (
                <TableRow key={feature.name}>
                  <TableCell sx={{ pr: 1 }}><Typography variant="body2" sx={{ fontWeight: 500, fontSize: '0.8rem' }}>{feature.name}</Typography></TableCell>
                  <TableCell sx={{ px: 1 }}><Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{feature.values[plan1] || '-'}</Typography></TableCell>
                  <TableCell sx={{ px: 1 }}><Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{feature.values[plan2] || '-'}</Typography></TableCell>
                </TableRow>
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
};
