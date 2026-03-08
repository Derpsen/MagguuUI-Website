<!--
  Privacy Policy Page — Legal requirement for DE/EU (GDPR)
-->

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
    <div class="text-center mb-12 fade-in heading-glow">
      <h1 class="text-4xl sm:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
        <svg class="w-8 h-8 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
        </svg>
        <span class="text-gradient">Privacy</span>
      </h1>
      <p class="text-lg" :class="isDark ? 'text-silver-500' : 'text-gray-500'">
        How we handle your data
      </p>
    </div>

    <div class="space-y-4">
      <!-- 1. Privacy at a Glance -->
      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span class="text-gradient-subtle">1. Privacy at a Glance</span>
        </h2>
        <div class="space-y-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <div>
            <h3 class="font-medium mb-1" :class="isDark ? 'text-silver-300' : 'text-gray-700'">General Information</h3>
            <p>The following information provides a simple overview of what happens to your personal data when you visit this website.</p>
          </div>
          <div>
            <h3 class="font-medium mb-1" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Data Collection on This Website</h3>
            <p>Data processing on this website is carried out by the website operator. Contact details can be found in the <NuxtLink to="/imprint" class="text-brand-400 hover:underline">Imprint</NuxtLink>.</p>
          </div>
        </div>
      </div>

      <!-- 2. Hosting -->
      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
          </svg>
          <span class="text-gradient-subtle">2. Hosting</span>
        </h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          This website is hosted on private servers. When visiting the website, the server
          automatically collects information in server log files that your browser transmits
          (IP address, browser type, operating system, referrer URL, time of access).
        </p>
      </div>

      <!-- 3. General Information and Mandatory Disclosures -->
      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          <span class="text-gradient-subtle">3. General Information and Mandatory Disclosures</span>
        </h2>
        <div class="space-y-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <div>
            <h3 class="font-medium mb-1" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Data Protection</h3>
            <p>The operator of this site takes the protection of your personal data very seriously. We treat your personal data confidentially and in accordance with the statutory data protection regulations and this privacy policy.</p>
          </div>
          <div>
            <h3 class="font-medium mb-1" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Responsible Party</h3>
            <p>The responsible party for data processing on this website can be found in the <NuxtLink to="/imprint" class="text-brand-400 hover:underline">Imprint</NuxtLink>.</p>
          </div>
        </div>
      </div>

      <!-- 4. Data Collection on This Website -->
      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
          </svg>
          <span class="text-gradient-subtle">4. Data Collection on This Website</span>
        </h2>
        <div class="space-y-3 text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <div>
            <h3 class="font-medium mb-1" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Cookies</h3>
            <p>This website uses technically necessary cookies for the theme setting (Dark/Light Mode). No tracking cookies or third-party cookies are used.</p>
          </div>
          <div>
            <h3 class="font-medium mb-1" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Server Log Files</h3>
            <p>The hosting provider automatically collects and stores information in server log files that your browser transmits:</p>
            <ul class="mt-2 space-y-1 ml-4">
              <li class="flex items-start gap-2">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                Browser type and version
              </li>
              <li class="flex items-start gap-2">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                Operating system
              </li>
              <li class="flex items-start gap-2">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                Referrer URL
              </li>
              <li class="flex items-start gap-2">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                IP address (anonymized)
              </li>
              <li class="flex items-start gap-2">
                <span class="inline-block w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 flex-shrink-0" />
                Time of server request
              </li>
            </ul>
          </div>
          <div>
            <h3 class="font-medium mb-1" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Contact via Email</h3>
            <p>If you contact us via email, your information will be stored for the purpose of processing your inquiry. Your data will not be shared with third parties.</p>
          </div>
        </div>
      </div>

      <!-- 5. External Services -->
      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.04a4.5 4.5 0 00-1.242-7.244l-4.5-4.5a4.5 4.5 0 00-6.364 6.364L4.757 8.56" />
          </svg>
          <span class="text-gradient-subtle">5. External Services</span>
        </h2>
        <div class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          <h3 class="font-medium mb-1" :class="isDark ? 'text-silver-300' : 'text-gray-700'">Google Fonts</h3>
          <p>
            This site uses Google Fonts for font rendering.
            When you access a page, your browser loads the required fonts directly from Google servers.
            Your IP address is transmitted to Google in the process.
            More information: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" class="text-brand-400 hover:underline">Google Privacy Policy</a>.
          </p>
        </div>
      </div>

      <!-- 6. Your Rights -->
      <div :ref="el => observe(el as HTMLElement)" class="glass-card rounded-2xl p-6 sm:p-8">
        <h2 class="text-lg font-semibold mb-3 flex items-center gap-2.5">
          <svg class="w-5 h-5 text-brand-400 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
          <span class="text-gradient-subtle">6. Your Rights</span>
        </h2>
        <p class="text-sm leading-relaxed" :class="isDark ? 'text-silver-400' : 'text-gray-600'">
          You have the right at any time to free information about your stored personal data,
          its origin and recipients, and the purpose of data processing, as well as the right
          to correction, blocking, or deletion of this data. For this purpose and for any further
          questions regarding data protection, you may contact us at any time.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const isDark = useIsDark()
const { observe } = useScrollReveal()

useSeoMeta({
  title: 'Privacy Policy — MagguuUI',
  description: 'Privacy policy for MagguuUI in accordance with GDPR.',
  ogTitle: 'Privacy Policy — MagguuUI',
})
</script>
