"use client";

import React, { useEffect, useState } from "react";
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  CircularProgress, 
  Alert,
  Paper,
  useTheme
} from "@mui/material";
import { LineChart, BarChart } from "@mui/x-charts";
import { Heading } from "@/components/ui/Heading";

interface Metric {
  id: string;
  name: string;
  value: number;
  timestamp: string;
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const theme = useTheme();

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const response = await fetch("/api/admin/analytics");
        if (!response.ok) {
          if (response.status === 401) throw new Error("Unauthorized access - Admin role required");
          throw new Error("Failed to fetch analytics data");
        }
        const data = await response.json();
        setMetrics(data.metrics || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error" data-testid="analytics-error">{error}</Alert>
      </Container>
    );
  }

  // Data Processing
  const dates = Array.from(new Set(metrics.map(m => m.timestamp.split('T')[0]))).sort();
  
  const featureNames = [
    "feature:usage:ai_chatbot",
    "feature:usage:calendar",
    "feature:usage:snippets",
    "feature:usage:global_search",
    "feature:usage:media_picker",
    "feature:usage:manual_mode",
  ];

  const featureLabels: Record<string, string> = {
    "feature:usage:ai_chatbot": "AI Chatbot",
    "feature:usage:calendar": "Calendar",
    "feature:usage:snippets": "Snippets",
    "feature:usage:global_search": "Search",
    "feature:usage:media_picker": "Media Picker",
    "feature:usage:manual_mode": "Manual Mode",
  };

  const featureSeries = featureNames.map(name => ({
    label: featureLabels[name] || name,
    data: dates.map(date => {
      const metric = metrics.find(m => m.name === name && m.timestamp.split('T')[0] === date);
      return metric ? metric.value : 0;
    }),
    curve: "linear" as const,
  }));

  const platformNames = ["youtube", "instagram", "tiktok"];
  const platformHealthData = platformNames.map(platform => {
    const success = metrics
      .filter(m => m.name === `platform:success:${platform}`)
      .reduce((sum, m) => sum + m.value, 0);
    const errorCount = metrics
      .filter(m => m.name === `platform:error:${platform}`)
      .reduce((sum, m) => sum + m.value, 0);
    return { platform: platform.charAt(0).toUpperCase() + platform.slice(1), success, error: errorCount };
  });

  return (
    <Container maxWidth="xl" sx={{ py: 4 }} data-testid="admin-analytics-dashboard">
      <Box sx={{ mb: 4 }}>
        <Heading level={1}>Developer Analytics</Heading>
        <Typography variant="body1" color="text.secondary">
          Monitor system health, feature adoption, and platform performance
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Feature Adoption Chart */}
        <Grid sx={{ width: { xs: '100%', md: '66.66%' } }}>
          <Paper elevation={3} sx={{ bgcolor: 'white', borderRadius: 2 }}>
            <Box sx={{ p: 3 }} data-testid="feature-adoption-chart">
              <Typography variant="h6" gutterBottom sx={{ color: "primary.main", fontWeight: "bold" }}>
                Feature Adoption Trends
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                Daily usage metrics for core application features.
              </Typography>
              {dates.length > 0 ? (
                <Box sx={{ height: 400 }}>
                  <LineChart
                    xAxis={[{ 
                      scaleType: 'point', 
                      data: dates,
                      valueFormatter: (value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }
                    }]}
                    series={featureSeries.map(s => ({
                      data: s.data,
                      label: s.label,
                      showMark: true,
                      curve: "linear" as const,
                    }))}
                    height={350}
                    margin={{ top: 20, right: 30, bottom: 50, left: 50 }}
                  />
                </Box>
              ) : (
                <Box sx={{ height: 400, display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <Typography color="text.secondary">No historical data available yet</Typography>
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Platform Health Chart */}
        <Grid sx={{ width: { xs: '100%', md: '33.33%' } }}>
          <Paper elevation={3} sx={{ bgcolor: 'white', borderRadius: 2 }} data-testid="platform-health-chart">
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: "primary.main", fontWeight: "bold" }}>
                Platform Distribution Health
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3 }}>
                Success vs. failure rates across social platforms.
              </Typography>
              <Box sx={{ height: 400 }}>
                <BarChart
                  xAxis={[{ 
                    scaleType: 'band', 
                    data: platformHealthData.map(d => d.platform) 
                  }]}
                  series={[
                    { data: platformHealthData.map(d => d.success), label: 'Success', color: theme.palette.success.main },
                    { data: platformHealthData.map(d => d.error), label: 'Error', color: theme.palette.error.main },
                  ]}
                  height={350}
                  margin={{ top: 20, right: 10, bottom: 50, left: 50 }}
                />
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Summary Metrics */}
        <Grid sx={{ width: '100%' }}>
          <Grid container spacing={2}>
            {[
              { label: 'Total AI Requests', value: metrics.filter(m => m.name === 'feature:usage:ai_chatbot').reduce((s, m) => s + m.value, 0) },
              { label: 'Total Scheduled Posts', value: metrics.filter(m => m.name === 'feature:usage:calendar').reduce((s, m) => s + m.value, 0) },
              { label: 'API Consumption (Google)', value: metrics.filter(m => m.name === 'api:consumption:google').reduce((s, m) => s + m.value, 0) },
              { label: 'Sentry Events', value: metrics.filter(m => m.name === 'api:consumption:sentry').reduce((s, m) => s + m.value, 0) },
            ].map((item, idx) => (
              <Grid sx={{ width: { xs: '100%', sm: '50%', md: '25%' } }} key={idx}>
                <Paper elevation={0} sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  border: '1px solid', 
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  textAlign: 'center'
                }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: "bold", textTransform: 'uppercase' }}>
                    {item.label}
                  </Typography>
                  <Typography variant="h4" color="primary" sx={{ fontWeight: "bold" }}>
                    {item.value.toLocaleString()}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Container>
  );
}
