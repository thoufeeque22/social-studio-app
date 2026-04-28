import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const roadmapTasks = [
  { title: "Favicon added", description: "Ensure the site has a custom favicon (e.g. 32x32 icon) so it looks professional in browser tabs.", priority: "High Priority", order: 10 },
  { title: "Mobile responsive", description: "Verify all pages look great and function perfectly on mobile devices, especially the landing page.", priority: "High Priority", order: 11 },
  { title: "Open Graph tags set", description: "Add og:title, og:description, og:image, og:url to layout.tsx for rich link previews on social media.", priority: "High Priority", order: 12 },
  { title: "SSL certificate active (https)", description: "Ensure the production deployment strictly uses HTTPS for security and SEO.", priority: "High Priority", order: 13 },
  { title: "Download/CTA button working", description: "Check that the primary call-to-action buttons correctly navigate users to the sign-up or app store.", priority: "High Priority", order: 14 },
  { title: "Google Search Console connected", description: "Verify domain ownership to track search traffic and ensure pages are indexed.", priority: "Medium Priority", order: 15 },
  { title: "Bing Webmaster Tools connected", description: "Connect Bing to ensure visibility in Microsoft search engines.", priority: "Medium Priority", order: 16 },
  { title: "Sitemap submitted", description: "Generate a sitemap.xml and submit it to Search Console to help crawlers discover pages.", priority: "Medium Priority", order: 17 },
  { title: "IndexNow configured", description: "Set up IndexNow for instant indexing of new pages on Bing and Yandex.", priority: "Low Priority", order: 18 },
  { title: "Meta title and description set", description: "Ensure every public page has unique and SEO-optimized title and description meta tags.", priority: "High Priority", order: 19 },
  { title: "Robots.txt file in place", description: "Create a robots.txt file to guide search engine crawlers on what to index.", priority: "Medium Priority", order: 20 },
];

const launchTasks = [
  { title: "App title with keywords", description: "Include your primary keyword in the app title (e.g. Social Studio - Social Media Scheduler).", category: "App Store", order: 1 },
  { title: "Subtitle (don't leave empty)", description: "Write a compelling subtitle focusing on your app's main value proposition.", category: "App Store", order: 2 },
  { title: "App description", description: "The first 2 lines must hook the user before the 'Read More' button. Focus on the problem you solve.", category: "App Store", order: 3 },
  { title: "Keywords researched and added", description: "Use tools to find high-traffic, low-competition keywords for the 100-character keyword field.", category: "App Store", order: 4 },
  { title: "Screenshots", description: "Design beautiful screenshots that highlight benefits (e.g. 'Save 10 hours a week') rather than just showing UI features.", category: "App Store", order: 5 },
  { title: "App preview video (optional but helps)", description: "Create a short 15-30s video showing the app in action to increase conversion rates.", category: "App Store", order: 6 },
  { title: "Privacy policy URL", description: "Provide a working link to your privacy policy (required by Apple/Google).", category: "App Store", order: 7 },
  { title: "Support URL", description: "Provide a link to a support page or contact form so users can reach out for help.", category: "App Store", order: 8 },
  { title: "App category selected", description: "Choose the most relevant primary and secondary categories to maximize discoverability.", category: "App Store", order: 9 },
  { title: "Age rating completed", description: "Fill out the content rating questionnaire accurately to get the correct age rating.", category: "App Store", order: 10 },

  { title: "Launch post drafted", description: "Write an engaging launch announcement for Twitter, LinkedIn, and relevant subreddits.", category: "Marketing", order: 1 },
  { title: "Social media assets ready", description: "Prepare high-quality promotional images, GIFs, and captions for launch day.", category: "Marketing", order: 2 },
  { title: "Email list notified", description: "Draft and schedule an email to your waitlist or existing subscribers announcing the launch.", category: "Marketing", order: 3 },
  { title: "Product Hunt listing prepped (if using)", description: "Prepare your tagline, maker comment, thumbnail, and first comment for PH.", category: "Marketing", order: 4 },
  { title: "Friends/community ready to support", description: "Reach out to your network beforehand to ask for early support, feedback, and engagement.", category: "Marketing", order: 5 },

  { title: "Privacy policy written and linked", description: "Draft a legally compliant privacy policy and link it in the app and website footer.", category: "Legal", order: 1 },
  { title: "Terms of service written and linked", description: "Draft the terms and conditions for using your service and link it appropriately.", category: "Legal", order: 2 },
  { title: "Data handling documented", description: "Create internal documentation on how user data is stored, processed, and deleted.", category: "Legal", order: 3 },
  { title: "GDPR compliance (if applicable)", description: "Ensure user data can be exported or deleted upon request to comply with EU laws.", category: "Legal", order: 4 },
  { title: "Cookie notice (if website tracks)", description: "Add a cookie consent banner if you use tracking scripts like Google Analytics or Meta Pixel.", category: "Legal", order: 5 },
];

async function main() {
  console.log("Clearing old tasks...");
  await prisma.roadmapTask.deleteMany({});
  await prisma.launchTask.deleteMany({});

  console.log("Seeding roadmap technical tasks with descriptions...");
  for (const t of roadmapTasks) {
    await prisma.roadmapTask.create({
      data: {
        title: t.title,
        description: t.description,
        priority: t.priority,
        order: t.order,
        status: "pending"
      }
    });
  }

  console.log("Seeding launch marketing/legal tasks with descriptions...");
  for (const t of launchTasks) {
    await prisma.launchTask.create({
      data: {
        title: t.title,
        description: t.description,
        category: t.category,
        order: t.order,
        status: "pending"
      }
    });
  }
  
  console.log("Done seeding.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
