import React from 'react';
import { Box, Typography, Stack, Link } from '@mui/material';

import { CONTACT_EMAILS } from '@/lib/core/emails';
import { BRAND } from '@/lib/core/brand';
import { PrivacyThirdParty } from './PrivacyThirdParty';

export const PrivacyContent = () => (
  <Stack spacing={4} sx={{ mt: 4 }}>
    <section>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>1. Introduction</Typography>
      <Typography variant="body1" gutterBottom>
        {BRAND.name} (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share information when you use our web and mobile applications (the &quot;Service&quot;).
      </Typography>
      <Typography variant="body1" gutterBottom>
        {BRAND.name} is operated by {BRAND.legal.owner}.
      </Typography>
    </section>

    <section>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>2. Data We Collect</Typography>
      <Typography variant="body1" gutterBottom>
        We collect information that you provide directly to us, such as when you create an account, connect social media profiles, or upload content. This may include:
      </Typography>
      <ul>
        <li><Typography variant="body1">Name and email address.</Typography></li>
        <li><Typography variant="body1">Profile information (e.g., avatar).</Typography></li>
        <li><Typography variant="body1">Billing information (processed securely by our payment provider, Stripe).</Typography></li>
        <li><Typography variant="body1">Social media account identifiers and authentication tokens (OAuth).</Typography></li>
        <li><Typography variant="body1">Content you upload (e.g., videos, titles, descriptions).</Typography></li>
        <li><Typography variant="body1">External platform usage (e.g., &quot;Which platforms do you use to post your videos?&quot;) to inform product prioritization and feature development.</Typography></li>
        <li><Typography variant="body1">Diagnostic data (e.g., IP addresses, crash logs, and device info used strictly for error tracking via Sentry).</Typography></li>
      </ul>
    </section>

    <PrivacyThirdParty />

    <section>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>4. Data Retention and Deletion</Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Right to be Forgotten:</strong> You may request the deletion of your account and all associated data by emailing us at{' '}
        <Link href={`mailto:${CONTACT_EMAILS.privacy}`}>{CONTACT_EMAILS.privacy}</Link>
        {' '}or by using the &quot;Delete Account&quot; feature in your settings.
      </Typography>
      <Typography variant="body1" gutterBottom>
        When you initiate an account deletion, our system immediately and permanently deletes all of your associated relational database records, authentication credentials, and uploaded media assets from our cloud storage. We do not use soft-deletes or retain your core data after an explicit deletion request.
      </Typography>
    </section>

    <section>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>5. Data Portability</Typography>
      <Typography variant="body1" gutterBottom>
        <strong>Right to Data Portability:</strong> In accordance with GDPR/CCPA compliance, you have the right to request a copy of your data in a structured, commonly used, and machine-readable format.
      </Typography>
      <Typography variant="body1" gutterBottom>
        You can easily export your profile information, posts, templates, and connected destination settings by using the &quot;Export Data&quot; feature in the Privacy tab of your Account Settings. Upon request, we will process your data and deliver a secure, time-limited download link to your registered email address.
      </Typography>
    </section>

    <section>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>6. Contact Us</Typography>
      <Typography variant="body1">If you have any questions, please contact us at:</Typography>
      <Typography variant="body1">
        Email:{' '}
        <Link href={`mailto:${CONTACT_EMAILS.privacy}`} sx={{ fontWeight: 700 }}>
          {CONTACT_EMAILS.privacy}
        </Link>
      </Typography>
    </section>
  </Stack>
);
