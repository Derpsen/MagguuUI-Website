<!--
  Privacy Policy Page - Legal requirement for DE/EU (GDPR)
-->

<template>
  <article class="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-20">
    <p class="font-mono text-[11px] uppercase tracking-[0.16em] mb-3" :class="isDark ? 'text-brand-300' : 'text-brand-700'">GDPR</p>
    <h1 class="text-4xl font-semibold tracking-tight" :class="isDark ? 'text-white' : 'text-gray-950'">Privacy</h1>
    <div class="mt-8 space-y-8 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
      <section>
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">1. Privacy at a Glance</h2>
        <h3 class="mt-3 font-medium" :class="isDark ? 'text-silver-200' : 'text-gray-800'">General Information</h3>
        <p class="mt-1">The following information provides a simple overview of what happens to your personal data when you visit this website.</p>
        <h3 class="mt-3 font-medium" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Data Collection on This Website</h3>
        <p class="mt-1">Data processing on this website is carried out by the website operator. Contact details can be found in the <NuxtLink to="/imprint" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Imprint</NuxtLink>.</p>
      </section>

      <section class="border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">2. Hosting</h2>
        <p class="mt-3">
          This website is hosted on private servers. When visiting the website, the server
          automatically collects information in server log files that your browser transmits
          (IP address, browser type, operating system, referrer URL, time of access).
        </p>
      </section>

      <section class="border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">3. General Information and Mandatory Disclosures</h2>
        <h3 class="mt-3 font-medium" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Data Protection</h3>
        <p class="mt-1">The operator of this site takes the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations and this privacy policy.</p>
        <h3 class="mt-3 font-medium" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Responsible Party</h3>
        <p class="mt-1">The responsible party for data processing on this website can be found in the <NuxtLink to="/imprint" class="underline underline-offset-4" :class="isDark ? 'text-white' : 'text-gray-950'">Imprint</NuxtLink>.</p>
      </section>

      <section class="border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">4. Data Collection on This Website</h2>
        <h3 class="mt-3 font-medium" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Cookies</h3>
        <p class="mt-1">This website uses technically necessary cookies for the theme setting (Dark/Light Mode). No tracking cookies or third-party cookies are used.</p>
        <h3 class="mt-3 font-medium" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Server Log Files</h3>
        <p class="mt-1">The hosting provider automatically collects and stores information in server log files that your browser transmits:</p>
        <ul class="mt-2 list-disc pl-5 space-y-1">
          <li>Browser type and version</li>
          <li>Operating system</li>
          <li>Referrer URL</li>
          <li>IP address (anonymized)</li>
          <li>Time of server request</li>
        </ul>
        <h3 class="mt-3 font-medium" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Contact via Email</h3>
        <p class="mt-1">If you contact us via email, your information will be stored for the purpose of processing your inquiry. Your data will not be shared with third parties.</p>
      </section>

      <section class="border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">5. External Services</h2>
        <h3 class="mt-3 font-medium" :class="isDark ? 'text-silver-200' : 'text-gray-800'">Self-Hosted Fonts</h3>
        <p class="mt-1">
          This site uses self-hosted web fonts for font rendering.
          The required font files are served directly by this application, so no separate font request is sent from your browser to a third-party font provider when you open a page.
        </p>
      </section>

      <section class="border-t pt-8" :class="isDark ? 'border-white/10' : 'border-gray-200'">
        <h2 class="text-base font-semibold" :class="isDark ? 'text-white' : 'text-gray-950'">6. Your Rights</h2>
        <p class="mt-3">
          You have the right at any time to free information about your stored personal data,
          its origin and recipients, and the purpose of data processing, as well as the right
          to correction, blocking, or deletion of this data. For this purpose and for any further
          questions regarding data protection, you may contact us at any time.
        </p>
      </section>
    </div>
  </article>
</template>

<script setup lang="ts">
const isDark = useIsDark()

usePublicPageSeo({
  title: 'Privacy Policy',
  description: 'Privacy policy for MagguuUI in accordance with GDPR.',
  path: '/privacy',
  robots: 'noindex, follow',
})
</script>
