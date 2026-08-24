import React from 'react';
import { Box, Typography } from '@mui/material';

export const PrivacyThirdParty = () => (
  <section>
    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>3. Use of Third-Party APIs</Typography>
    <Box sx={{ ml: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>Google / YouTube API Services Data Handling</Typography>
      <Typography variant="body1" gutterBottom>
        Our application uses Google API Services (specifically Google OpenID and YouTube APIs) for core authentication, user identity management, and to allow you to upload videos directly to your YouTube channel. By using this feature, you agree to be bound by the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>.
      </Typography>
      <Typography variant="body1" gutterBottom sx={{ mt: 2 }}>
        <strong>1. Data Access:</strong> We request access to your YouTube account solely to upload media files (videos) on your behalf and to read basic channel information necessary to confirm successful uploads.
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>2. Data Use:</strong> The raw and derived Google user data accessed by our application is used strictly to provide the core user-facing feature of publishing your scheduled content to your YouTube channel.
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>3. Data Transfer:</strong> We do not transfer or share your Google user data with any third parties, data brokers, or advertisers. Data is solely transmitted securely between your device, our servers, and Google APIs.
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>4. Data Protection:</strong> All Google user data, including OAuth tokens, is encrypted in transit using industry-standard TLS/SSL and encrypted at rest in our secure database.
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>5. Data Retention & Deletion:</strong> We retain your authentication tokens only as long as your account is active to facilitate scheduled publishing. Upon account deletion or disconnecting your YouTube account, all associated Google user data and tokens are immediately and permanently deleted from our systems.
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>6. Prohibited Data Use & Transfer:</strong> We expressly prohibit the use of your raw, aggregated, or anonymized Google user data for targeted advertising, lending purposes, or sale to third parties.
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>7. AI/ML Model Training Restrictions:</strong> Raw and aggregated Google user data is strictly prohibited from being used to develop, improve, or train any generalized Artificial Intelligence (AI) or Machine Learning (ML) models. We do not transfer Google user data to any third-party AI/ML services for model training purposes.
      </Typography>
      <Typography variant="body1" sx={{ fontStyle: 'italic', bgcolor: 'action.hover', p: 2, borderRadius: 1, borderLeft: '4px solid', borderColor: 'primary.main', mt: 2 }}>
        <strong>Google API Disclosure:</strong> The use of raw or derived user data received from Workspace APIs will adhere to the <a href="https://developers.google.com/terms/api-services-user-data-policy#limited-use-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements.
      </Typography>
    </Box>
    <Box sx={{ ml: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>TikTok API</Typography>
      <Typography variant="body1" gutterBottom>
        We use TikTok for Developers APIs to facilitate video posting and account management. We adhere to TikTok&apos;s Developer Terms.
      </Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Data Deletion:</strong> You can request the deletion of your TikTok data from our servers at any time by disconnecting your TikTok account in the Integrations settings. Alternatively, you may revoke our application&apos;s access directly from your TikTok account&apos;s security settings. When we receive a revocation or data deletion webhook from TikTok, we immediately and permanently delete all your associated TikTok account data and credentials from our systems.
      </Typography>
    </Box>
    <Box sx={{ ml: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>Meta (Facebook/Instagram) API</Typography>
      <Typography variant="body1" gutterBottom>
        We use Meta Graph APIs to publish content to your Facebook Pages and Instagram Business accounts.
      </Typography>
    </Box>
    <Box sx={{ ml: 2, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>AI Content Enhancement</Typography>
      <Typography variant="body1" gutterBottom>
        To provide AI-assisted content generation (e.g., generating descriptions and hashtags), we transmit relevant video metadata, audio, and visual frames to trusted AI providers (such as OpenAI, Google, Anthropic, or Groq). We will <strong>never</strong> process your video content using AI without your explicit, opt-in consent collected prior to your first upload. Your Personal Identifiable Information (PII) is strictly excluded from these prompts unless you explicitly include it in your content. We do not allow these providers to use our API data to train their models.
      </Typography>
    </Box>
    <Box sx={{ ml: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }} gutterBottom>Infrastructure, Payment & Telemetry</Typography>
      <Typography variant="body1" gutterBottom>
        We use <strong>Stripe</strong> for secure payment processing and do not store your full credit card details on our servers. For essential infrastructure, we use <strong>Upstash</strong> for rate-limiting and security, and <strong>Resend</strong> for transactional email delivery. We also use <strong>Sentry</strong> for error monitoring and diagnostics to ensure the stability of the Service. We use <strong>Umami Analytics</strong> for cookieless, anonymized website analytics (no PII is collected, and no tracking cookies are used).
      </Typography>
    </Box>
  </section>
);
